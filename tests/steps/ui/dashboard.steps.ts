import { expect } from '@playwright/test';
import { Given, Then } from '../../support/fixtures';

Given('I open the EMI calculator', async ({ dashboardPage }) => {
  await dashboardPage.open();
});

Then('I see the {string} page', async ({ dashboardPage }, title: string) => {
  await expect(dashboardPage.heading(title)).toBeVisible();
  await dashboardPage.expectTitleContains(title);
});

Then('I see the loan type tabs', async ({ dashboardPage }) => {
  await expect(dashboardPage.loanTypeTabs).toBeVisible();
});

Then('I see the loan summary', async ({ dashboardPage }) => {
  await expect(dashboardPage.summary).toBeVisible();
});

Then('I see the payment break-up chart', async ({ dashboardPage }) => {
  await expect(dashboardPage.pieChart).toBeVisible();
});
