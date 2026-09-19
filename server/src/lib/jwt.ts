import jwt from 'jsonwebtoken';
import { env } from '../env';

export interface TokenPayload {
  sub: string;
  username: string;
  role: 'USER' | 'ADMIN';
}

const EXPIRES_IN_SECONDS = env.JWT_EXPIRES_DAYS * 24 * 60 * 60;

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN_SECONDS });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string') return null;
    const { sub, username, role } = decoded as jwt.JwtPayload & Partial<TokenPayload>;
    if (!sub || !username || (role !== 'USER' && role !== 'ADMIN')) return null;
    return { sub, username, role };
  } catch {
    return null;
  }
}
