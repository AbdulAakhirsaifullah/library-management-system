import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as waitlist from './waitlist.service';

export const waitlistRouter = Router();

waitlistRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ entries: await waitlist.listForUser(req.user!.sub) });
  }),
);

waitlistRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json({ queues: await waitlist.listAllQueues() });
  }),
);

waitlistRouter.delete(
  '/:entryId',
  requireAuth,
  requireAdmin,
  validate({ params: z.object({ entryId: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const actor = { id: req.user!.sub, username: req.user!.username, role: req.user!.role };
    const result = await waitlist.removeEntry(req.params.entryId, actor);
    res.json({
      ...result,
      message: `Removed ${result.username} from the queue for "${result.bookTitle}".`,
    });
  }),
);
