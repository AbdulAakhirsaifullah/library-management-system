import 'dotenv/config';
import { z } from 'zod';

/** "true"/"1" -> true, anything else -> false. z.coerce.boolean() would turn "false" into true. */
const boolish = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? fallback : ['true', '1', 'yes'].includes(v.toLowerCase())));

const DEV_SECRET = 'dev-only-insecure-secret-change-me';
const DEV_ADMIN_PASSWORD = 'Admin@123';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default('file:./data/library.db'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default(DEV_SECRET),
  JWT_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  ADMIN_USERNAME: z.string().min(1).default('Admin'),
  ADMIN_EMAIL: z.string().email().default('admin@gmail.com'),
  ADMIN_PASSWORD: z.string().min(1).default(DEV_ADMIN_PASSWORD),

  REQUIRE_GMAIL: boolish(false),
  SERVE_CLIENT: boolish(true),

  LOAN_DAYS: z.coerce.number().int().positive().default(14),
  HOLD_HOURS: z.coerce.number().int().positive().default(48),
  /** 0 means unlimited, which is what the original C++ program allowed. */
  MAX_ACTIVE_LOANS: z.coerce.number().int().min(0).default(0),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Runs before the logger exists, so this writes to stderr directly.
  process.stderr.write(`Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;

// Refuse to start in production on any credential that ships in the repo.
// Both of these are public knowledge to anyone who reads the source.
if (env.NODE_ENV === 'production') {
  const unsafe: string[] = [];
  if (env.JWT_SECRET === DEV_SECRET) unsafe.push('JWT_SECRET is still the development default');
  if (env.ADMIN_PASSWORD === DEV_ADMIN_PASSWORD) {
    unsafe.push('ADMIN_PASSWORD is still the documented default');
  }
  if (unsafe.length > 0) {
    process.stderr.write(`Refusing to start:\n${unsafe.map((u) => `  - ${u}`).join('\n')}\n`);
    process.exit(1);
  }
}

export const isProd = env.NODE_ENV === 'production';
