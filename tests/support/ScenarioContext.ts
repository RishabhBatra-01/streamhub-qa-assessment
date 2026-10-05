import type { APIResponse } from '@playwright/test';
import type { PostRequest } from '../api/postPayloads';
import type { LoanTypeName } from '../pages/DashboardPage';
import type { FirstEmi, Loan } from '../utils/loanMath';

/**
 * State shared between the steps of ONE scenario (a fresh instance per scenario),
 * e.g. the loan a "When I enter ..." step typed in, or the response of a request step,
 * which later "Then ..." steps check.
 */
export class ScenarioContext {
  /** The selected loan-type tab; the calculator opens on Home Loan. */
  loanType: LoanTypeName = 'Home Loan';
  private enteredLoan?: Loan;
  private firstEmiMonth?: FirstEmi;

  set loan(loan: Loan) {
    this.enteredLoan = loan;
  }

  get loan(): Loan {
    if (!this.enteredLoan) throw new Error('No loan entered yet: a step that enters a loan must run first.');
    return this.enteredLoan;
  }

  set firstEmi(firstEmi: FirstEmi) {
    this.firstEmiMonth = firstEmi;
  }

  get firstEmi(): FirstEmi {
    if (!this.firstEmiMonth)
      throw new Error('No EMI start month set yet: a step that sets it must run first.');
    return this.firstEmiMonth;
  }

  /** Error from a "When I try to run ..." SQL step (null if the statement succeeded). */
  sqlError?: string | null;
  /** The request a "When I send ..." step sent, so "Then" steps can compare the echo. */
  sentPost?: PostRequest;
  private response?: APIResponse;
  private responseBody?: string;

  async setResponse(response: APIResponse): Promise<void> {
    this.response = response;
    // Read the body once, straight away: it is needed by several steps and can only be
    // fetched while the request context is alive.
    this.responseBody = await response.text();
  }

  get lastResponse(): APIResponse {
    if (!this.response) throw new Error('No API response yet: a request step must run first.');
    return this.response;
  }

  get lastResponseText(): string {
    if (this.responseBody === undefined)
      throw new Error('No API response yet: a request step must run first.');
    return this.responseBody;
  }

  /** The response body parsed as JSON; fails with the raw body if it is not JSON. */
  lastResponseJson<T = unknown>(): T {
    try {
      return JSON.parse(this.lastResponseText) as T;
    } catch {
      throw new Error(`Response body is not valid JSON:\n${this.lastResponseText.slice(0, 500)}`);
    }
  }
}
