import type { APIResponse } from '@playwright/test';

/**
 * State shared between the steps of ONE scenario (a fresh instance per scenario),
 * e.g. the response of a "When I send ..." step that later "Then ..." steps check.
 */
export class ScenarioContext {
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
