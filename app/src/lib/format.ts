const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const plainNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** ₹ amount rounded to the nearest rupee, in Indian grouping: ₹25,00,000. */
export function formatRupees(value: number): string {
  return rupees.format(Math.round(value));
}

export function formatNumber(value: number): string {
  return plainNumber.format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Short Indian-style amount for helper text: 25 Lakh, 1.5 Crore. */
export function formatIndianWords(value: number): string {
  if (value >= 1_00_00_000) return `${formatNumber(value / 1_00_00_000)} Crore`;
  if (value >= 1_00_000) return `${formatNumber(value / 1_00_000)} Lakh`;
  if (value >= 1_000) return `${formatNumber(value / 1_000)} Thousand`;
  return formatNumber(value);
}

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}
