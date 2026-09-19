import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../env';
import { logActivity } from '../activity/activity.service';
import { logger } from '../../lib/logger';

/**
 * Replaces notifyNextUser() (C++ lines 950-957), which dequeued the next
 * username and printed "Notifying X..." to the console the user never saw.
 *
 * Here the book is put on hold for that person for HOLD_HOURS. Nobody else can
 * borrow it during the hold. If they do not collect it in time the hold
 * expires, the book passes to the next person in line, and if the queue is
 * empty it goes back on the shelf.
 */
export function holdDeadline(from = new Date()): Date {
  return new Date(from.getTime() + env.HOLD_HOURS * 60 * 60 * 1000);
}

/** Promotes the next WAITING entry to a HOLD, or frees the book if nobody is queued. */
export async function promoteNextInQueue(tx: Prisma.TransactionClient, bookId: string) {
  const book = await tx.book.findUnique({ where: { id: bookId } });
  if (!book) return null;

  const next = await tx.waitlistEntry.findFirst({
    where: { bookId, status: 'WAITING' },
    orderBy: { createdAt: 'asc' }, // first come, first served
    include: { user: { select: { id: true, username: true } } },
  });

  if (!next) {
    await tx.book.update({
      where: { id: bookId },
      data: { available: true, heldForUserId: null, holdExpiresAt: null },
    });
    return null;
  }

  const now = new Date();
  const expiresAt = holdDeadline(now);

  await tx.waitlistEntry.update({
    where: { id: next.id },
    data: { status: 'HOLD', notifiedAt: now },
  });

  await tx.book.update({
    where: { id: bookId },
    data: { available: false, heldForUserId: next.userId, holdExpiresAt: expiresAt },
  });

  await tx.notification.create({
    data: {
      userId: next.userId,
      bookId,
      title: `"${book.title}" is ready for you`,
      body: `You were next in line. It is held for you until ${expiresAt.toUTCString()}. Borrow it before then or it passes to the next person.`,
    },
  });

  await logActivity(tx, {
    action: 'HOLD_ASSIGNED',
    username: next.user.username,
    userId: next.userId,
    bookId,
    bookTitle: book.title,
    genre: book.genre,
    detail: `Held until ${expiresAt.toISOString()}`,
  });

  return { userId: next.userId, username: next.user.username, expiresAt };
}

/** Expires one lapsed hold and hands the book to the next person. */
async function expireHold(tx: Prisma.TransactionClient, bookId: string) {
  const book = await tx.book.findUnique({ where: { id: bookId } });
  if (!book || !book.holdExpiresAt || book.holdExpiresAt.getTime() > Date.now()) return false;

  const entry = await tx.waitlistEntry.findFirst({
    where: { bookId, status: 'HOLD' },
    include: { user: { select: { id: true, username: true } } },
  });

  if (entry) {
    await tx.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'EXPIRED', resolvedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: entry.userId,
        bookId,
        title: `Your hold on "${book.title}" expired`,
        body: 'The book has passed to the next person in line. You can join the waiting list again.',
      },
    });
    await logActivity(tx, {
      action: 'HOLD_EXPIRED',
      username: entry.user.username,
      userId: entry.userId,
      bookId,
      bookTitle: book.title,
      genre: book.genre,
    });
  }

  await promoteNextInQueue(tx, bookId);
  return true;
}

/**
 * Sweeps lapsed holds. Called before catalog reads and on a timer, so the
 * queue keeps moving without a separate worker process.
 * Pass a bookId to sweep a single book.
 */
export async function releaseExpiredHolds(bookId?: string): Promise<number> {
  const stale = await prisma.book.findMany({
    where: {
      holdExpiresAt: { lt: new Date() },
      ...(bookId ? { id: bookId } : {}),
    },
    select: { id: true },
  });

  if (stale.length === 0) return 0;

  let released = 0;
  for (const book of stale) {
    // A promotion sets a fresh future deadline, so this settles in one pass
    // per book. The guard is only there to make the loop provably finite.
    await prisma.$transaction(async (tx) => {
      let guard = 0;
      while ((await expireHold(tx, book.id)) && guard < 100) {
        guard += 1;
        released += 1;
      }
    });
  }

  return released;
}

let timer: NodeJS.Timeout | null = null;

/** Runs the sweep every 10 minutes so holds expire without any traffic. */
export function startHoldSweeper(intervalMs = 10 * 60 * 1000) {
  if (timer) return;
  timer = setInterval(() => {
    releaseExpiredHolds().catch((error) => {
      logger.error('Hold sweep failed', error);
    });
  }, intervalMs);
  timer.unref?.();
}

export function stopHoldSweeper() {
  if (timer) clearInterval(timer);
  timer = null;
}
