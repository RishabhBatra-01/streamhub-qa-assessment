import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type BarSeries = 'principal' | 'interest';

export interface ScheduleRow {
  /** "2027" in the year-wise view, "Jan 2027" in the month-wise view. */
  period: string;
  principal: string;
  interest: string;
  totalPayment: string;
  balance: string;
  paidToDate: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The payment schedule (report) page. */
export class SchedulePage extends BasePage {
  protected readonly path = '/schedule';

  readonly loanDescription: Locator;
  readonly emiValue: Locator;
  readonly changeLoanLink: Locator;
  readonly startMonthSelect: Locator;
  readonly startYearSelect: Locator;
  readonly breakdownSelect: Locator;
  readonly barChart: Locator;
  readonly tooltip: Locator;
  readonly table: Locator;
  /** Body rows only: every data row starts with a row header (the year or month). */
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.loanDescription = page.getByTestId('loan-description');
    this.emiValue = page.getByTestId('schedule-emi');
    this.changeLoanLink = page.getByRole('link', { name: 'Change loan details' });
    this.startMonthSelect = page.getByLabel('Start month');
    this.startYearSelect = page.getByLabel('Start year');
    this.breakdownSelect = page.getByLabel('Breakdown');
    this.barChart = page.getByRole('figure', { name: 'Year-wise Principal, Interest and Balance' });
    this.tooltip = page.getByTestId('bar-chart-tooltip');
    this.table = page.getByRole('table', { name: /payment schedule/ });
    this.tableRows = this.table.getByRole('row').filter({ has: page.getByRole('rowheader') });
  }

  /** Picks the first-EMI month, e.g. ("Jun", 2026), with the two dropdowns. */
  async setStartMonth(month: string, year: number): Promise<void> {
    if (!MONTHS.includes(month)) throw new Error(`Unknown month "${month}", use one of ${MONTHS.join(', ')}`);
    await this.startMonthSelect.selectOption({ label: month });
    await this.startYearSelect.selectOption({ label: String(year) });
  }

  async showMonthWise(year: number): Promise<void> {
    await this.breakdownSelect.selectOption(String(year));
  }

  async showYearWise(): Promise<void> {
    await this.breakdownSelect.selectOption('all');
  }

  /** All bar segments of one series (one per calendar year). */
  bars(series: BarSeries): Locator {
    return this.barChart.getByTestId(new RegExp(`^bar-${series}-\\d{4}$`));
  }

  bar(series: BarSeries, year: number): Locator {
    return this.barChart.getByTestId(`bar-${series}-${year}`);
  }

  async hoverBar(year: number): Promise<void> {
    await this.bar('principal', year).hover();
  }

  tooltipValue(item: 'year' | 'principal' | 'interest' | 'total' | 'balance' | 'loan-paid'): Locator {
    return this.tooltip.getByTestId(`tooltip-${item}`);
  }

  async readTable(): Promise<ScheduleRow[]> {
    const rows: ScheduleRow[] = [];
    for (const row of await this.tableRows.all()) {
      const period = (await row.getByRole('rowheader').textContent()) ?? '';
      const cells = await row.getByRole('cell').allTextContents();
      if (cells.length !== 5)
        throw new Error(`Expected 5 cells in the "${period}" row, found ${cells.length}`);
      const [principal, interest, totalPayment, balance, paidToDate] = cells as [
        string,
        string,
        string,
        string,
        string,
      ];
      rows.push({ period, principal, interest, totalPayment, balance, paidToDate });
    }
    return rows;
  }
}
