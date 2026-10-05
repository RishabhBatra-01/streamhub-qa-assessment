/**
 * Shapes of the files the self-healing runtime writes and the healer CLI reads.
 * Type-only, so the CLI (run directly by Node) can import it.
 */
import type { LocatorSpec } from './locatorSpec';

export type LocatorProblem = 'not-found' | 'ambiguous';

export interface TestIdElement {
  testId: string;
  tag: string;
  text: string;
}

/** Written when a registered locator does not match exactly one element. */
export interface HealingIncident {
  key: string;
  intent: string;
  spec: LocatorSpec;
  specText: string;
  problem: LocatorProblem;
  matchCount: number;
  url: string;
  pageTitle: string;
  /** Scenario title: used to re-run exactly this scenario when validating a fix. */
  scenarioTitle: string;
  featureFile: string;
  /** Playwright ARIA snapshot of the page at the moment of failure. */
  ariaSnapshot: string;
  testIdElements: TestIdElement[];
  screenshotFile: string;
  recordedAt: string;
}

/** Written when a locator (usually a candidate fix) resolves to exactly one element. */
export interface LocatorMatch {
  key: string;
  spec: LocatorSpec;
  specText: string;
  overridden: boolean;
  element: { tag: string; text: string; ariaSnapshot: string };
}
