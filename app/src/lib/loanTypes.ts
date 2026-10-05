export type LoanTypeId = 'home' | 'personal' | 'car';

export interface Range {
  min: number;
  max: number;
  /** Slider step. Typed values do not have to line up with it. */
  step: number;
  default: number;
}

export interface LoanTypeConfig {
  id: LoanTypeId;
  label: string;
  amountLabel: string;
  amount: Range;
  rate: Range;
  /** Tenure in years. */
  tenure: Range;
}

export const LOAN_TYPES: readonly LoanTypeConfig[] = [
  {
    id: 'home',
    label: 'Home Loan',
    amountLabel: 'Home Loan Amount',
    amount: { min: 1_00_000, max: 2_00_00_000, step: 50_000, default: 50_00_000 },
    rate: { min: 5, max: 20, step: 0.05, default: 9 },
    tenure: { min: 1, max: 30, step: 1, default: 20 },
  },
  {
    id: 'personal',
    label: 'Personal Loan',
    amountLabel: 'Personal Loan Amount',
    amount: { min: 50_000, max: 30_00_000, step: 10_000, default: 5_00_000 },
    rate: { min: 8, max: 30, step: 0.05, default: 12 },
    tenure: { min: 1, max: 7, step: 1, default: 3 },
  },
  {
    id: 'car',
    label: 'Car Loan',
    amountLabel: 'Car Loan Amount',
    amount: { min: 1_00_000, max: 50_00_000, step: 10_000, default: 8_00_000 },
    rate: { min: 6, max: 20, step: 0.05, default: 9.5 },
    tenure: { min: 1, max: 8, step: 1, default: 5 },
  },
];

export const DEFAULT_LOAN_TYPE: LoanTypeId = 'home';

export function getLoanType(id: LoanTypeId): LoanTypeConfig {
  const config = LOAN_TYPES.find((type) => type.id === id);
  if (!config) throw new Error(`Unknown loan type: ${id}`);
  return config;
}

export function isLoanTypeId(value: string | null): value is LoanTypeId {
  return LOAN_TYPES.some((type) => type.id === value);
}

export function isWithin(value: number, range: Range): boolean {
  return Number.isFinite(value) && value >= range.min && value <= range.max;
}
