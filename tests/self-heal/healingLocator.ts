import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import type { HealingIncident, LocatorMatch, TestIdElement } from './incident';
import { LEGACY_LOCATORS, type LegacyLocatorKey } from './legacyLocators';
import { describeSpec, rejectReason, toLocator, type LocatorSpec } from './locatorSpec';

/** Where incidents and match evidence are written (read by `npm run self-heal`). */
export const SELF_HEAL_DIR = path.resolve(process.env.SELF_HEAL_DIR ?? 'reports/self-heal');
const LOOKUP_TIMEOUT_MS = 5_000;
const MAX_SNAPSHOT_CHARS = 15_000;

export class BrokenLocatorError extends Error {
  constructor(
    message: string,
    readonly incident: HealingIncident,
  ) {
    super(message);
    this.name = 'BrokenLocatorError';
  }
}

/**
 * Candidate fixes are tried WITHOUT editing source files: the healer passes them in
 * SELF_HEAL_OVERRIDES as JSON, e.g. {"monthlyEmi": {"testId": "emi-value"}}.
 */
function overrideFor(key: string): LocatorSpec | undefined {
  const raw = process.env.SELF_HEAL_OVERRIDES;
  if (!raw) return undefined;
  const overrides = JSON.parse(raw) as Record<string, unknown>;
  if (!(key in overrides)) return undefined;
  const reason = rejectReason(overrides[key]);
  if (reason) throw new Error(`Invalid SELF_HEAL_OVERRIDES entry for "${key}": ${reason}`);
  return overrides[key] as LocatorSpec;
}

function safeFileName(value: string): string {
  return value
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function writeJson(subDir: string, name: string, data: unknown): string {
  const dir = path.join(SELF_HEAL_DIR, subDir);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${safeFileName(name)}.json`);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

async function collectTestIds(page: Page): Promise<TestIdElement[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-testid]')].slice(0, 200).map((element) => ({
      testId: element.dataset.testid ?? '',
      tag: element.tagName.toLowerCase(),
      text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
    })),
  );
}

async function recordIncident(
  page: Page,
  testInfo: TestInfo,
  key: string,
  intent: string,
  spec: LocatorSpec,
  matchCount: number,
): Promise<HealingIncident> {
  const screenshotDir = path.join(SELF_HEAL_DIR, 'screenshots');
  mkdirSync(screenshotDir, { recursive: true });
  const screenshotFile = path.join(screenshotDir, `${safeFileName(key)}.png`);
  await page.screenshot({ path: screenshotFile, fullPage: true });

  const incident: HealingIncident = {
    key,
    intent,
    spec,
    specText: describeSpec(spec),
    problem: matchCount === 0 ? 'not-found' : 'ambiguous',
    matchCount,
    url: page.url(),
    pageTitle: await page.title(),
    scenarioTitle: testInfo.title,
    featureFile: path.relative(process.cwd(), testInfo.file),
    ariaSnapshot: (await page.locator('body').ariaSnapshot()).slice(0, MAX_SNAPSHOT_CHARS),
    testIdElements: await collectTestIds(page),
    screenshotFile: path.relative(process.cwd(), screenshotFile),
    recordedAt: new Date().toISOString(),
  };
  const file = writeJson('incidents', key, incident);
  await testInfo.attach(`self-heal incident: ${key}`, { path: file, contentType: 'application/json' });
  return incident;
}

/**
 * Resolves a registered locator and DETECTS breakage: it must match exactly one element.
 *  - 0 matches  → "not-found"  (the usual sign of a stale locator)
 *  - 2+ matches → "ambiguous"  (the locator is too loose)
 * Either way the test fails (nothing is healed at run time) and an incident file with the
 * page's accessibility tree, data-testids and a screenshot is written for the healer.
 */
export async function findLegacy(page: Page, testInfo: TestInfo, key: LegacyLocatorKey): Promise<Locator> {
  const entry = LEGACY_LOCATORS[key];
  const override = overrideFor(key);
  const spec = override ?? entry.spec;
  const locator = toLocator(page, spec);

  try {
    await expect(locator).toHaveCount(1, { timeout: LOOKUP_TIMEOUT_MS });
  } catch {
    const matchCount = await locator.count();
    const incident = await recordIncident(page, testInfo, key, entry.intent, spec, matchCount);
    throw new BrokenLocatorError(
      `Locator "${key}" ${incident.specText} matched ${matchCount} element(s), expected exactly 1.\n` +
        `Intent: ${entry.intent}\nIncident: ${path.join(SELF_HEAL_DIR, 'incidents', `${safeFileName(key)}.json`)}`,
      incident,
    );
  }

  const match: LocatorMatch = {
    key,
    spec,
    specText: describeSpec(spec),
    overridden: override !== undefined,
    element: {
      tag: await locator.evaluate((element) => element.tagName.toLowerCase()),
      text: ((await locator.textContent()) ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      ariaSnapshot: await locator.ariaSnapshot(),
    },
  };
  writeJson('matches', key, match);
  return locator;
}
