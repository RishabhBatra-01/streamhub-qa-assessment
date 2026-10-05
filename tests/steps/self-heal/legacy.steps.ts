import { expect } from '@playwright/test';
import { Then, When } from '../../support/fixtures';

Then('the legacy {string} shows {string}', async ({ legacyDashboardPage }, item: string, value: string) => {
  const locators = {
    'monthly EMI': () => legacyDashboardPage.monthlyEmi(),
    'total interest': () => legacyDashboardPage.totalInterestValue(),
  } as const;
  if (!(item in locators)) throw new Error(`Unknown legacy item "${item}"`);
  await expect(await locators[item as keyof typeof locators]()).toHaveText(value);
});

When('I type {string} into the legacy interest rate box', async ({ legacyDashboardPage }, value: string) => {
  await (await legacyDashboardPage.interestRateInput()).fill(value);
});

When('I type {string} into the legacy loan tenure box', async ({ legacyDashboardPage }, value: string) => {
  await (await legacyDashboardPage.loanTenureInput()).fill(value);
});

When('I click the legacy personal loan tab', async ({ legacyDashboardPage }) => {
  await (await legacyDashboardPage.personalLoanTab()).click();
});
