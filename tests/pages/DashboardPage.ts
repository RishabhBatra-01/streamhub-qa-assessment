import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type LoanTypeName = 'Home Loan' | 'Personal Loan' | 'Car Loan';
/**
 * A form field, named by its visible label ("Interest Rate", "Loan Tenure", "Home Loan Amount").
 * 'amount' means the amount field of whichever loan type is selected.
 */
export type LoanField = string;
export type PieSlice = 'principal' | 'interest';

/** The EMI calculator (dashboard) page. */
export class DashboardPage extends BasePage {
  protected readonly path = '/';

  readonly loanTypeTabs: Locator;
  readonly loanForm: Locator;
  readonly summary: Locator;
  readonly emiValue: Locator;
  readonly totalInterestValue: Locator;
  readonly totalPaymentValue: Locator;
  readonly resultsPlaceholder: Locator;
  readonly pieChart: Locator;
  readonly pieSlices: Locator;
  readonly glance: Locator;
  readonly viewScheduleLink: Locator;

  constructor(page: Page) {
    super(page);
    this.loanTypeTabs = page.getByRole('tablist', { name: 'Loan type' });
    this.loanForm = page.getByRole('form', { name: 'Loan details' });
    this.summary = page.getByLabel('Loan summary');
    this.emiValue = page.getByTestId('emi-value');
    this.totalInterestValue = page.getByTestId('total-interest-value');
    this.totalPaymentValue = page.getByTestId('total-payment-value');
    this.resultsPlaceholder = page.getByRole('status');
    this.pieChart = page.getByRole('figure', { name: 'Break-up of Total Payment' });
    this.pieSlices = this.pieChart.getByTestId(/^pie-slice-/);
    this.glance = page.getByRole('region', { name: 'Loan at a Glance' });
    this.viewScheduleLink = page.getByRole('link', { name: 'View payment schedule' });
  }

  tab(name: LoanTypeName): Locator {
    return this.loanTypeTabs.getByRole('tab', { name });
  }

  async selectLoanType(name: LoanTypeName): Promise<void> {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * The number box for a field. The amount label depends on the loan type
   * ("Home Loan Amount", "Car Loan Amount"), so it is matched by its ending.
   */
  input(field: LoanField): Locator {
    const name = field === 'amount' ? /Loan Amount$/ : field;
    return this.loanForm.getByRole('spinbutton', { name, exact: true });
  }

  slider(field: LoanField): Locator {
    const name = field === 'amount' ? /Loan Amount slider$/ : `${field} slider`;
    return this.loanForm.getByRole('slider', { name, exact: true });
  }

  /** Types a value into a field's number box, replacing what was there. */
  async setField(field: LoanField, value: string): Promise<void> {
    await this.input(field).fill(value);
  }

  async enterLoan(amount: number, ratePercent: number, tenureYears: number): Promise<void> {
    await this.setField('amount', String(amount));
    await this.setField('Interest Rate', String(ratePercent));
    await this.setField('Loan Tenure', String(tenureYears));
  }

  /** Moves a slider with the keyboard, the way a keyboard user would. */
  async nudgeSlider(field: LoanField, key: 'ArrowRight' | 'ArrowLeft', times: number): Promise<void> {
    const slider = this.slider(field);
    await slider.focus();
    for (let i = 0; i < times; i++) await slider.press(key);
  }

  pieSlice(slice: PieSlice): Locator {
    return this.pieChart.getByTestId(`pie-slice-${slice}`);
  }

  pieLegendValue(slice: PieSlice): Locator {
    return this.pieChart.getByTestId(`pie-value-${slice}`);
  }

  pieLegendShare(slice: PieSlice): Locator {
    return this.pieChart.getByTestId(`pie-share-${slice}`);
  }

  glanceValue(item: 'loan-type' | 'emi-count' | 'interest-ratio' | 'first-emi' | 'last-emi'): Locator {
    return this.glance.getByTestId(`glance-${item}`);
  }

  async goToSchedule(): Promise<void> {
    await this.viewScheduleLink.click();
  }
}
