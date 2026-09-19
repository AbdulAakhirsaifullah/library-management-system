import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as loans from './loans.service';

export const loansRouter = Router();

const listQuery = z.object({
  status: z.enum(['active', 'returned', 'all']).default('all'),
  userId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** A member's own borrow history. */
loansRouter.get(
  '/me',
  requireAuth,
  validate({ query: listQuery.omit({ userId: true }) }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as Omit<loans.ListLoansQuery, 'userId'>;
    res.json(await loans.listLoans({ ...query, userId: req.user!.sub }));
  }),
);

/** Every loan in the library. */
loansRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    res.json(await loans.listLoans(req.query as unknown as loans.ListLoansQuery));
  }),
);
