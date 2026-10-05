import { defineConfig, devices } from '@playwright/test';
import { cucumberReporter, defineBddProject } from 'playwright-bdd';
import { env } from './config/env';

const REPORTS_DIR = 'reports';

/** Files every project needs: the custom `test` (with page-object fixtures) and shared hooks. */
const SHARED_STEPS = ['tests/support/fixtures.ts', 'tests/support/hooks.ts'];

export default defineConfig({
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: env.isCI,
  // Retries only in CI, so a flaky test is reported as "flaky" there instead of failing the build,
  // while local runs show every failure straight away.
  retries: env.isCI ? 2 : 0,
  workers: env.isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: `${REPORTS_DIR}/playwright-html`, open: 'never' }],
    cucumberReporter('html', { outputFile: `${REPORTS_DIR}/cucumber/cucumber-report.html` }),
    cucumberReporter('json', { outputFile: `${REPORTS_DIR}/cucumber/cucumber-report.json` }),
    ['junit', { outputFile: `${REPORTS_DIR}/junit/results.xml` }],
  ],

  use: {
    headless: env.headless,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      ...defineBddProject({
        name: 'ui',
        features: 'tests/features/ui/**/*.feature',
        featuresRoot: 'tests/features',
        steps: ['tests/steps/ui/**/*.ts', ...SHARED_STEPS],
      }),
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.appBaseUrl,
        // The app honours prefers-reduced-motion, so charts render without animation and
        // tests never have to wait for an animation to finish.
        reducedMotion: 'reduce',
        // Keep a screenshot of every UI scenario as execution evidence for the report.
        screenshot: 'on',
      },
    },
    {
      ...defineBddProject({
        name: 'api',
        features: 'tests/features/api/**/*.feature',
        featuresRoot: 'tests/features',
        steps: ['tests/steps/api/**/*.ts', ...SHARED_STEPS],
      }),
      use: {
        // Trailing slash so relative paths like 'posts' resolve under any base path (e.g. https://host/api/).
        baseURL: `${env.apiBaseUrl}/`,
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
    {
      // ⚠️ Deliberately broken locators (AI self-healing exercise). Never part of `npm test`;
      // run with `npm run test:self-heal` or `npm run self-heal`. See docs/SELF_HEALING.md.
      ...defineBddProject({
        name: 'self-heal',
        features: 'tests/features/self-heal/**/*.feature',
        featuresRoot: 'tests/features',
        steps: ['tests/steps/ui/**/*.ts', 'tests/steps/self-heal/**/*.ts', ...SHARED_STEPS],
      }),
      // Healing re-runs scenarios to validate candidate fixes, so results must be deterministic.
      retries: 0,
      use: { ...devices['Desktop Chrome'], baseURL: env.appBaseUrl, reducedMotion: 'reduce' },
    },
    {
      ...defineBddProject({
        name: 'sql',
        features: 'tests/features/sql/**/*.feature',
        featuresRoot: 'tests/features',
        steps: ['tests/steps/sql/**/*.ts', ...SHARED_STEPS],
      }),
      // Screenshots of SQL output are rendered at 2x for crisp text.
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 },
    },
  ],

  webServer: env.startWebServer
    ? {
        command: env.webServerCommand,
        url: env.appBaseUrl,
        reuseExistingServer: !env.isCI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,
});
