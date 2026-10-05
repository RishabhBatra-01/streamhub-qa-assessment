import { expect } from '@playwright/test';
import { Then, When } from '../../support/fixtures';

When('I type {string} into the {string} box', async ({ dashboardPage }, value: string, field: string) => {
  await dashboardPage.setField(field, value);
});

Then(
  'the {string} box is marked invalid with the message {string}',
  async ({ dashboardPage, page }, field: string, message: string) => {
    const input = dashboardPage.input(field);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    // The message is linked to the box (aria-describedby), so screen readers announce it too.
    await expect(input).toHaveAccessibleDescription(message);
    await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
  },
);

Then('the {string} box is valid', async ({ dashboardPage }, field: string) => {
  await expect(dashboardPage.input(field)).not.toHaveAttribute('aria-invalid');
});

Then('the results are replaced by the message {string}', async ({ dashboardPage }, message: string) => {
  await expect(dashboardPage.resultsPlaceholder).toHaveText(message);
  await expect(dashboardPage.summary).toBeHidden();
  await expect(dashboardPage.pieChart).toBeHidden();
});
