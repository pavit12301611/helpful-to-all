/**
 * Rate limiting with a pluggable store.
 *
 * The default store is in-process memory, which is correct for single-node
 * self-hosted installs and for tests. Multi-node deployments can inject a Redis
 * compatible client (see createRedisStore) without adding a hard dependency.
 */
import { RateLimitError } from '@/lib/errors';

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number };

export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

type Bucket = { count: number; resetAt: number };

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    if (now - this.lastSweep > 60_000) {
      this.lastSweep = now;
      for (const [k, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(k);
      }
    }

    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    existing.count += 1;
    return {
      ok: existing.count <= limit,
      remaining: Math.max(0, limit - existing.count),
      resetAt: existing.resetAt,
    };
  }

  /** Test helper. */
  reset() {
    this.buckets.clear();
  }
}

/**
 * Minimal Redis client shape (works with ioredis / redis v4 / Upstash's
 * Redis-compatible client). Keeps Redis optional.
 */
export interface RedisLike {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
}

const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
end
redis.call('PEXPIRE', key, window)
return { count < limit and 1 or 0, limit - count }
`;

export function createRedisStore(client: RedisLike): RateLimitStore {
  return {
    async hit(key, limit, windowMs) {
      const now = Date.now();
      const result = (await client.eval(LUA_SLIDING_WINDOW, 1, key, limit, windowMs, now)) as [
        number,
        number,
      ];
      return { ok: result[0] === 1, remaining: Math.max(0, result[1]), resetAt: now + windowMs };
    },
  };
}

const globalForRateLimit = globalThis as unknown as { openHubRateLimitStore?: RateLimitStore };

export function rateLimitStore(): RateLimitStore {
  if (!globalForRateLimit.openHubRateLimitStore) {
    globalForRateLimit.openHubRateLimitStore = new MemoryRateLimitStore();
  }
  return globalForRateLimit.openHubRateLimitStore;
}

/** Override the store (used by tests and by deployments that plug in Redis). */
export function setRateLimitStore(store: RateLimitStore) {
  globalForRateLimit.openHubRateLimitStore = store;
}

/** Named buckets keep the limits easy to audit and tune. */
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 5 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  message: { limit: 20, windowMs: 60_000 },
  comment: { limit: 15, windowMs: 60_000 },
  create: { limit: 30, windowMs: 60_000 },
  report: { limit: 10, windowMs: 60_000 },
  upload: { limit: 10, windowMs: 60_000 },
  search: { limit: 60, windowMs: 60_000 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export async function checkRateLimit(
  bucket: RateLimitBucket,
  identity: string,
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[bucket];
  return rateLimitStore().hit(`${bucket}:${identity}`, config.limit, config.windowMs);
}

export async function enforceRateLimit(bucket: RateLimitBucket, identity: string): Promise<void> {
  const result = await checkRateLimit(bucket, identity);
  if (!result.ok) {
    throw new RateLimitError();
  }
}
