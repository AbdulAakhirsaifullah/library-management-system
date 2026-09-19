import type { Book, Loan, User, WaitlistEntry } from '@prisma/client';

export type BookStatus = 'AVAILABLE' | 'BORROWED' | 'ON_HOLD' | 'HELD_FOR_YOU';

export interface BookDTO {
  id: string;
  title: string;
  author: string;
  genre: string;
  status: BookStatus;
  available: boolean;
  borrowedBy: { id: string; username: string } | null;
  borrowedAt: string | null;
  dueAt: string | null;
  holdExpiresAt: string | null;
  waitlistCount: number;
  viewer: {
    hasLoan: boolean;
    onWaitlist: boolean;
    waitlistPosition: number | null;
    hasHold: boolean;
  } | null;
}

interface SerializeContext {
  activeLoan?: (Loan & { user: Pick<User, 'id' | 'username'> }) | null;
  waitlist?: WaitlistEntry[];
  viewerId?: string | null;
}

export function serializeBook(book: Book, ctx: SerializeContext = {}): BookDTO {
  const { activeLoan = null, waitlist = [], viewerId = null } = ctx;

  const queue = waitlist
    .filter((entry) => entry.status === 'WAITING')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const holdEntry = waitlist.find((entry) => entry.status === 'HOLD') ?? null;
  const holdIsLive = Boolean(book.holdExpiresAt && book.holdExpiresAt.getTime() > Date.now());

  let status: BookStatus;
  if (activeLoan) {
    status = 'BORROWED';
  } else if (holdIsLive && book.heldForUserId) {
    status = viewerId && book.heldForUserId === viewerId ? 'HELD_FOR_YOU' : 'ON_HOLD';
  } else {
    status = book.available ? 'AVAILABLE' : 'BORROWED';
  }

  const myQueueIndex = viewerId ? queue.findIndex((entry) => entry.userId === viewerId) : -1;

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    genre: book.genre,
    status,
    available: status === 'AVAILABLE',
    borrowedBy: activeLoan ? { id: activeLoan.user.id, username: activeLoan.user.username } : null,
    borrowedAt: activeLoan ? activeLoan.borrowedAt.toISOString() : null,
    dueAt: activeLoan?.dueAt ? activeLoan.dueAt.toISOString() : null,
    holdExpiresAt: holdIsLive && book.holdExpiresAt ? book.holdExpiresAt.toISOString() : null,
    waitlistCount: queue.length,
    viewer: viewerId
      ? {
          hasLoan: Boolean(activeLoan && activeLoan.userId === viewerId),
          onWaitlist: myQueueIndex >= 0,
          waitlistPosition: myQueueIndex >= 0 ? myQueueIndex + 1 : null,
          hasHold: Boolean(holdIsLive && holdEntry && holdEntry.userId === viewerId),
        }
      : null,
  };
}
