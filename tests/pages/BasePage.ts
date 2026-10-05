import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared behaviour for every page object.
 *
 * Locator rules for this framework (see README):
 *   1. getByRole / getByLabel / getByText: what a user (or screen reader) sees.
 *   2. getByTestId: for values with no accessible name of their own (numbers in cards, charts).
 *   3. Never positional CSS/XPath (nth-child, //div[3]/span), which breaks when the layout changes.
 */
export abstract class BasePage {
  /** Path of this page, relative to the configured baseURL. */
  protected abstract readonly path: string;

  readonly mainNav: Locator;

  constructor(protected readonly page: Page) {
    this.mainNav = page.getByRole('navigation', { name: 'Main' });
  }

  /** Opens the page, optionally with query parameters (e.g. a loan to deep-link to). */
  async open(query?: Record<string, string | number>): Promise<void> {
    const search = query
      ? `?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`
      : '';
    await this.page.goto(`${this.path}${search}`);
  }

  heading(name: string): Locator {
    return this.page.getByRole('heading', { level: 1, name });
  }

  navLink(name: string): Locator {
    return this.mainNav.getByRole('link', { name });
  }

  async expectTitleContains(text: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(text));
  }
}
