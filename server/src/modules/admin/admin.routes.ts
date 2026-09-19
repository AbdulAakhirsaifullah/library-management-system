import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import { toPublicUser } from '../auth/auth.service';
import { releaseExpiredHolds } from '../loans/holds.service';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  '/users',
  validate({ query: z.object({ q: z.string().trim().max(80).optional() }) }),
  asyncHandler(async (req, res) => {
    const q = (req.query as { q?: string }).q;
    const users = await prisma.user.findMany({
      where: q ? { OR: [{ username: { contains: q } }, { email: { contains: q } }] } : undefined,
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { loans: true } } },
    });

    const activeCounts = await prisma.loan.groupBy({
      by: ['userId'],
      where: { returnedAt: null },
      _count: { _all: true },
    });
    const activeByUser = new Map(activeCounts.map((row) => [row.userId, row._count._all]));

    res.json({
      users: users.map((user) => ({
        ...toPublicUser(user),
        totalLoans: user._count.loans,
        activeLoans: activeByUser.get(user.id) ?? 0,
      })),
    });
  }),
);

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    await releaseExpiredHolds();
    const now = new Date();

    const [books, members, activeLoans, overdue, waiting, holds, recent] = await Promise.all([
      prisma.book.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.loan.count({ where: { returnedAt: null } }),
      prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: now } } }),
      prisma.waitlistEntry.count({ where: { status: 'WAITING' } }),
      prisma.waitlistEntry.count({ where: { status: 'HOLD' } }),
      prisma.activity.count({
        where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    res.json({
      books,
      available: books - activeLoans - holds,
      members,
      activeLoans,
      overdue,
      waiting,
      holds,
      activityLastWeek: recent,
    });
  }),
);
