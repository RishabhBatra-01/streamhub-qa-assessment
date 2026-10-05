import { describe, expect, it } from 'vitest';
import { formatStartMonth, parseLoanState, parseStartMonth, writeLoanState } from './loanParams';

const NOW = new Date(2026, 9, 5); // 5 Oct 2026

describe('parseLoanState', () => {
  it('reads a valid loan from the URL', () => {
    const params = new URLSearchParams('type=personal&amount=1000000&rate=12&tenure=5&start=2026-03');
    expect(parseLoanState(params, NOW)).toEqual({
      type: 'personal',
      amount: 10_00_000,
      rate: 12,
      tenure: 5,
      start: { year: 2026, month: 2 },
    });
  });

  it('falls back to home-loan defaults and the current month when the URL is empty', () => {
    expect(parseLoanState(new URLSearchParams(), NOW)).toEqual({
      type: 'home',
      amount: 50_00_000,
      rate: 9,
      tenure: 20,
      start: { year: 2026, month: 9 },
    });
  });

  it.each([
    ['unknown type', 'type=boat', { type: 'home' }],
    ['non-numeric amount', 'amount=abc', { amount: 50_00_000 }],
    ['amount above the maximum', 'amount=999999999', { amount: 50_00_000 }],
    ['rate below the minimum', 'rate=1', { rate: 9 }],
    ['fractional tenure', 'tenure=2.5', { tenure: 20 }],
  ])('ignores %s', (_name, query, expected) => {
    expect(parseLoanState(new URLSearchParams(query), NOW)).toMatchObject(expected);
  });
});

describe('start month', () => {
  it.each(['2026-13', '2026-00', '26-01', 'january', ''])(
    'falls back to the current month for "%s"',
    (raw) => {
      expect(parseStartMonth(raw, NOW)).toEqual({ year: 2026, month: 9 });
    },
  );

  it('round-trips through the URL format', () => {
    expect(formatStartMonth({ year: 2027, month: 0 })).toBe('2027-01');
    expect(parseStartMonth('2027-01', NOW)).toEqual({ year: 2027, month: 0 });
  });
});

describe('writeLoanState', () => {
  it('keeps unrelated params', () => {
    const next = writeLoanState(new URLSearchParams('breakdown=2027'), {
      type: 'car',
      amount: 8_00_000,
      rate: 9.5,
      tenure: 5,
      start: { year: 2026, month: 0 },
    });
    expect(next.get('breakdown')).toBe('2027');
    expect(next.toString()).toContain('type=car&amount=800000&rate=9.5&tenure=5&start=2026-01');
  });
});
