import { describe, expect, it } from 'vitest';
import { buildMonthlySchedule, calculateEmi, groupScheduleByYear, summarizeLoan } from './emi';

describe('calculateEmi', () => {
  // Reference values checked against a standard EMI calculator.
  it.each([
    { principal: 25_00_000, annualRatePercent: 10, months: 120, expected: 33_037.68 },
    { principal: 50_00_000, annualRatePercent: 7.5, months: 180, expected: 46_350.62 },
    { principal: 10_00_000, annualRatePercent: 12, months: 60, expected: 22_244.45 },
  ])('₹$principal at $annualRatePercent% for $months months → ₹$expected', (loan) => {
    expect(calculateEmi(loan)).toBeCloseTo(loan.expected, 2);
  });

  it('splits the principal evenly when the rate is 0%', () => {
    expect(calculateEmi({ principal: 1_20_000, annualRatePercent: 0, months: 12 })).toBe(10_000);
  });

  it.each([
    { principal: 0, annualRatePercent: 10, months: 12 },
    { principal: -1, annualRatePercent: 10, months: 12 },
    { principal: 1000, annualRatePercent: -1, months: 12 },
    { principal: 1000, annualRatePercent: 10, months: 0 },
    { principal: 1000, annualRatePercent: 10, months: 1.5 },
    { principal: Number.NaN, annualRatePercent: 10, months: 12 },
  ])('rejects invalid input %o', (loan) => {
    expect(() => calculateEmi(loan)).toThrow(RangeError);
  });
});

describe('summarizeLoan', () => {
  it('total payment = EMI × months and total interest = total payment − principal', () => {
    const summary = summarizeLoan({ principal: 25_00_000, annualRatePercent: 10, months: 120 });
    expect(summary.totalPayment).toBeCloseTo(summary.emi * 120, 6);
    expect(summary.totalInterest).toBeCloseTo(summary.totalPayment - 25_00_000, 6);
    expect(Math.round(summary.totalInterest)).toBe(14_64_522);
  });
});

describe('buildMonthlySchedule', () => {
  const loan = { principal: 10_00_000, annualRatePercent: 12, months: 60 };

  it('has one row per month, ends at zero and repays exactly the principal', () => {
    const rows = buildMonthlySchedule(loan, { year: 2026, month: 0 });
    expect(rows).toHaveLength(60);
    expect(rows.at(-1)?.balance).toBe(0);
    const principalRepaid = rows.reduce((sum, row) => sum + row.principalPaid, 0);
    expect(principalRepaid).toBeCloseTo(loan.principal, 6);
  });

  it('first month interest is balance × monthly rate', () => {
    const [first] = buildMonthlySchedule(loan, { year: 2026, month: 0 });
    expect(first?.interestPaid).toBeCloseTo(10_000, 6);
  });

  it('rolls months over into the next calendar year', () => {
    const rows = buildMonthlySchedule(loan, { year: 2026, month: 10 });
    expect(rows[0]).toMatchObject({ year: 2026, month: 10 });
    expect(rows[2]).toMatchObject({ year: 2027, month: 0 });
    expect(rows.at(-1)).toMatchObject({ year: 2031, month: 9 });
  });
});

describe('groupScheduleByYear', () => {
  const loan = { principal: 10_00_000, annualRatePercent: 12, months: 60 };

  it('a 5-year loan starting in January covers 5 calendar years', () => {
    const years = groupScheduleByYear(buildMonthlySchedule(loan, { year: 2026, month: 0 }), loan.principal);
    expect(years.map((row) => row.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
  });

  it('a 5-year loan starting mid-year covers 6 calendar years', () => {
    const years = groupScheduleByYear(buildMonthlySchedule(loan, { year: 2026, month: 5 }), loan.principal);
    expect(years.map((row) => row.year)).toEqual([2026, 2027, 2028, 2029, 2030, 2031]);
  });

  it('yearly totals add up to the loan totals and end fully paid', () => {
    const years = groupScheduleByYear(buildMonthlySchedule(loan, { year: 2026, month: 3 }), loan.principal);
    const { totalInterest } = summarizeLoan(loan);
    expect(years.reduce((sum, row) => sum + row.principalPaid, 0)).toBeCloseTo(loan.principal, 6);
    expect(years.reduce((sum, row) => sum + row.interestPaid, 0)).toBeCloseTo(totalInterest, 6);
    expect(years.at(-1)?.loanPaidPercent).toBeCloseTo(100, 6);
  });
});
