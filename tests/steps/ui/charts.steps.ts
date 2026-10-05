import { expect, type Locator } from '@playwright/test';
import { Then, When } from '../../support/fixtures';
import { calendarYears, totalsFor, yearlySchedule } from '../../utils/loanMath';
import { expectRupees, parsePercent, parseRupees } from '../../utils/money';

/** A chart shape is "drawn" when it has SVG path data and a visible, non-zero size on screen. */
async function expectDrawn(shape: Locator, label: string): Promise<void> {
  await expect(shape, `${label} should be visible`).toBeVisible();
  await expect(shape, `${label} should have path data`).toHaveAttribute('d', /\d/);
  const box = await shape.boundingBox();
  expect(box?.width ?? 0, `${label} width on screen`).toBeGreaterThan(0);
  expect(box?.height ?? 0, `${label} height on screen`).toBeGreaterThan(0);
}

/** The value a chart shape represents, from its data-value attribute. */
async function shapeValue(shape: Locator): Promise<number> {
  const raw = await shape.getAttribute('data-value');
  const value = Number(raw);
  if (raw === null || !Number.isFinite(value))
    throw new Error(`Chart shape has no numeric data-value: "${raw}"`);
  return value;
}

// ---------- Pie chart (dashboard) ----------

Then('I see the payment break-up chart', async ({ dashboardPage }) => {
  await expect(dashboardPage.pieChart).toBeVisible();
});

Then(
  'the pie chart has {int} drawn slices, each with a value greater than zero',
  async ({ dashboardPage }, count: number) => {
    await expect(dashboardPage.pieSlices).toHaveCount(count);
    for (const [index, slice] of (await dashboardPage.pieSlices.all()).entries()) {
      await expectDrawn(slice, `Pie slice ${index + 1}`);
      expect(await shapeValue(slice), `Pie slice ${index + 1} value`).toBeGreaterThan(0);
    }
    for (const slice of ['principal', 'interest'] as const) {
      expect(parseRupees(await dashboardPage.pieLegendValue(slice).textContent())).toBeGreaterThan(0);
    }
  },
);

Then('the principal slice equals the loan amount', async ({ dashboardPage, scenario }) => {
  expect(await shapeValue(dashboardPage.pieSlice('principal'))).toBe(scenario.loan.amount);
  await expectRupees(dashboardPage.pieLegendValue('principal'), scenario.loan.amount, 'Principal in legend');
});

Then('the interest slice equals my own total interest', async ({ dashboardPage, scenario }) => {
  const { totalInterest } = totalsFor(scenario.loan);
  expect(await shapeValue(dashboardPage.pieSlice('interest'))).toBeCloseTo(totalInterest, 0);
  await expectRupees(dashboardPage.pieLegendValue('interest'), totalInterest, 'Interest in legend');
});

Then('the slice shares add up to 100%', async ({ dashboardPage }) => {
  const principalShare = parsePercent(await dashboardPage.pieLegendShare('principal').textContent());
  const interestShare = parsePercent(await dashboardPage.pieLegendShare('interest').textContent());
  // Each share is rounded to one decimal place, so the sum can be off by 0.1.
  expect(Math.abs(principalShare + interestShare - 100)).toBeLessThanOrEqual(0.1);
});

// ---------- Bar chart (payment schedule) ----------

When(
  'I set the first EMI to {string} {int}',
  async ({ schedulePage, scenario, page }, month: string, year: number) => {
    await schedulePage.setStartMonth(month, year);
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;
    scenario.firstEmi = { month: monthNumber, year };
    // The page keeps the start month in its URL; wait for it before checking the charts.
    await expect(page).toHaveURL(new RegExp(`start=${year}-${String(monthNumber).padStart(2, '0')}`));
  },
);

Then('I see the year-wise bar chart', async ({ schedulePage }) => {
  await expect(schedulePage.barChart).toBeVisible();
});

Then(
  'the bar chart shows {int} bars, one for each calendar year of the loan',
  async ({ schedulePage, scenario }, bars: number) => {
    // The feature states the count; the tests' own maths must agree with it.
    expect(calendarYears(scenario.loan, scenario.firstEmi)).toHaveLength(bars);
    // Each bar is a stack of a principal segment and an interest segment.
    await expect(schedulePage.bars('principal')).toHaveCount(bars);
    await expect(schedulePage.bars('interest')).toHaveCount(bars);
  },
);

Then('every bar has a value greater than zero and is drawn on screen', async ({ schedulePage, scenario }) => {
  for (const year of calendarYears(scenario.loan, scenario.firstEmi)) {
    for (const series of ['principal', 'interest'] as const) {
      const bar = schedulePage.bar(series, year);
      await expectDrawn(bar, `${year} ${series} bar`);
      expect(await shapeValue(bar), `${year} ${series} bar value`).toBeGreaterThan(0);
    }
  }
});

Then('every bar matches my own calculation for its year', async ({ schedulePage, scenario }) => {
  for (const expected of yearlySchedule(scenario.loan, scenario.firstEmi)) {
    // data-value holds whole rupees, so a correct value is within ₹0.50 of the exact figure.
    expect(await shapeValue(schedulePage.bar('principal', expected.year))).toBeCloseTo(expected.principal, 0);
    expect(await shapeValue(schedulePage.bar('interest', expected.year))).toBeCloseTo(expected.interest, 0);
  }
});

When('I hover over the bar for {int}', async ({ schedulePage }, year: number) => {
  await schedulePage.hoverBar(year);
  await expect(schedulePage.tooltip).toBeVisible();
});

Then(
  'the tooltip shows the figures for {int} from my own calculation',
  async ({ schedulePage, scenario }, year: number) => {
    const expected = yearlySchedule(scenario.loan, scenario.firstEmi).find((row) => row.year === year);
    if (!expected) throw new Error(`${year} is not a year of this loan`);

    await expect(schedulePage.tooltipValue('year')).toHaveText(`Year: ${year}`);
    await expectRupees(schedulePage.tooltipValue('principal'), expected.principal, `${year} principal`);
    await expectRupees(schedulePage.tooltipValue('interest'), expected.interest, `${year} interest`);
    await expectRupees(schedulePage.tooltipValue('total'), expected.totalPayment, `${year} total payment`);
    await expectRupees(schedulePage.tooltipValue('balance'), expected.balance, `${year} balance`);
    expect(parsePercent(await schedulePage.tooltipValue('loan-paid').textContent())).toBeCloseTo(
      expected.paidPercent,
      2,
    );
  },
);
