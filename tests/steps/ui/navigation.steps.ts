import { expect } from '@playwright/test';
import { Given, Then, When } from '../../support/fixtures';
import { formatRupees } from '../../utils/money';

Given('I open the EMI calculator', async ({ dashboardPage }) => {
  await dashboardPage.open();
  await expect(dashboardPage.heading('EMI Calculator')).toBeVisible();
});

Then('I see the {string} page', async ({ dashboardPage }, title: string) => {
  await expect(dashboardPage.heading(title)).toBeVisible();
  await dashboardPage.expectTitleContains(title);
});

When('I go to {string} using the main menu', async ({ dashboardPage }, linkName: string) => {
  await dashboardPage.navLink(linkName).click();
  await expect(dashboardPage.navLink(linkName)).toHaveAttribute('aria-current', 'page');
});

When('I open the payment schedule', async ({ dashboardPage, schedulePage }) => {
  await dashboardPage.goToSchedule();
  await expect(schedulePage.heading('Payment Schedule')).toBeVisible();
});

When('I reload the page', async ({ page }) => {
  await page.reload();
});

Then('the schedule describes the loan I entered', async ({ schedulePage, scenario }) => {
  const { amount, ratePercent, tenureYears } = scenario.loan;
  const years = tenureYears === 1 ? 'year' : 'years';
  await expect(schedulePage.loanDescription).toContainText(
    `${scenario.loanType} of ${formatRupees(amount)} at ${ratePercent}% for ${tenureYears} ${years}`,
  );
});
