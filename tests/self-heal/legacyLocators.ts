import type { LocatorSpec } from './locatorSpec';

export interface LegacyLocator {
  /** What the locator is meant to find, in plain words. The healer relies on this. */
  intent: string;
  spec: LocatorSpec;
}

/**
 * ⚠️ DELIBERATELY BROKEN LOCATORS (AI self-healing exercise, see docs/SELF_HEALING.md)
 *
 * These locators were "written against an older version of the UI". Each one breaks in a
 * different, realistic way. They are LEFT BROKEN on purpose, as the brief asks, so that
 *   npm run test:self-heal   shows them failing, and
 *   npm run self-heal        demonstrates detecting and healing them.
 *
 * The healer rewrites the `spec:` line of an entry, so keep each spec on ONE line.
 * The rest of the framework never uses these: real page objects live in tests/pages/.
 */
export const LEGACY_LOCATORS = {
  // 1. Stale data-testid: the app renamed it to 'emi-value'.
  monthlyEmi: {
    intent: 'The Monthly EMI amount shown in the loan summary cards',
    spec: { testId: 'monthly-emi' },
  },
  // 2. Wrong role: a number input has role "spinbutton", not "textbox".
  interestRateInput: {
    intent: 'The Interest Rate number box in the loan details form',
    spec: { role: 'textbox', name: 'Interest Rate' },
  },
  // 3. Renamed text: the tab is labelled "Personal Loan" (singular).
  personalLoanTab: {
    intent: 'The tab that switches the calculator to a personal loan',
    spec: { role: 'tab', name: 'Personal Loans' },
  },
  // 4. Brittle absolute XPath: breaks as soon as the page layout changes.
  loanTenureInput: {
    intent: 'The Loan Tenure number box (in years) in the loan details form',
    spec: { xpath: '/html/body/div/div/main/section[2]/div[2]/form/div[3]/div[1]/div/input' },
  },
  // 5. Brittle CSS tied to old styling class names that no longer exist.
  totalInterestValue: {
    intent: 'The Total Interest Payable amount shown in the loan summary cards',
    spec: { css: 'div.summary-card.interest > span.amount' },
  },
} satisfies Record<string, LegacyLocator>;

export type LegacyLocatorKey = keyof typeof LEGACY_LOCATORS;

export const LEGACY_LOCATORS_FILE = 'tests/self-heal/legacyLocators.ts';
