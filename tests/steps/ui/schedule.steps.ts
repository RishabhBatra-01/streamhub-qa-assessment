import { expect } from '@playwright/test';
import { Then, When } from '../../support/fixtures';
import { calendarYears, totalsFor, yearlySchedule } from '../../utils/loanMath';
import { expectRupeeText, expectRupees, parsePercent, parseRupees } from '../../utils/money';

Then('the schedule EMI matches my own calculation', async ({ schedulePage, scenario }) => {
  await expectRupees(schedulePage.emiValue, totalsFor(scenario.loan).emi, 'Schedule EMI');
});

Then('the table has a row for each calendar year of the loan', async ({ schedulePage, scenario }) => {
  const years = calendarYears(scenario.loan, scenario.firstEmi).map(String);
  await expect(schedulePage.table).toHaveAccessibleName('Year-wise payment schedule');
  await expect(schedulePage.tableRows.getByRole('rowheader')).toHaveText(years);
});

Then('every row of the table matches my own calculation', async ({ schedulePage, scenario }) => {
  const expectedRows = yearlySchedule(scenario.loan, scenario.firstEmi);
  const shownRows = await schedulePage.readTable();
  expect(shownRows).toHaveLength(expectedRows.length);

  for (const [index, expected] of expectedRows.entries()) {
    const shown = shownRows[index]!;
    expect(shown.period).toBe(String(expected.year));
    expectRupeeText(shown.principal, expected.principal, `${expected.year} principal`);
    expectRupeeText(shown.interest, expected.interest, `${expected.year} interest`);
    expectRupeeText(shown.totalPayment, expected.totalPayment, `${expected.year} total payment`);
    expectRupeeText(shown.balance, expected.balance, `${expected.year} balance`);
    expect(parsePercent(shown.paidToDate), `${expected.year} loan paid`).toBeCloseTo(expected.paidPercent, 2);
  }
});

Then('the last row shows the loan fully paid', async ({ schedulePage }) => {
  const lastRow = (await schedulePage.readTable()).at(-1);
  expect(lastRow?.balance).toBe('₹0');
  expect(lastRow?.paidToDate).toBe('100.00%');
});

When('I choose the month-wise breakdown for {int}', async ({ schedulePage }, year: number) => {
  await schedulePage.showMonthWise(year);
  await expect(schedulePage.table).toHaveAccessibleName(`Month-wise payment schedule for ${year}`);
});

When('I choose the year-wise breakdown', async ({ schedulePage }) => {
  await schedulePage.showYearWise();
  await expect(schedulePage.table).toHaveAccessibleName('Year-wise payment schedule');
});

Then(
  'the table shows {int} monthly rows from {string} to {string}',
  async ({ schedulePage }, count: number, first: string, last: string) => {
    const periods = schedulePage.tableRows.getByRole('rowheader');
    await expect(periods).toHaveCount(count);
    await expect(periods.first()).toHaveText(first);
    await expect(periods.last()).toHaveText(last);
  },
);

Then('every monthly payment equals the EMI', async ({ schedulePage, scenario }) => {
  const { emi } = totalsFor(scenario.loan);
  for (const row of await schedulePage.readTable()) {
    expectRupeeText(row.totalPayment, emi, `${row.period} payment`);
    // Within a month, principal + interest = payment (each rounded, so allow ₹1).
    const sum = parseRupees(row.principal) + parseRupees(row.interest);
    expect(
      Math.abs(sum - parseRupees(row.totalPayment)),
      `${row.period} principal + interest`,
    ).toBeLessThanOrEqual(1);
  }
});

Then('the first EMI is still {string} {int}', async ({ schedulePage }, month: string, year: number) => {
  await expect(schedulePage.startMonthSelect.locator('option:checked')).toHaveText(month);
  await expect(schedulePage.startYearSelect).toHaveValue(String(year));
});
