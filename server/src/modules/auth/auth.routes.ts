import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { PASSWORD_RULES } from '../../lib/rules';
import * as service from './auth.service';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.' } },
});

const credentials = z.object({
  username: z.string().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

authRouter.get('/password-rules', (_req, res) => {
  res.json({ rules: PASSWORD_RULES });
});

authRouter.post(
  '/signup',
  authLimiter,
  validate({
    body: z.object({
      username: z.string().min(1, 'Choose a username'),
      email: z.string().min(1, 'Enter your email'),
      password: z.string().min(1, 'Choose a password'),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.signUp(req.body));
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: credentials }),
  asyncHandler(async (req, res) => {
    res.json(await service.signIn(req.body));
  }),
);

authRouter.post(
  '/admin/login',
  authLimiter,
  validate({ body: credentials }),
  asyncHandler(async (req, res) => {
    res.json(await service.signInAdmin(req.body));
  }),
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({
    body: z.object({
      username: z.string().min(1, 'Enter your username'),
      email: z.string().min(1, 'Enter your email'),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json(await service.requestPasswordReset(req.body));
  }),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validate({
    body: z.object({
      token: z.string().min(1, 'Reset code is missing'),
      password: z.string().min(1, 'Choose a new password'),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json(await service.resetPassword(req.body));
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await service.getMe(req.user!.sub) });
  }),
);
