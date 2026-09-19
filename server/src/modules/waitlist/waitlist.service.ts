import { prisma } from '../../lib/prisma';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { logActivity } from '../activity/activity.service';
import { promoteNextInQueue, releaseExpiredHolds } from '../loans/holds.service';
import type { Actor } from '../loans/loans.service';

/**
 * Replaces the WaitingList queue (C++ lines 565-708). Every book now has its
 * own queue, ordered by join time, instead of one shared waiting_list.txt that
 * gave every book the same list on restart.
 */
export async function joinWaitlist(bookId: string, actor: Actor) {
  await releaseExpiredHolds(bookId);

  return prisma.$transaction(async (tx) => {
    const book = await tx.book.findUnique({ where: { id: bookId } });
    if (!book) throw notFound(`No book with ID "${bookId}".`);

    if (book.available) {
      throw badRequest(`"${book.title}" is on the shelf right now. Borrow it instead.`);
    }

    const activeLoan = await tx.loan.findFirst({
      where: { bookId, userId: actor.id, returnedAt: null },
    });
    if (activeLoan) throw conflict('You already have this book.');

    const existing = await tx.waitlistEntry.findFirst({
      where: { bookId, userId: actor.id, status: { in: ['WAITING', 'HOLD'] } },
    });
    if (existing) throw conflict("You're already on the waiting list for this book.");

    await tx.waitlistEntry.create({ data: { bookId, userId: actor.id, status: 'WAITING' } });

    await logActivity(tx, {
      action: 'WAITLIST_JOIN',
      username: actor.username,
      userId: actor.id,
      bookId,
      bookTitle: book.title,
      genre: book.genre,
    });

    const ahead = await tx.waitlistEntry.count({ where: { bookId, status: 'WAITING' } });
    return { position: ahead, bookTitle: book.title };
  });
}

export async function leaveWaitlist(bookId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.waitlistEntry.findFirst({
      where: { bookId, userId: actor.id, status: { in: ['WAITING', 'HOLD'] } },
      include: { book: { select: { title: true, genre: true } } },
    });
    if (!entry) throw notFound("You're not on the waiting list for this book.");

    await tx.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    });

    await logActivity(tx, {
      action: 'WAITLIST_LEAVE',
      username: actor.username,
      userId: actor.id,
      bookId,
      bookTitle: entry.book.title,
      genre: entry.book.genre,
    });

    // Giving up a live hold passes the book straight to the next person.
    if (entry.status === 'HOLD') await promoteNextInQueue(tx, bookId);

    return { bookTitle: entry.book.title };
  });
}

export async function listForBook(bookId: string) {
  await releaseExpiredHolds(bookId);

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw notFound(`No book with ID "${bookId}".`);

  const entries = await prisma.waitlistEntry.findMany({
    where: { bookId, status: { in: ['WAITING', 'HOLD'] } },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  return {
    book: { id: book.id, title: book.title, author: book.author },
    entries: entries.map((entry, index) => ({
      id: entry.id,
      position: index + 1,
      status: entry.status,
      user: entry.user,
      joinedAt: entry.createdAt.toISOString(),
      notifiedAt: entry.notifiedAt ? entry.notifiedAt.toISOString() : null,
      holdExpiresAt:
        entry.status === 'HOLD' && book.holdExpiresAt ? book.holdExpiresAt.toISOString() : null,
    })),
  };
}

export async function listForUser(userId: string) {
  await releaseExpiredHolds();

  const entries = await prisma.waitlistEntry.findMany({
    where: { userId, status: { in: ['WAITING', 'HOLD'] } },
    orderBy: { createdAt: 'asc' },
    include: { book: true },
  });

  return Promise.all(
    entries.map(async (entry) => {
      const ahead = await prisma.waitlistEntry.count({
        where: { bookId: entry.bookId, status: 'WAITING', createdAt: { lt: entry.createdAt } },
      });
      return {
        id: entry.id,
        status: entry.status,
        position: entry.status === 'HOLD' ? 0 : ahead + 1,
        joinedAt: entry.createdAt.toISOString(),
        holdExpiresAt:
          entry.status === 'HOLD' && entry.book.holdExpiresAt
            ? entry.book.holdExpiresAt.toISOString()
            : null,
        book: {
          id: entry.book.id,
          title: entry.book.title,
          author: entry.book.author,
          genre: entry.book.genre,
        },
      };
    }),
  );
}

/** Staff can remove someone from a queue, e.g. to clear a stale hold. */
export async function removeEntry(entryId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.waitlistEntry.findUnique({
      where: { id: entryId },
      include: { book: true, user: { select: { id: true, username: true } } },
    });
    if (!entry) throw notFound('That waiting list entry no longer exists.');

    await tx.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    });

    await logActivity(tx, {
      action: 'WAITLIST_LEAVE',
      username: entry.user.username,
      userId: entry.userId,
      bookId: entry.bookId,
      bookTitle: entry.book.title,
      genre: entry.book.genre,
      actorUsername: actor.username,
      detail: 'Removed by library staff',
    });

    if (entry.status === 'HOLD') await promoteNextInQueue(tx, entry.bookId);

    return { username: entry.user.username, bookTitle: entry.book.title };
  });
}

/** Every book that currently has someone queued, for the admin overview. */
export async function listAllQueues() {
  await releaseExpiredHolds();

  const entries = await prisma.waitlistEntry.findMany({
    where: { status: { in: ['WAITING', 'HOLD'] } },
    orderBy: { createdAt: 'asc' },
    include: {
      book: { select: { id: true, title: true, author: true, holdExpiresAt: true } },
      user: { select: { id: true, username: true } },
    },
  });

  const byBook = new Map<string, { book: (typeof entries)[number]['book']; entries: unknown[] }>();

  for (const entry of entries) {
    const bucket = byBook.get(entry.bookId) ?? { book: entry.book, entries: [] };
    bucket.entries.push({
      id: entry.id,
      position: bucket.entries.length + 1,
      status: entry.status,
      user: entry.user,
      joinedAt: entry.createdAt.toISOString(),
      holdExpiresAt:
        entry.status === 'HOLD' && entry.book.holdExpiresAt
          ? entry.book.holdExpiresAt.toISOString()
          : null,
    });
    byBook.set(entry.bookId, bucket);
  }

  return Array.from(byBook.values()).map((bucket) => ({
    book: { id: bucket.book.id, title: bucket.book.title, author: bucket.book.author },
    entries: bucket.entries,
  }));
}
