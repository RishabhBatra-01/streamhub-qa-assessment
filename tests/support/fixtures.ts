import type { Page, TestInfo } from '@playwright/test';
import { createBdd, test as base } from 'playwright-bdd';
import { PostsApiClient } from '../api/PostsApiClient';
import { DashboardPage } from '../pages/DashboardPage';
import { ScenarioContext } from './ScenarioContext';

interface Fixtures {
  /** State shared between the steps of one scenario. */
  scenario: ScenarioContext;
  /** Collects uncaught errors from the page; a UI scenario fails if the app throws. */
  pageErrors: string[];
  dashboardPage: DashboardPage;
  postsApi: PostsApiClient;
}

async function attachPageErrors(page: Page, testInfo: TestInfo, errors: string[]): Promise<void> {
  if (errors.length === 0) return;
  await testInfo.attach('browser-errors', { body: errors.join('\n\n'), contentType: 'text/plain' });
  // Only fail a test that would otherwise pass, so the original failure is not hidden.
  if (testInfo.status === testInfo.expectedStatus && !page.isClosed()) {
    throw new Error(`The page reported ${errors.length} uncaught error(s):\n${errors.join('\n')}`);
  }
}

/**
 * The project's `test`: Playwright's test plus page objects and API clients as fixtures.
 * Fixtures are created lazily, so API scenarios never launch a browser.
 */
export const test = base.extend<Fixtures>({
  scenario: async ({}, use) => {
    await use(new ScenarioContext());
  },
  pageErrors: async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    });
    await use(errors);
    await attachPageErrors(page, testInfo, errors);
  },
  dashboardPage: async ({ page, pageErrors }, use) => {
    void pageErrors;
    await use(new DashboardPage(page));
  },
  postsApi: async ({ request }, use) => {
    await use(new PostsApiClient(request));
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
