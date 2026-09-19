import { describe, expect, it } from 'vitest';
import { expensesToCsv, splitEvenly } from '@/features/expenses/service';
import { splitShareTarget } from '@/features/expenses/schemas';
import { invoiceTotals } from '@/features/business/schemas';

describe('splitEvenly', () => {
  it('divides an amount into equal shares that add back up', () => {
    const shares = splitEvenly(1000, 4);
    expect(shares).toHaveLength(4);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1000);
    expect(shares.every((share) => share === 250)).toBe(true);
  });

  it('gives the remainder to the first people so no cents are lost', () => {
    const shares = splitEvenly(1000, 3);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1000);
    expect(shares[0]).toBeGreaterThanOrEqual(shares[2]);
  });

  it('returns nothing for an empty group', () => {
    expect(splitEvenly(1000, 0)).toEqual([]);
  });
});

describe('expensesToCsv', () => {
  it('writes a header and one escaped row per expense', () => {
    const csv = expensesToCsv([
      {
        occurredOn: new Date('2026-02-03T10:00:00.000Z'),
        category: 'food',
        description: 'Lunch, with "quotes"',
        amountCents: 1250,
        currency: 'INR',
      },
    ]);
    const [header, row] = csv.split('\n');
    expect(header).toBe('Date,Category,Description,Amount,Currency');
    expect(row).toBe('2026-02-03,"food","Lunch, with ""quotes""",12.50,"INR"');
  });

  it('renders cents as two decimal places', () => {
    const csv = expensesToCsv([
      { occurredOn: new Date('2026-01-01T00:00:00.000Z'), category: 'other', description: null, amountCents: 5, currency: 'USD' },
    ]);
    expect(csv.split('\n')[1]).toContain('0.05');
  });
});

describe('splitShareTarget', () => {
  it('routes a group value to groupId', () => {
    expect(splitShareTarget('group:abc')).toEqual({ groupId: 'abc', tripId: '' });
  });

  it('routes a trip value to tripId so trip splits are created', () => {
    expect(splitShareTarget('trip:xyz')).toEqual({ groupId: '', tripId: 'xyz' });
  });

  it('treats a missing value as "just me"', () => {
    expect(splitShareTarget(null)).toEqual({ groupId: '', tripId: '' });
    expect(splitShareTarget('')).toEqual({ groupId: '', tripId: '' });
  });
});

describe('invoiceTotals', () => {
  const items = [
    { description: 'Repair', quantity: 2, unitPriceCents: 5000 },
    { description: 'Part', quantity: 1, unitPriceCents: 2500 },
  ];

  it('adds line totals, tax and a discount', () => {
    const totals = invoiceTotals(items, { taxRateBp: 1800, discountCents: 2500 });
    expect(totals.subtotalCents).toBe(12500);
    expect(totals.taxCents).toBe(1800);
    expect(totals.totalCents).toBe(11800);
    expect(totals.lines.map((line) => line.totalCents)).toEqual([10000, 2500]);
  });

  it('defaults a missing quantity to one', () => {
    const totals = invoiceTotals([{ description: 'Call out', unitPriceCents: 3000 }], { taxRateBp: 0, discountCents: 0 });
    expect(totals.subtotalCents).toBe(3000);
    expect(totals.lines[0].quantity).toBe(1);
  });

  it('never taxes a negative taxable amount', () => {
    const totals = invoiceTotals(items, { taxRateBp: 1800, discountCents: 99_999 });
    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(0);
  });
});
