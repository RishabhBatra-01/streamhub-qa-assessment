/**
 * Loan maths used by the app.
 *
 * All functions work with full precision. Rounding happens only when values are
 * displayed, so totals never drift because of intermediate rounding.
 */

export interface LoanInput {
  /** Amount borrowed, in rupees. */
  principal: number;
  /** Yearly interest rate as a percentage, e.g. 10 for 10%. */
  annualRatePercent: number;
  /** Number of monthly instalments. */
  months: number;
}

export interface LoanSummary {
  emi: number;
  totalInterest: number;
  totalPayment: number;
}

export interface MonthlyRow {
  /** 1-based instalment number. */
  instalment: number;
  year: number;
  /** 0-based month index (0 = January). */
  month: number;
  principalPaid: number;
  interestPaid: number;
  payment: number;
  balance: number;
}

export interface YearlyRow {
  year: number;
  principalPaid: number;
  interestPaid: number;
  payment: number;
  /** Outstanding balance at the end of the year. */
  balance: number;
  /** Share of the original principal repaid by the end of the year, 0–100. */
  loanPaidPercent: number;
}

export interface StartMonth {
  year: number;
  /** 0-based month index (0 = January). */
  month: number;
}

function assertValidLoan({ principal, annualRatePercent, months }: LoanInput): void {
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new RangeError(`Principal must be a positive number, got ${principal}`);
  }
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new RangeError(`Interest rate must be zero or more, got ${annualRatePercent}`);
  }
  if (!Number.isInteger(months) || months <= 0) {
    throw new RangeError(`Months must be a positive whole number, got ${months}`);
  }
}

/** Standard reducing-balance EMI: P·r·(1+r)^n / ((1+r)^n − 1), with r the monthly rate. */
export function calculateEmi(loan: LoanInput): number {
  assertValidLoan(loan);
  const { principal, annualRatePercent, months } = loan;
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return (principal * monthlyRate * growth) / (growth - 1);
}

export function summarizeLoan(loan: LoanInput): LoanSummary {
  const emi = calculateEmi(loan);
  const totalPayment = emi * loan.months;
  return { emi, totalPayment, totalInterest: totalPayment - loan.principal };
}

export function buildMonthlySchedule(loan: LoanInput, start: StartMonth): MonthlyRow[] {
  const emi = calculateEmi(loan);
  const monthlyRate = loan.annualRatePercent / 12 / 100;
  const rows: MonthlyRow[] = [];
  let balance = loan.principal;

  for (let i = 0; i < loan.months; i++) {
    const interestPaid = balance * monthlyRate;
    const isLast = i === loan.months - 1;
    // The final instalment clears whatever floating-point dust is left.
    const principalPaid = isLast ? balance : emi - interestPaid;
    balance = isLast ? 0 : balance - principalPaid;

    const monthIndex = start.month + i;
    rows.push({
      instalment: i + 1,
      year: start.year + Math.floor(monthIndex / 12),
      month: monthIndex % 12,
      principalPaid,
      interestPaid,
      payment: principalPaid + interestPaid,
      balance,
    });
  }
  return rows;
}

/** Groups a monthly schedule by calendar year, in order. */
export function groupScheduleByYear(rows: MonthlyRow[], principal: number): YearlyRow[] {
  const byYear = new Map<number, YearlyRow>();
  for (const row of rows) {
    const current = byYear.get(row.year) ?? {
      year: row.year,
      principalPaid: 0,
      interestPaid: 0,
      payment: 0,
      balance: 0,
      loanPaidPercent: 0,
    };
    current.principalPaid += row.principalPaid;
    current.interestPaid += row.interestPaid;
    current.payment += row.payment;
    current.balance = row.balance;
    current.loanPaidPercent = ((principal - row.balance) / principal) * 100;
    byYear.set(row.year, current);
  }
  return [...byYear.values()];
}
