import { expect } from '@playwright/test';
import type { LoanTypeName } from '../../pages/DashboardPage';
import { Then, When } from '../../support/fixtures';
import { totalsFor } from '../../utils/loanMath';
import { expectRupees, parsePercent, parseRupees } from '../../utils/money';

When('I select the {string} tab', async ({ dashboardPage, scenario }, loanType: LoanTypeName) => {
  await dashboardPage.selectLoanType(loanType);
  scenario.loanType = loanType;
});

When(
  'I enter a loan of {int} at {float}% for {int} years',
  async ({ dashboardPage, scenario }, amount: number, ratePercent: number, tenureYears: number) => {
    await dashboardPage.enterLoan(amount, ratePercent, tenureYears);
    scenario.loan = { amount, ratePercent, tenureYears };
  },
);

Then(
  'the form shows a loan of {int} at {float}% for {int} years',
  async ({ dashboardPage, scenario }, amount: number, ratePercent: number, tenureYears: number) => {
    await expect(dashboardPage.input('amount')).toHaveValue(String(amount));
    await expect(dashboardPage.input('Interest Rate')).toHaveValue(String(ratePercent));
    await expect(dashboardPage.input('Loan Tenure')).toHaveValue(String(tenureYears));
    // These are now the loan on screen, so later steps check results against them.
    scenario.loan = { amount, ratePercent, tenureYears };
  },
);

Then('the monthly EMI matches my own calculation', async ({ dashboardPage, scenario }) => {
  await expectRupees(dashboardPage.emiValue, totalsFor(scenario.loan).emi, 'Monthly EMI');
});

Then('the total interest matches my own calculation', async ({ dashboardPage, scenario }) => {
  await expectRupees(
    dashboardPage.totalInterestValue,
    totalsFor(scenario.loan).totalInterest,
    'Total interest',
  );
});

Then('the total payment matches my own calculation', async ({ dashboardPage, scenario }) => {
  await expectRupees(dashboardPage.totalPaymentValue, totalsFor(scenario.loan).totalPayment, 'Total payment');
});

Then('the total payment is the loan amount plus the total interest', async ({ dashboardPage, scenario }) => {
  const totalInterest = parseRupees(await dashboardPage.totalInterestValue.textContent());
  const totalPayment = parseRupees(await dashboardPage.totalPaymentValue.textContent());
  // Each shown value is rounded separately, so their sum may differ by ₹1.
  expect(Math.abs(totalPayment - (scenario.loan.amount + totalInterest))).toBeLessThanOrEqual(1);
});

Then(
  'the summary shows an EMI of {string}, total interest of {string} and total payment of {string}',
  async ({ dashboardPage }, emi: string, totalInterest: string, totalPayment: string) => {
    await expect(dashboardPage.emiValue).toHaveText(emi);
    await expect(dashboardPage.totalInterestValue).toHaveText(totalInterest);
    await expect(dashboardPage.totalPaymentValue).toHaveText(totalPayment);
  },
);

Then('I see the loan type tabs', async ({ dashboardPage }) => {
  await expect(dashboardPage.loanTypeTabs).toBeVisible();
  await expect(dashboardPage.loanTypeTabs.getByRole('tab')).toHaveText([
    'Home Loan',
    'Personal Loan',
    'Car Loan',
  ]);
});

Then('I see the loan summary', async ({ dashboardPage }) => {
  await expect(dashboardPage.summary).toBeVisible();
  for (const value of [
    dashboardPage.emiValue,
    dashboardPage.totalInterestValue,
    dashboardPage.totalPaymentValue,
  ]) {
    await expect(value).toHaveText(/^₹[\d,]+$/);
  }
});

Then('I see the loan at a glance', async ({ dashboardPage }) => {
  await expect(dashboardPage.glance).toBeVisible();
  await expect(dashboardPage.viewScheduleLink).toBeVisible();
});

Then(
  'the loan at a glance shows the {string} with {int} EMIs',
  async ({ dashboardPage }, loanType: string, emiCount: number) => {
    await expect(dashboardPage.glanceValue('loan-type')).toHaveText(loanType);
    await expect(dashboardPage.glanceValue('emi-count')).toHaveText(String(emiCount));
  },
);

Then(
  'the interest as a share of the principal matches my own calculation',
  async ({ dashboardPage, scenario }) => {
    const expected = (totalsFor(scenario.loan).totalInterest / scenario.loan.amount) * 100;
    // Shown with one decimal place, so it must be within 0.05 percentage points.
    await expect
      .poll(async () => parsePercent(await dashboardPage.glanceValue('interest-ratio').textContent()))
      .toBeCloseTo(expected, 1);
  },
);

When(
  'I press the right arrow key {int} times on the {string} slider',
  async ({ dashboardPage }, times: number, field: string) => {
    await dashboardPage.nudgeSlider(field, 'ArrowRight', times);
  },
);

Then('the interest rate is now {float}%', async ({ dashboardPage, scenario }, ratePercent: number) => {
  await expect(dashboardPage.input('Interest Rate')).toHaveValue(String(ratePercent));
  await expect(dashboardPage.slider('Interest Rate')).toHaveValue(String(ratePercent));
  scenario.loan = { ...scenario.loan, ratePercent };
});
