import { z } from 'zod';

/**
 * Runtime validation of the environment.
 *
 * The app refuses to boot with an unusable configuration instead of failing in
 * confusing ways later. Only AUTH_SECRET is strictly required in production.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  OPENHUB_DB: z.enum(['sqlite', 'postgresql']).optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  APP_URL: z.string().url().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
  EMAIL_PROVIDER: z.enum(['console', 'smtp', 'resend']).default('console'),
  SMTP_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('OpenHub <no-reply@openhub.local>'),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('storage/uploads'),
  MAP_PROVIDER: z.enum(['none', 'openstreetmap']).default('openstreetmap'),
  CURRENCY_API_KEY: z.string().optional(),
  ALLOW_EMBED: z.enum(['true', 'false']).optional(),
  ENABLE_HSTS: z.enum(['true', 'false']).optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee .env.example for the expected values.`);
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.AUTH_SECRET) {
    throw new Error(
      'AUTH_SECRET is required in production. Generate one with: openssl rand -base64 32',
    );
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: reset the memoised environment (used by unit tests). */
export function resetEnvCache() {
  cached = null;
}

export const appUrl = () => env().APP_URL ?? 'http://localhost:3000';
