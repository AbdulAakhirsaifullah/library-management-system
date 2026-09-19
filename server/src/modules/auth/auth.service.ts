import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { env } from '../../env';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signToken } from '../../lib/jwt';
import { AppError, conflict, forbidden, notFound, unauthorized } from '../../lib/errors';
import { emailProblem, normalizeEmail, passwordProblems, usernameProblem } from '../../lib/rules';

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
    createdAt: user.createdAt.toISOString(),
  };
}

function issue(user: UserRow) {
  const publicUser = toPublicUser(user);
  return {
    token: signToken({ sub: user.id, username: user.username, role: publicUser.role }),
    user: publicUser,
  };
}

function assertCredentialsShape(username: string, email: string, password: string) {
  const details: Record<string, string> = {};

  const usernameIssue = usernameProblem(username);
  if (usernameIssue) details.username = usernameIssue;

  const emailIssue = emailProblem(email);
  if (emailIssue) details.email = emailIssue;

  const passwordIssues = passwordProblems(password);
  if (passwordIssues.length > 0) details.password = passwordIssues.join(' ');

  if (Object.keys(details).length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', details);
  }
}

/** Ported from signUp() (C++ lines 374-427): unique username, unique email, password rules. */
export async function signUp(input: { username: string; email: string; password: string }) {
  const username = input.username.trim();
  const email = normalizeEmail(input.email);

  assertCredentialsShape(username, email, input.password);

  const [byUsername, byEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (byUsername) {
    throw conflict('That username is taken. Pick another.', { username: 'Already taken.' });
  }
  if (byEmail) {
    throw conflict('That email is already registered.', { email: 'Already registered.' });
  }

  const user = await prisma.user.create({
    data: { username, email, passwordHash: await hashPassword(input.password), role: 'USER' },
  });

  // The original signed the new user straight in (C++ line 426).
  return issue(user);
}

/** Ported from signInUser() (C++ lines 455-527), minus the plaintext password reveal. */
export async function signIn(input: { username: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { username: input.username.trim() } });

  // Same message either way, so the form can't be used to enumerate usernames.
  const genericFailure = unauthorized('Username or password is incorrect.');
  if (!user) throw genericFailure;

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw genericFailure;

  return issue(user);
}

/**
 * Ported from signInAdmin() (C++ lines 429-453). The original compared against
 * hardcoded constants ("Admin" / "admin123"). Staff are now real rows with
 * role ADMIN; the seeded account comes from ADMIN_USERNAME / ADMIN_PASSWORD.
 */
export async function signInAdmin(input: { username: string; password: string }) {
  const result = await signIn(input);
  if (result.user.role !== 'ADMIN') {
    throw forbidden('That account is not a library staff account.');
  }
  return result;
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('Account not found.');
  return toPublicUser(user);
}

const RESET_TTL_MINUTES = 30;
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Replaces the original forgot-password flow (C++ lines 482-525), which
 * verified username + email and then printed the stored password to the
 * screen. That is impossible here (passwords are bcrypt hashes) and was unsafe
 * anyway. Instead the same username + email check issues a single-use reset
 * token, valid for 30 minutes.
 *
 * With no mail server wired up, the token comes back in the response so the
 * flow works end to end. In a deployment with SMTP you would email it instead
 * and drop `token` from the payload — see the README.
 */
export async function requestPasswordReset(input: { username: string; email: string }) {
  const user = await prisma.user.findFirst({
    where: { username: input.username.trim(), email: normalizeEmail(input.email) },
  });

  if (!user) {
    throw notFound('No account matches that username and email.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // One live token at a time.
    await tx.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });
    await tx.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
  });

  return { token, expiresAt: expiresAt.toISOString(), username: user.username };
}

export async function resetPassword(input: { token: string; password: string }) {
  const problems = passwordProblems(input.password);
  if (problems.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', {
      password: problems.join(' '),
    });
  }

  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'INVALID_TOKEN', 'That reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  });

  return issue(record.user);
}

/**
 * Upserts the staff account on every boot so a fresh deployment always has a
 * way in. Mirrors the hardcoded admin in the original, but as a real user.
 */
export async function ensureAdminAccount() {
  const existing = await prisma.user.findUnique({ where: { username: env.ADMIN_USERNAME } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      username: env.ADMIN_USERNAME,
      email: normalizeEmail(env.ADMIN_EMAIL),
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
      role: 'ADMIN',
    },
  });
}
