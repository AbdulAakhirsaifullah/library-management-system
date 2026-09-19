/**
 * Validation rules ported from librarymanagementsystem.cpp.
 *
 * C++ source of truth:
 *   validPassword()  lines 328-350  -> >=8 chars, upper, lower, digit, special
 *   validEmail()     lines 352-360  -> must contain "@gmail.com"
 *   usernameExists() lines 304-314  -> uniqueness only, no format rules
 */
import { env } from '../env';

const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /[0-9]/;
// ASCII punctuation, matching C++ ispunct()
const SPECIAL = /[!-/:-@[-`{-~]/;

export const PASSWORD_RULES = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'One special character',
] as const;

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push('Password must be at least 8 characters long.');
  if (!UPPER.test(password)) problems.push('Password must contain an uppercase letter.');
  if (!LOWER.test(password)) problems.push('Password must contain a lowercase letter.');
  if (!DIGIT.test(password)) problems.push('Password must contain a number.');
  if (!SPECIAL.test(password)) problems.push('Password must contain a special character.');
  return problems;
}

export function isValidPassword(password: string): boolean {
  return passwordProblems(password).length === 0;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function emailProblem(email: string): string | null {
  if (!EMAIL_SHAPE.test(email)) return 'Enter a valid email address.';
  // The original only accepted Gmail addresses. Kept behind a flag.
  if (env.REQUIRE_GMAIL && !email.toLowerCase().endsWith('@gmail.com')) {
    return 'This library only accepts Gmail addresses.';
  }
  return null;
}

/**
 * The original imposed no username format at all, but a username used as a
 * login handle needs one. Deliberate addition, documented in the README.
 */
const USERNAME_SHAPE = /^[A-Za-z0-9._-]{3,24}$/;

export function usernameProblem(username: string): string | null {
  if (!USERNAME_SHAPE.test(username)) {
    return 'Username must be 3-24 characters, using letters, numbers, dots, underscores or hyphens.';
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
