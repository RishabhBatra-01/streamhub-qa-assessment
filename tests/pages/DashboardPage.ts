import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** The EMI calculator (dashboard) page. */
export class DashboardPage extends BasePage {
  protected readonly path = '/';

  readonly loanTypeTabs: Locator;
  readonly summary: Locator;
  readonly pieChart: Locator;

  constructor(page: Page) {
    super(page);
    this.loanTypeTabs = page.getByRole('tablist', { name: 'Loan type' });
    this.summary = page.getByLabel('Loan summary');
    this.pieChart = page.getByRole('figure', { name: 'Break-up of Total Payment' });
  }
}
