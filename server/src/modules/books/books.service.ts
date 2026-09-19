import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound } from '../../lib/errors';
import { logActivity } from '../activity/activity.service';
import { serializeBook, type BookDTO } from './books.serializer';
import { releaseExpiredHolds } from '../loans/holds.service';

export interface ListBooksQuery {
  q?: string;
  genre?: string;
  availability?: 'all' | 'available' | 'borrowed';
  sort?: 'title' | 'author' | 'genre' | 'id' | 'recent';
  page: number;
  pageSize: number;
}

const ORDER_BY: Record<NonNullable<ListBooksQuery['sort']>, Prisma.BookOrderByWithRelationInput> = {
  title: { title: 'asc' },
  author: { author: 'asc' },
  genre: { genre: 'asc' },
  id: { id: 'asc' }, // the original catalog printed in-order by ID
  recent: { createdAt: 'desc' },
};

/**
 * SQLite's LIKE is case-insensitive for ASCII, so `contains` already behaves
 * like a case-insensitive search here. Prisma's `mode: 'insensitive'` is not
 * supported by the SQLite connector, so it is deliberately not used.
 */
function searchFilter(q: string): Prisma.BookWhereInput {
  return {
    OR: [
      { id: { contains: q } },
      { title: { contains: q } },
      { author: { contains: q } },
      { genre: { contains: q } },
    ],
  };
}

export async function listBooks(query: ListBooksQuery, viewerId?: string | null) {
  await releaseExpiredHolds();

  const where: Prisma.BookWhereInput = {};
  if (query.q) Object.assign(where, searchFilter(query.q));
  if (query.genre) where.genre = query.genre;

  const books = await prisma.book.findMany({
    where,
    orderBy: ORDER_BY[query.sort ?? 'title'],
  });

  const ids = books.map((b) => b.id);
  const [loans, waitlist] = await Promise.all([
    prisma.loan.findMany({
      where: { bookId: { in: ids }, returnedAt: null },
      include: { user: { select: { id: true, username: true } } },
    }),
    prisma.waitlistEntry.findMany({
      where: { bookId: { in: ids }, status: { in: ['WAITING', 'HOLD'] } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const loanByBook = new Map(loans.map((loan) => [loan.bookId, loan]));
  const waitlistByBook = new Map<string, typeof waitlist>();
  for (const entry of waitlist) {
    const list = waitlistByBook.get(entry.bookId) ?? [];
    list.push(entry);
    waitlistByBook.set(entry.bookId, list);
  }

  let items: BookDTO[] = books.map((book) =>
    serializeBook(book, {
      activeLoan: loanByBook.get(book.id) ?? null,
      waitlist: waitlistByBook.get(book.id) ?? [],
      viewerId,
    }),
  );

  // Availability is derived (hold vs loan vs free), so it is filtered after
  // serialization rather than in SQL.
  if (query.availability === 'available') items = items.filter((b) => b.status === 'AVAILABLE');
  if (query.availability === 'borrowed') items = items.filter((b) => b.status !== 'AVAILABLE');

  const total = items.length;
  const start = (query.page - 1) * query.pageSize;

  return {
    items: items.slice(start, start + query.pageSize),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getBook(id: string, viewerId?: string | null): Promise<BookDTO> {
  await releaseExpiredHolds(id);

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw notFound(`No book with ID "${id}".`);

  const [activeLoan, waitlist] = await Promise.all([
    prisma.loan.findFirst({
      where: { bookId: id, returnedAt: null },
      include: { user: { select: { id: true, username: true } } },
    }),
    prisma.waitlistEntry.findMany({
      where: { bookId: id, status: { in: ['WAITING', 'HOLD'] } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return serializeBook(book, { activeLoan, waitlist, viewerId });
}

export async function listGenres(): Promise<string[]> {
  const rows = await prisma.book.findMany({
    distinct: ['genre'],
    select: { genre: true },
    orderBy: { genre: 'asc' },
  });
  return rows.map((r) => r.genre).filter(Boolean);
}

/**
 * Ported from suggestBooksByGenre() (C++ lines 1321-1342), which listed every
 * other book sharing the borrowed book's genre. Available copies are shown
 * first here so the suggestion is actionable.
 */
export async function suggestByGenre(bookId: string, limit = 6): Promise<BookDTO[]> {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw notFound(`No book with ID "${bookId}".`);

  const candidates = await prisma.book.findMany({
    where: { genre: book.genre, id: { not: book.id } },
    orderBy: [{ available: 'desc' }, { title: 'asc' }],
    take: limit,
  });

  return candidates.map((candidate) => serializeBook(candidate));
}

export interface CreateBookInput {
  id: string;
  title: string;
  author: string;
  genre: string;
}

export async function createBook(input: CreateBookInput, actorUsername: string): Promise<BookDTO> {
  const existing = await prisma.book.findUnique({ where: { id: input.id } });
  if (existing) {
    // Matches "Book with the same ID already exists." (C++ line 1112)
    throw conflict(`A book with ID "${input.id}" already exists.`, { id: 'Already in use.' });
  }

  const book = await prisma.$transaction(async (tx) => {
    const created = await tx.book.create({ data: { ...input, available: true } });
    await logActivity(tx, {
      action: 'BOOK_ADDED',
      username: actorUsername,
      bookId: created.id,
      bookTitle: created.title,
      genre: created.genre,
    });
    return created;
  });

  return serializeBook(book);
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  genre?: string;
}

/**
 * The original offered seven fixed combinations of title/author/genre
 * (C++ lines 1215-1252). A partial update covers all seven. The book ID was
 * not editable there and is not editable here.
 */
export async function updateBook(
  id: string,
  input: UpdateBookInput,
  actorUsername: string,
): Promise<BookDTO> {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw notFound(`No book with ID "${id}".`);

  const changed: string[] = [];
  if (input.title !== undefined && input.title !== book.title) changed.push('title');
  if (input.author !== undefined && input.author !== book.author) changed.push('author');
  if (input.genre !== undefined && input.genre !== book.genre) changed.push('genre');

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.book.update({ where: { id }, data: input });
    if (changed.length > 0) {
      await logActivity(tx, {
        action: 'BOOK_UPDATED',
        username: actorUsername,
        bookId: next.id,
        bookTitle: next.title,
        genre: next.genre,
        detail: `Updated ${changed.join(', ')}`,
      });
    }
    return next;
  });

  return getBook(updated.id);
}

/**
 * The original deleted a book regardless of whether someone was holding it.
 * Refusing that is a deliberate change: deleting a book on loan would silently
 * erase the loan record and the borrower's history.
 */
export async function deleteBook(id: string, actorUsername: string) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw notFound(`No book with ID "${id}".`);

  const activeLoan = await prisma.loan.findFirst({ where: { bookId: id, returnedAt: null } });
  if (activeLoan) {
    throw conflict('This book is on loan. It has to be returned before it can be removed.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.waitlistEntry.updateMany({
      where: { bookId: id, status: { in: ['WAITING', 'HOLD'] } },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    });
    await logActivity(tx, {
      action: 'BOOK_DELETED',
      username: actorUsername,
      bookId: null,
      bookTitle: book.title,
      genre: book.genre,
      detail: `Book ID ${book.id}`,
    });
    await tx.book.delete({ where: { id } });
  });

  return { id: book.id, title: book.title };
}
