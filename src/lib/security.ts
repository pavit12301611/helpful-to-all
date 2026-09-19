import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';

/**
 * Password hashing with scrypt (Node's built-in KDF).
 *
 * We intentionally avoid a native dependency here: self-hosters should be able
 * to install OpenHub with plain `npm install` on any platform. scrypt is
 * memory-hard and approved for password storage (RFC 7914).
 *
 * Stored format: scrypt$N$r$p$<salt base64>$<hash base64>
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * SCRYPT_N * SCRYPT_R * 2 },
      (error, derived) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(`scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${derived.toString('base64')}`);
      },
    );
  });
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      resolve(false);
      return;
    }
    const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    scrypt(
      password,
      salt,
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2 },
      (error, derived) => {
        if (error) {
          resolve(false);
          return;
        }
        resolve(derived.length === expected.length && timingSafeEqual(derived, expected));
      },
    );
  });
}

/** Random URL-safe token (session cookies, invite links, password resets). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Sessions and invite links store a hash of the token, so a database leak does
 * not hand out valid cookies.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Privacy-friendly identifier for audit logs. The raw IP is never stored.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const secret = process.env.AUTH_SECRET ?? 'openhub-dev-secret';
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32);
}

export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Password strength estimation used by the password checker utility and by
 * registration validation. Returns 0..4 plus the failed rules.
 */
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'very weak' | 'weak' | 'fair' | 'strong' | 'very strong';
  missing: string[];
};

export function passwordStrength(password: string): PasswordStrength {
  const missing: string[] = [];
  if (password.length < 10) missing.push('at least 10 characters');
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter');
  if (!/\d/.test(password)) missing.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) missing.push('a symbol');

  const common = ['password', '123456', 'qwerty', 'letmein', 'openhub', 'welcome', 'admin'];
  const lowered = password.toLowerCase();
  if (common.some((word) => lowered.includes(word))) {
    missing.push('something less common');
  }

  const score = Math.max(0, Math.min(4, 4 - Math.min(4, missing.length))) as PasswordStrength['score'];
  const labels: PasswordStrength['label'][] = ['very weak', 'weak', 'fair', 'strong', 'very strong'];
  return { score, label: labels[score], missing };
}
