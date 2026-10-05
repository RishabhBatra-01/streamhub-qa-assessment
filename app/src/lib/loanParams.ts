/**
 * The loan being viewed lives in the URL query string, e.g.
 * /schedule?type=home&amount=2500000&rate=10&tenure=10&start=2026-01
 *
 * That makes every view shareable and deep-linkable. Missing or invalid values
 * quietly fall back to the loan type's defaults, so a bad link never crashes the app.
 */
import type { StartMonth } from './emi';
import {
  DEFAULT_LOAN_TYPE,
  getLoanType,
  isLoanTypeId,
  isWithin,
  type LoanTypeId,
  type Range,
} from './loanTypes';

export interface LoanState {
  type: LoanTypeId;
  amount: number;
  rate: number;
  /** Years. */
  tenure: number;
  start: StartMonth;
}

const START_PATTERN = /^(\d{4})-(\d{2})$/;

function parseInRange(raw: string | null, range: Range): number {
  if (raw === null || raw.trim() === '') return range.default;
  const value = Number(raw);
  return isWithin(value, range) ? value : range.default;
}

export function currentStartMonth(now = new Date()): StartMonth {
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function parseStartMonth(raw: string | null, now = new Date()): StartMonth {
  const match = raw ? START_PATTERN.exec(raw) : null;
  if (!match) return currentStartMonth(now);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11 || year < 1900 || year > 2200) return currentStartMonth(now);
  return { year, month };
}

export function formatStartMonth({ year, month }: StartMonth): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function parseLoanState(params: URLSearchParams, now = new Date()): LoanState {
  const rawType = params.get('type');
  const type = isLoanTypeId(rawType) ? rawType : DEFAULT_LOAN_TYPE;
  const config = getLoanType(type);
  const tenure = parseInRange(params.get('tenure'), config.tenure);
  return {
    type,
    amount: parseInRange(params.get('amount'), config.amount),
    rate: parseInRange(params.get('rate'), config.rate),
    tenure: Number.isInteger(tenure) ? tenure : config.tenure.default,
    start: parseStartMonth(params.get('start'), now),
  };
}

export function defaultLoanState(type: LoanTypeId, start: StartMonth): LoanState {
  const config = getLoanType(type);
  return {
    type,
    amount: config.amount.default,
    rate: config.rate.default,
    tenure: config.tenure.default,
    start,
  };
}

/** Writes the loan into the given params, keeping any unrelated params. */
export function writeLoanState(params: URLSearchParams, loan: LoanState): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set('type', loan.type);
  next.set('amount', String(loan.amount));
  next.set('rate', String(loan.rate));
  next.set('tenure', String(loan.tenure));
  next.set('start', formatStartMonth(loan.start));
  return next;
}
