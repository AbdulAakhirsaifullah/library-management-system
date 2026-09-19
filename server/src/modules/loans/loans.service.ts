import { prisma } from '../../lib/prisma';
import { env } from '../../env';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { logActivity } from '../activity/activity.service';
import { getBook, suggestByGenre } from '../books/books.service';
import type { BookDTO } from '../books/books.serializer';
import { promoteNextInQueue, releaseExpiredHolds } from './holds.service';

export interface Actor {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
}

function dueDate(from = new Date()): Date {
  return new Date(from.getTime() + env.LOAN_DAYS * 24 * 60 * 60 * 1000);
}

async function resolveTarget(actor: Actor, targetUserId?: string) {
  if (!targetUserId || targetUserId === actor.id) {
    return { id: actor.id, username: actor.username };
  }
  // Only staff can act for someone else. The original admin menu borrowed and
  // returned under the admin's own name; here it is attributed properly.
  if (actor.role !== 'ADMIN') throw forbidden('You can only borrow and return for yourself.');

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true },
  });
  if (!user) throw notFound('That member does not exist.');
  return user;
}

export type BorrowOutcome = 'BORROWED' | 'WAITLISTED' | 'ALREADY_WAITING';

export interface BorrowResult {
  outcome: BorrowOutcome;
  book: BookDTO;
  waitlistPosition: number | null;
  suggestions: BookDTO[];
  message: string;
}

/**
 * Ported from borrow_book_by_id() (C++ lines 849-879):
 *   available        -> borrow it and suggest more books in the same genre
 *   already borrowed -> join the waiting list for that book
 *   unknown ID       -> error
 *
 * Added on top: an existing hold can only be collected by the person it is
 * held for, and a borrow that fails no longer writes a "Borrowed book" line to
 * the activity log (a bug in the original, C++ lines 1376-1380).
 */
export async function borrowBook(
  bookId: string,
  actor: Actor,
  targetUserId?: string,
): Promise<BorrowResult> {
  const target = await resolveTarget(actor, targetUserId);
  await releaseExpiredHolds(bookId);

  const outcome = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findUnique({ where: { id: bookId } });
    if (!book) throw notFound(`No book with ID "${bookId}".`);

    const existingLoan = await tx.loan.findFirst({
      where: { bookId, userId: target.id, returnedAt: null },
    });
    if (existingLoan) throw conflict(`"${book.title}" is already on loan to ${target.username}.`);

    const holdIsLive = Boolean(book.holdExpiresAt && book.holdExpiresAt.getTime() > Date.now());
    const heldForTarget = holdIsLive && book.heldForUserId === target.id;
    const canBorrow = book.available || heldForTarget;

    if (!canBorrow) {
      // Unavailable: join the queue, exactly as the original did.
      const existingEntry = await tx.waitlistEntry.findFirst({
        where: { bookId, userId: target.id, status: { in: ['WAITING', 'HOLD'] } },
      });
      if (existingEntry) {
        return { kind: 'ALREADY_WAITING' as const, title: book.title, genre: book.genre };
      }

      await tx.waitlistEntry.create({ data: { bookId, userId: target.id, status: 'WAITING' } });
      await logActivity(tx, {
        action: 'WAITLIST_JOIN',
        username: target.username,
        userId: target.id,
        bookId,
        bookTitle: book.title,
        genre: book.genre,
        actorUsername: actor.id === target.id ? null : actor.username,
      });
      return { kind: 'WAITLISTED' as const, title: book.title, genre: book.genre };
    }

    if (env.MAX_ACTIVE_LOANS > 0) {
      const active = await tx.loan.count({ where: { userId: target.id, returnedAt: null } });
      if (active >= env.MAX_ACTIVE_LOANS) {
        throw conflict(
          `${target.username} already has ${active} books out. The limit is ${env.MAX_ACTIVE_LOANS}.`,
        );
      }
    }

    const now = new Date();
    await tx.loan.create({
      data: {
        bookId,
        userId: target.id,
        borrowedAt: now,
        dueAt: dueDate(now),
        actedByUserId: actor.id === target.id ? null : actor.id,
      },
    });

    await tx.book.update({
      where: { id: bookId },
      data: { available: false, heldForUserId: null, holdExpiresAt: null },
    });

    // Collecting a hold, or borrowing while queued, closes out the queue entry.
    await tx.waitlistEntry.updateMany({
      where: { bookId, userId: target.id, status: { in: ['WAITING', 'HOLD'] } },
      data: { status: 'FULFILLED', resolvedAt: now },
    });

    await logActivity(tx, {
      action: 'BORROW',
      username: target.username,
      userId: target.id,
      bookId,
      bookTitle: book.title,
      genre: book.genre,
      actorUsername: actor.id === target.id ? null : actor.username,
    });

    return { kind: 'BORROWED' as const, title: book.title, genre: book.genre };
  });

  const [book, suggestions] = await Promise.all([
    getBook(bookId, actor.id),
    outcome.kind === 'BORROWED' ? suggestByGenre(bookId) : Promise.resolve([]),
  ]);

  const position = book.viewer?.waitlistPosition ?? null;

  const messages: Record<typeof outcome.kind, string> = {
    BORROWED: `"${outcome.title}" is checked out to ${target.username}. Due back in ${env.LOAN_DAYS} days.`,
    WAITLISTED: `"${outcome.title}" is out. ${target.username} joined the waiting list${
      position ? ` at position ${position}` : ''
    }.`,
    ALREADY_WAITING: `${target.username} is already on the waiting list for "${outcome.title}".`,
  };

  return {
    outcome: outcome.kind,
    book,
    waitlistPosition: position,
    suggestions,
    message: messages[outcome.kind],
  };
}

export interface ReturnResult {
  book: BookDTO;
  message: string;
  nextInLine: { username: string; expiresAt: string } | null;
}

/**
 * Ported from Return_Book_By_User() (C++ lines 920-948) and its admin twin
 * return_book() (lines 897-918). The ownership rule is preserved for members;
 * staff may return on anyone's behalf. Unlike the original, the admin path
 * also clears the borrower properly instead of leaving a stale owner behind.
 */
export async function returnBook(
  bookId: string,
  actor: Actor,
  targetUserId?: string,
): Promise<ReturnResult> {
  const result = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findUnique({ where: { id: bookId } });
    if (!book) throw notFound(`No book with ID "${bookId}".`);

    const loan = await tx.loan.findFirst({
      where: { bookId, returnedAt: null, ...(targetUserId ? { userId: targetUserId } : {}) },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!loan) throw badRequest(`"${book.title}" is not currently on loan.`);

    if (actor.role !== 'ADMIN' && loan.userId !== actor.id) {
      // Preserves the original message from C++ line 937.
      throw forbidden('You cannot return a book you did not borrow.');
    }

    const now = new Date();
    await tx.loan.update({
      where: { id: loan.id },
      data: {
        returnedAt: now,
        returnedByAdmin: actor.role === 'ADMIN' && actor.id !== loan.userId,
        actedByUserId: actor.id !== loan.userId ? actor.id : loan.actedByUserId,
      },
    });

    await tx.book.update({
      where: { id: bookId },
      data: { available: true, heldForUserId: null, holdExpiresAt: null },
    });

    await logActivity(tx, {
      action: 'RETURN',
      username: loan.user.username,
      userId: loan.userId,
      bookId,
      bookTitle: book.title,
      genre: book.genre,
      actorUsername: actor.id === loan.userId ? null : actor.username,
    });

    const next = await promoteNextInQueue(tx, bookId);
    return { title: book.title, borrower: loan.user.username, next };
  });

  const book = await getBook(bookId, actor.id);

  return {
    book,
    nextInLine: result.next
      ? { username: result.next.username, expiresAt: result.next.expiresAt.toISOString() }
      : null,
    message: result.next
      ? `"${result.title}" returned. It is now held for ${result.next.username} for ${env.HOLD_HOURS} hours.`
      : `"${result.title}" returned and back on the shelf.`,
  };
}

export interface ListLoansQuery {
  userId?: string;
  status?: 'active' | 'returned' | 'all';
  page: number;
  pageSize: number;
}

export async function listLoans(query: ListLoansQuery) {
  const where = {
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.status === 'active' ? { returnedAt: null } : {}),
    ...(query.status === 'returned' ? { NOT: { returnedAt: null } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.loan.count({ where }),
    prisma.loan.findMany({
      where,
      orderBy: [{ returnedAt: 'asc' }, { borrowedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        book: { select: { id: true, title: true, author: true, genre: true } },
        user: { select: { id: true, username: true } },
        actedBy: { select: { id: true, username: true } },
      },
    }),
  ]);

  const now = Date.now();

  return {
    items: rows.map((loan) => ({
      id: loan.id,
      book: loan.book,
      user: loan.user,
      borrowedAt: loan.borrowedAt.toISOString(),
      dueAt: loan.dueAt ? loan.dueAt.toISOString() : null,
      returnedAt: loan.returnedAt ? loan.returnedAt.toISOString() : null,
      isOverdue: Boolean(!loan.returnedAt && loan.dueAt && loan.dueAt.getTime() < now),
      handledBy: loan.actedBy ? loan.actedBy.username : null,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
