import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { optionalAuth, requireAdmin, requireAuth } from '../../middleware/auth';
import * as books from './books.service';
import * as loans from '../loans/loans.service';
import * as waitlist from '../waitlist/waitlist.service';

export const booksRouter = Router();

const bookIdParam = z.object({ id: z.string().min(1).max(64) });

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  genre: z.string().trim().max(80).optional(),
  availability: z.enum(['all', 'available', 'borrowed']).default('all'),
  sort: z.enum(['title', 'author', 'genre', 'id', 'recent']).default('title'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const bookBody = z.object({
  id: z
    .string()
    .trim()
    .min(1, 'Give the book an ID')
    .max(32, 'Keep the ID under 32 characters')
    .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dots, underscores or hyphens'),
  title: z.string().trim().min(1, 'Enter a title').max(200),
  author: z.string().trim().min(1, 'Enter an author').max(120),
  genre: z.string().trim().min(1, 'Enter a genre').max(60),
});

const actorFrom = (req: { user?: { sub: string; username: string; role: 'USER' | 'ADMIN' } }) => ({
  id: req.user!.sub,
  username: req.user!.username,
  role: req.user!.role,
});

booksRouter.get(
  '/',
  optionalAuth,
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as books.ListBooksQuery;
    res.json(await books.listBooks(query, req.user?.sub ?? null));
  }),
);

booksRouter.get(
  '/genres',
  asyncHandler(async (_req, res) => {
    res.json({ genres: await books.listGenres() });
  }),
);

booksRouter.get(
  '/:id',
  optionalAuth,
  validate({ params: bookIdParam }),
  asyncHandler(async (req, res) => {
    res.json({ book: await books.getBook(req.params.id, req.user?.sub ?? null) });
  }),
);

booksRouter.get(
  '/:id/suggestions',
  validate({ params: bookIdParam }),
  asyncHandler(async (req, res) => {
    res.json({ books: await books.suggestByGenre(req.params.id) });
  }),
);

// --- Admin book management ---------------------------------------------

booksRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  validate({ body: bookBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ book: await books.createBook(req.body, req.user!.username) });
  }),
);

booksRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate({
    params: bookIdParam,
    body: bookBody.omit({ id: true }).partial().refine(
      (value) => Object.keys(value).length > 0,
      'Change at least one field',
    ),
  }),
  asyncHandler(async (req, res) => {
    res.json({ book: await books.updateBook(req.params.id, req.body, req.user!.username) });
  }),
);

booksRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validate({ params: bookIdParam }),
  asyncHandler(async (req, res) => {
    res.json({ removed: await books.deleteBook(req.params.id, req.user!.username) });
  }),
);

// --- Borrow / return ----------------------------------------------------

const onBehalfBody = z.object({ userId: z.string().min(1).optional() }).default({});

booksRouter.post(
  '/:id/borrow',
  requireAuth,
  validate({ params: bookIdParam, body: onBehalfBody }),
  asyncHandler(async (req, res) => {
    res.json(await loans.borrowBook(req.params.id, actorFrom(req), req.body?.userId));
  }),
);

booksRouter.post(
  '/:id/return',
  requireAuth,
  validate({ params: bookIdParam, body: onBehalfBody }),
  asyncHandler(async (req, res) => {
    res.json(await loans.returnBook(req.params.id, actorFrom(req), req.body?.userId));
  }),
);

// --- Waiting list -------------------------------------------------------

booksRouter.post(
  '/:id/waitlist',
  requireAuth,
  validate({ params: bookIdParam }),
  asyncHandler(async (req, res) => {
    const result = await waitlist.joinWaitlist(req.params.id, actorFrom(req));
    res.status(201).json({
      ...result,
      message: `You're number ${result.position} in line for "${result.bookTitle}".`,
    });
  }),
);

booksRouter.delete(
  '/:id/waitlist',
  requireAuth,
  validate({ params: bookIdParam }),
  asyncHandler(async (req, res) => {
    const result = await waitlist.leaveWaitlist(req.params.id, actorFrom(req));
    res.json({ ...result, message: `You left the waiting list for "${result.bookTitle}".` });
  }),
);

booksRouter.get(
  '/:id/waitlist',
  requireAuth,
  requireAdmin,
  validate({ params: bookIdParam }),
  asyncHandler(async (req, res) => {
    res.json(await waitlist.listForBook(req.params.id));
  }),
);
