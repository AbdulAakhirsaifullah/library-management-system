import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { releaseExpiredHolds } from './loans/holds.service';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    await releaseExpiredHolds();
    const rows = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { book: { select: { id: true, title: true } } },
    });

    res.json({
      unread: rows.filter((row) => !row.readAt).length,
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        book: row.book,
        read: Boolean(row.readAt),
        createdAt: row.createdAt.toISOString(),
      })),
    });
  }),
);

notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);
