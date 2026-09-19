import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type TokenPayload } from '../lib/jwt';
import { forbidden, unauthorized } from '../lib/errors';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/** Attaches req.user when a valid token is present, but never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next(unauthorized('Sign in to continue.'));
  const payload = verifyToken(token);
  if (!payload) return next(unauthorized('Your session has expired. Sign in again.'));
  req.user = payload;
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized('Sign in to continue.'));
  if (req.user.role !== 'ADMIN') return next(forbidden('This area is for library staff.'));
  next();
}
