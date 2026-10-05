import type { Locator, Page, TestInfo } from '@playwright/test';
import { findLegacy } from '../self-heal/healingLocator';

/**
 * ⚠️ A page object written against an OLDER version of the dashboard. All of its locators
 * come from tests/self-heal/legacyLocators.ts and are DELIBERATELY BROKEN, for the AI
 * self-healing exercise. Only the @self-heal scenarios use it (npm run test:self-heal);
 * the real page object is DashboardPage.
 */
export class LegacyDashboardPage {
  constructor(
    private readonly page: Page,
    private readonly testInfo: TestInfo,
  ) {}

  monthlyEmi(): Promise<Locator> {
    return findLegacy(this.page, this.testInfo, 'monthlyEmi');
  }

  interestRateInput(): Promise<Locator> {
    return findLegacy(this.page, this.testInfo, 'interestRateInput');
  }

  personalLoanTab(): Promise<Locator> {
    return findLegacy(this.page, this.testInfo, 'personalLoanTab');
  }

  loanTenureInput(): Promise<Locator> {
    return findLegacy(this.page, this.testInfo, 'loanTenureInput');
  }

  totalInterestValue(): Promise<Locator> {
    return findLegacy(this.page, this.testInfo, 'totalInterestValue');
  }
}
