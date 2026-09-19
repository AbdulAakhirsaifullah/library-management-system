import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type ActivityAction =
  | 'BORROW'
  | 'RETURN'
  | 'WAITLIST_JOIN'
  | 'WAITLIST_LEAVE'
  | 'HOLD_ASSIGNED'
  | 'HOLD_EXPIRED'
  | 'BOOK_ADDED'
  | 'BOOK_UPDATED'
  | 'BOOK_DELETED';

export interface LogInput {
  action: ActivityAction;
  username: string;
  userId?: string | null;
  bookId?: string | null;
  bookTitle: string;
  genre?: string;
  /** Set when someone other than `username` performed the action (admin on behalf). */
  actorUsername?: string | null;
  detail?: string | null;
}

/**
 * The C++ version pushed onto a stack and rewrote activityLog.txt so the newest
 * entry sat on the first line. Here rows are appended and read newest-first,
 * which gives the same LIFO reading order without rewriting the whole log.
 */
export function logActivity(client: Prisma.TransactionClient | typeof prisma, input: LogInput) {
  return client.activity.create({
    data: {
      action: input.action,
      username: input.username,
      userId: input.userId ?? null,
      bookId: input.bookId ?? null,
      bookTitle: input.bookTitle,
      genre: input.genre ?? '',
      actorUsername: input.actorUsername ?? null,
      detail: input.detail ?? null,
    },
  });
}

export interface ActivityQuery {
  page: number;
  pageSize: number;
  userId?: string;
  action?: ActivityAction;
  q?: string;
}

export async function listActivities(query: ActivityQuery) {
  const where: Prisma.ActivityWhereInput = {};
  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = query.action;
  if (query.q) {
    where.OR = [
      { username: { contains: query.q } },
      { bookTitle: { contains: query.q } },
      { genre: { contains: query.q } },
      { bookId: { contains: query.q } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' }, // newest first, like the original stack
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      username: row.username,
      bookId: row.bookId,
      bookTitle: row.bookTitle,
      genre: row.genre,
      actorUsername: row.actorUsername,
      detail: row.detail,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
