import { expect, type Locator } from '@playwright/test';

/** "₹1,66,492" → 166492. Throws on text that is not a rupee amount. */
export function parseRupees(text: string | null): number {
  const cleaned = (text ?? '').replace(/[₹,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) throw new Error(`Not a rupee amount: "${text}"`);
  return Number(cleaned);
}

/** "25.48%" → 25.48 */
export function parsePercent(text: string | null): number {
  const cleaned = (text ?? '').replace(/[%\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) throw new Error(`Not a percentage: "${text}"`);
  return Number(cleaned);
}

/**
 * Asserts that the element shows `expected` correctly rounded to the nearest rupee.
 *
 * The app shows whole rupees while expected values are computed at full precision, so a
 * correct display is always within ₹0.50 of the expected value (`toBeCloseTo(x, 0)`).
 * Anything further off is a real difference, not rounding.
 * Polling covers the short gap between changing an input and the result re-rendering.
 */
export async function expectRupees(locator: Locator, expected: number, label: string): Promise<void> {
  await expect
    .poll(async () => parseRupees(await locator.textContent()), {
      message: `${label} should be ₹${expected.toFixed(2)} rounded to the nearest rupee`,
    })
    .toBeCloseTo(expected, 0);
}

/** Same check for a value already read from the page (e.g. a table cell). */
export function expectRupeeText(text: string | null, expected: number, label: string): void {
  expect(
    parseRupees(text),
    `${label} should be ₹${expected.toFixed(2)} rounded to the nearest rupee`,
  ).toBeCloseTo(expected, 0);
}

/** Formats a number the way the user reads it: ₹25,00,000 (Indian digit grouping). */
export function formatRupees(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}
