import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as activity from './activity.service';

export const activityRouter = Router();

const ACTIONS = [
  'BORROW',
  'RETURN',
  'WAITLIST_JOIN',
  'WAITLIST_LEAVE',
  'HOLD_ASSIGNED',
  'HOLD_EXPIRED',
  'BOOK_ADDED',
  'BOOK_UPDATED',
  'BOOK_DELETED',
] as const;

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.enum(ACTIONS).optional(),
  q: z.string().trim().max(120).optional(),
  userId: z.string().min(1).optional(),
});

/** The member's own history. */
activityRouter.get(
  '/me',
  requireAuth,
  validate({ query: listQuery.omit({ userId: true }) }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as activity.ActivityQuery;
    res.json(await activity.listActivities({ ...query, userId: req.user!.sub }));
  }),
);

/** The full log, newest first. */
activityRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    res.json(await activity.listActivities(req.query as unknown as activity.ActivityQuery));
  }),
);
