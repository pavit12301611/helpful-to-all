import { describe, expect, it } from 'vitest';
import { tripBalances } from '@/features/trips/service';
import { generateToken, hashIp, hashPassword, hashToken, passwordStrength, sha256, verifyPassword } from '@/lib/security';
import { tripSchema } from '@/features/trips/schemas';

describe('tripBalances', () => {
  const memberIds = ['a', 'b', 'c'];

  it('pays back whoever fronted the money', () => {
    const balances = tripBalances(
      [
        {
          id: 'e1',
          ownerId: 'a',
          amountCents: 3000,
          splits: [
            { userId: 'a', shareCents: 1000, settledAt: null },
            { userId: 'b', shareCents: 1000, settledAt: null },
            { userId: 'c', shareCents: 1000, settledAt: null },
          ],
        },
      ],
      memberIds,
    );

    const byUser = Object.fromEntries(balances.map((row) => [row.userId, row.balanceCents]));
    expect(byUser.a).toBe(2000);
    expect(byUser.b).toBe(-1000);
    expect(byUser.c).toBe(-1000);
  });

  it('ignores shares that are already settled', () => {
    const balances = tripBalances(
      [
        {
          id: 'e1',
          ownerId: 'a',
          amountCents: 2000,
          splits: [
            { userId: 'a', shareCents: 1000, settledAt: null },
            { userId: 'b', shareCents: 1000, settledAt: new Date() },
          ],
        },
      ],
      ['a', 'b'],
    );

    const byUser = Object.fromEntries(balances.map((row) => [row.userId, row.balanceCents]));
    expect(byUser.a).toBe(1000);
    expect(byUser.b).toBe(0);
  });

  it('balances to zero across the whole group', () => {
    const balances = tripBalances(
      [
        {
          id: 'e1',
          ownerId: 'b',
          amountCents: 900,
          splits: memberIds.map((userId) => ({ userId, shareCents: 300, settledAt: null })),
        },
      ],
      memberIds,
    );
    expect(balances.reduce((sum, row) => sum + row.balanceCents, 0)).toBe(0);
  });

  it('treats a null share as zero', () => {
    const balances = tripBalances(
      [{ id: 'e1', ownerId: 'a', amountCents: 100, splits: [{ userId: 'b', shareCents: null, settledAt: null }] }],
      ['a', 'b'],
    );
    expect(balances.find((row) => row.userId === 'b')?.balanceCents).toBe(0);
  });
});

describe('tripSchema', () => {
  it('requires a title', () => {
    expect(tripSchema.safeParse({ title: '' }).success).toBe(false);
    expect(tripSchema.safeParse({ title: 'Goa with friends' }).success).toBe(true);
  });

  it('rejects a negative budget and a currency that is not three letters', () => {
    expect(tripSchema.safeParse({ title: 'Trip', budgetCents: -5 }).success).toBe(false);
    expect(tripSchema.safeParse({ title: 'Trip', currency: 'DOLLARS' }).success).toBe(false);
  });

  it('defaults visibility to private', () => {
    const parsed = tripSchema.parse({ title: 'Trip' });
    expect(parsed.visibility).toBe('private');
  });
});

describe('security helpers', () => {
  it('hashes tokens deterministically and never stores the raw value', () => {
    const token = generateToken(16);
    expect(token.length).toBeGreaterThan(20);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it('hashes IP addresses but keeps null for missing values', () => {
    expect(hashIp(null)).toBeNull();
    expect(hashIp(undefined)).toBeNull();
    const hashed = hashIp('203.0.113.7');
    expect(hashed).not.toContain('203.0.113.7');
    // Truncated SHA-256 with the AUTH_SECRET mixed in.
    expect(hashed).toHaveLength(32);
  });

  it('round-trips a password through scrypt', async () => {
    const hash = await hashPassword('OpenHub!2345');
    expect(hash).not.toBe('OpenHub!2345');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash.split('$')).toHaveLength(6);
    await expect(verifyPassword('OpenHub!2345', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('computes a stable sha256', () => {
    expect(sha256('openhub')).toBe(sha256('openhub'));
    expect(sha256('openhub')).not.toBe(sha256('openhuB'));
  });
});

describe('passwordStrength', () => {
  it('lists what a weak password is missing', () => {
    const weak = passwordStrength('password');
    expect(weak.score).toBeLessThanOrEqual(1);
    expect(weak.missing.length).toBeGreaterThan(0);
  });

  it('scores a long mixed password highly', () => {
    const strong = passwordStrength('Tr!cky-9mango-Window#42');
    expect(strong.score).toBe(4);
    expect(strong.label).toBe('very strong');
    expect(strong.missing).toEqual([]);
  });
});
