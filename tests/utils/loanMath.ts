/**
 * The tests' OWN loan maths, used to compute expected values independently of the app.
 *
 * Rules:
 *  - Never import anything from app/src here. If the tests reused the app's maths, a bug
 *    in it would also be in the "expected" value and the test would still pass.
 *  - Use a different method from the app where possible. The app walks the schedule
 *    month by month; this file uses the closed-form balance formula
 *      B(k) = P·(1+r)^k − EMI·((1+r)^k − 1) / r
 *    so the two implementations cross-check each other.
 */

export interface Loan {
  amount: number;
  /** Yearly rate as a percentage, e.g. 10 for 10%. */
  ratePercent: number;
  tenureYears: number;
}

/** 1-based calendar month (1 = January) and year of the first EMI. */
export interface FirstEmi {
  month: number;
  year: number;
}

export interface YearFigures {
  year: number;
  principal: number;
  interest: number;
  totalPayment: number;
  balance: number;
  paidPercent: number;
}

const monthlyRate = (loan: Loan) => loan.ratePercent / 1200;
const instalments = (loan: Loan) => loan.tenureYears * 12;

export function emiFor(loan: Loan): number {
  const r = monthlyRate(loan);
  const n = instalments(loan);
  if (r === 0) return loan.amount / n;
  return (loan.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function totalsFor(loan: Loan): { emi: number; totalPayment: number; totalInterest: number } {
  const emi = emiFor(loan);
  const totalPayment = emi * instalments(loan);
  return { emi, totalPayment, totalInterest: totalPayment - loan.amount };
}

/** Outstanding balance after `paid` instalments (closed form). */
export function balanceAfter(loan: Loan, paid: number): number {
  const r = monthlyRate(loan);
  if (paid >= instalments(loan)) return 0;
  if (r === 0) return loan.amount - (loan.amount / instalments(loan)) * paid;
  const growth = Math.pow(1 + r, paid);
  return Math.max(0, loan.amount * growth - (emiFor(loan) * (growth - 1)) / r);
}

/** Calendar years the EMIs fall in, e.g. a 5-year loan from June 2026 spans 2026–2031. */
export function calendarYears(loan: Loan, first: FirstEmi): number[] {
  const lastMonthIndex = first.month - 1 + instalments(loan) - 1;
  const lastYear = first.year + Math.floor(lastMonthIndex / 12);
  return Array.from({ length: lastYear - first.year + 1 }, (_, i) => first.year + i);
}

/** Expected figures for each calendar year of the loan. */
export function yearlySchedule(loan: Loan, first: FirstEmi): YearFigures[] {
  const emi = emiFor(loan);
  const n = instalments(loan);
  let paidSoFar = 0;

  return calendarYears(loan, first).map((year) => {
    const monthsBefore = year === first.year ? first.month - 1 : 0;
    const paymentsThisYear = Math.min(12 - monthsBefore, n - paidSoFar);
    const balanceAtStart = balanceAfter(loan, paidSoFar);
    paidSoFar += paymentsThisYear;
    const balanceAtEnd = balanceAfter(loan, paidSoFar);
    const principal = balanceAtStart - balanceAtEnd;
    const totalPayment = emi * paymentsThisYear;
    return {
      year,
      principal,
      interest: totalPayment - principal,
      totalPayment,
      balance: balanceAtEnd,
      paidPercent: ((loan.amount - balanceAtEnd) / loan.amount) * 100,
    };
  });
}
