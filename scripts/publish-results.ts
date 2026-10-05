/**
 * Runs every check and saves the evidence into results/ (committed to the repository,
 * as the brief asks: "The repository must include your test execution results").
 *
 *   npm run results
 *
 * results/
 *   README.md              summary: counts per suite, environment, links
 *   logs/                  console output of every run
 *   playwright-report/     Playwright HTML report (npx playwright show-report results/playwright-report)
 *   cucumber/              Cucumber HTML report (open the file directly) + JSON
 *   junit/                 JUnit XML (for CI dashboards)
 *   screenshots/           selected UI screenshots, viewable on GitHub
 *   self-healing/          the self-healing run: report, patch, prompts, AI responses, evidence
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const RESULTS = path.resolve('results');
const REPORTS = path.resolve('reports');

/** UI scenarios whose end-of-test screenshot is copied to results/screenshots (title → file). */
const SHOWCASE_SCREENSHOTS: [titleFragment: string, file: string][] = [
  ['The dashboard loads with its main sections', 'dashboard.png'],
  ['Results match known reference values: 2500000 at 10% for 10 years', 'emi-calculation-25L-10pc-10y.png'],
  ['The pie chart shows the principal and interest split for 5000000', 'pie-chart.png'],
  ["The tooltip of a bar shows that year's figures", 'bar-chart-tooltip.png'],
  ['Choosing a year shows its month-wise breakdown', 'payment-schedule-month-wise.png'],
  ['"99999" is rejected in the Home Loan Amount box', 'input-validation-error.png'],
];

interface StepRun {
  name: string;
  command: string;
  exitCode: number | null;
  output: string;
}

function run(name: string, command: string, args: string[], env: Record<string, string> = {}): StepRun {
  console.log(`\n▶ ${name}: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = stripVTControlCharacters(`${result.stdout ?? ''}${result.stderr ?? ''}`);
  writeFileSync(path.join(RESULTS, 'logs', `${name}.log`), `$ ${command} ${args.join(' ')}\n\n${output}`);
  console.log(`  exit code ${result.status} · log: results/logs/${name}.log`);
  return { name, command: `${command} ${args.join(' ')}`, exitCode: result.status, output };
}

interface ProjectStats {
  total: number;
  passed: number;
  expectedFailures: number;
  failed: number;
  flaky: number;
  skipped: number;
}

interface JsonSpec {
  title: string;
  tests: {
    projectName: string;
    status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
    expectedStatus: 'passed' | 'failed' | 'skipped';
    results: { attachments: { name: string; path?: string }[] }[];
  }[];
}
interface JsonSuite {
  suites?: JsonSuite[];
  specs?: JsonSpec[];
}

function collectSpecs(suite: JsonSuite, into: JsonSpec[] = []): JsonSpec[] {
  suite.suites?.forEach((child) => collectSpecs(child, into));
  into.push(...(suite.specs ?? []));
  return into;
}

function projectStats(specs: JsonSpec[]): Map<string, ProjectStats> {
  const stats = new Map<string, ProjectStats>();
  for (const spec of specs) {
    for (const test of spec.tests) {
      const entry = stats.get(test.projectName) ?? {
        total: 0,
        passed: 0,
        expectedFailures: 0,
        failed: 0,
        flaky: 0,
        skipped: 0,
      };
      entry.total++;
      if (test.status === 'skipped') entry.skipped++;
      else if (test.status === 'flaky') entry.flaky++;
      else if (test.status === 'unexpected') entry.failed++;
      else if (test.expectedStatus === 'failed') entry.expectedFailures++;
      else entry.passed++;
      stats.set(test.projectName, entry);
    }
  }
  return stats;
}

function copyShowcaseScreenshots(specs: JsonSpec[]): string[] {
  const dir = path.join(RESULTS, 'screenshots');
  mkdirSync(dir, { recursive: true });
  const copied: string[] = [];
  for (const [fragment, file] of SHOWCASE_SCREENSHOTS) {
    const spec = specs.find((candidate) => candidate.title.includes(fragment));
    const shot = spec?.tests[0]?.results.at(-1)?.attachments.find((a) => a.name === 'screenshot' && a.path);
    if (!shot?.path || !existsSync(shot.path)) {
      console.warn(`  ! no screenshot found for "${fragment}"`);
      continue;
    }
    cpSync(shot.path, path.join(dir, file));
    copied.push(file);
  }
  return copied;
}

/**
 * Logs and reports contain absolute paths (stack traces, attachment paths). Rewrite them as
 * repository-relative paths so the committed results do not expose the local machine layout.
 * (The Playwright HTML report stores its data compressed, so it is left as generated.)
 */
function sanitizeLocalPaths(dir: string): number {
  const root = process.cwd();
  let changed = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !/\.(json|html|log|xml|md|patch)$/.test(entry.name)) continue;
    const file = path.join(entry.parentPath, entry.name);
    if (file.includes(`${path.sep}playwright-report${path.sep}`)) continue;
    const text = readFileSync(file, 'utf8');
    const cleaned = text.replaceAll(`${root}/`, '').replaceAll(root, '.').replaceAll(os.homedir(), '~');
    if (cleaned !== text) {
      writeFileSync(file, cleaned);
      changed++;
    }
  }
  return changed;
}

function vitestCount(output: string): string {
  return /Tests\s+(.+?)\s*$/m.exec(output)?.[1]?.trim() ?? 'see log';
}

function main(): void {
  const startedAt = new Date();
  for (const dir of ['logs', 'playwright-report', 'cucumber', 'junit', 'screenshots', 'self-healing']) {
    rmSync(path.join(RESULTS, dir), { recursive: true, force: true });
  }
  mkdirSync(path.join(RESULTS, 'logs'), { recursive: true });

  const typecheck = run('typecheck', 'npm', ['run', 'typecheck']);
  const lint = run('lint', 'npm', ['run', 'lint']);
  const unit = run('unit-tests', 'npm', ['run', 'test:unit']);
  run('bddgen', 'npx', ['bddgen']);
  const e2e = run('ui-api-sql-tests', 'npx', [
    'playwright',
    'test',
    '--project=ui',
    '--project=api',
    '--project=sql',
  ]);

  cpSync(path.join(REPORTS, 'playwright-html'), path.join(RESULTS, 'playwright-report'), { recursive: true });
  cpSync(path.join(REPORTS, 'cucumber'), path.join(RESULTS, 'cucumber'), { recursive: true });
  cpSync(path.join(REPORTS, 'junit'), path.join(RESULTS, 'junit'), { recursive: true });
  const report = JSON.parse(readFileSync(path.join(REPORTS, 'results.json'), 'utf8')) as {
    suites: JsonSuite[];
  };
  const specs = report.suites.flatMap((suite) => collectSpecs(suite));
  const stats = projectStats(specs);
  const screenshots = copyShowcaseScreenshots(specs);

  // The deliberately broken locators: these scenarios are EXPECTED to fail.
  const selfHealTests = run('self-heal-tests-expected-to-fail', 'npx', [
    'playwright',
    'test',
    '--project=self-heal',
    '--reporter=list',
  ]);
  const healer = run('self-heal', 'node', ['scripts/self-heal/heal.ts']);
  cpSync(path.join(REPORTS, 'self-heal'), path.join(RESULTS, 'self-healing'), { recursive: true });
  const healedLine = /(\d+\/\d+) locators healed and validated/.exec(healer.output)?.[1] ?? 'see log';
  const providerLine = /provider: (.+?) ·/.exec(healer.output)?.[1] ?? 'see log';

  const playwrightVersion = spawnSync('npx', ['playwright', '--version'], { encoding: 'utf8' })
    .stdout.trim()
    .replace(/^Version/, 'Playwright');
  const row = (project: string, label: string) => {
    const s = stats.get(project);
    if (!s) return `| ${label} | – | – | – | – | – |`;
    return `| ${label} | ${s.total} | ${s.passed} | ${s.expectedFailures} | ${s.failed} | ${s.flaky} |`;
  };
  const ok = (exitCode: number | null) => (exitCode === 0 ? '✅ passed' : '❌ failed');

  const summary = `# Test results

Generated by \`npm run results\` on ${startedAt.toISOString().slice(0, 10)}.

| | |
| --- | --- |
| **Environment** | ${os.type()} ${os.release()} (${os.arch()}) · Node ${process.version} · ${playwrightVersion} · Chromium |
| **Type check** | ${ok(typecheck.exitCode)} |
| **Lint** | ${ok(lint.exitCode)} |
| **Unit tests (Vitest)** | ${ok(unit.exitCode)}: ${vitestCount(unit.output)} |
| **UI + API + SQL (Playwright + Cucumber)** | ${ok(e2e.exitCode)} |

## Playwright + Cucumber scenarios

| Suite | Scenarios | Passed | Expected failures (known defects) | Failed | Flaky |
| --- | --- | --- | --- | --- | --- |
${row('ui', 'UI: Loan Planner app (A2)')}
${row('api', 'API: JSONPlaceholder (A3)')}
${row('sql', 'SQL scenarios (A4)')}

"Expected failures" are the API checks for the brief's expected behaviour that JSONPlaceholder does not meet.
They are tagged \`@known-defect @fail\`, and Playwright counts them as passing *because* they failed as
expected. See [docs/API_DEFECTS.md](../docs/API_DEFECTS.md).

## Reports

| Report | How to open |
| --- | --- |
| [Playwright HTML report](playwright-report/) | \`npx playwright show-report results/playwright-report\` |
| [Cucumber HTML report](cucumber/cucumber-report.html) | open the file in a browser |
| [JUnit XML](junit/results.xml) · [Cucumber JSON](cucumber/cucumber-report.json) | for CI tools |
| [Console logs](logs/) | one log per command above |

In the Cucumber report, the known-defect scenarios show as **failed** (Cucumber has no "expected failure"
status). Each carries a "KNOWN DEFECT: this failure is expected" attachment.

## Screenshots

${screenshots.map((file) => `- [${file}](screenshots/${file})`).join('\n')}
- SQL query outputs and schemas: [sql/screenshots/](../sql/screenshots/)

![Dashboard](screenshots/dashboard.png)

## Self-healing exercise

| | |
| --- | --- |
| **Broken-locator scenarios** | ${selfHealTests.exitCode === 0 ? '⚠️ unexpectedly passed' : '❌ fail, as intended (the locators are deliberately broken)'}: [log](logs/self-heal-tests-expected-to-fail.log) |
| **Healer** | ${healedLine} healed and validated · provider: ${providerLine} |
| **Report** | [self-healing/healing-report.md](self-healing/healing-report.md) · [proposed patch](self-healing/locators.patch) |
`;
  writeFileSync(path.join(RESULTS, 'README.md'), summary);
  console.log(`\nRemoved local paths from ${sanitizeLocalPaths(RESULTS)} file(s)`);
  console.log(`\nSummary: results/README.md`);
  if (typecheck.exitCode !== 0 || lint.exitCode !== 0 || unit.exitCode !== 0 || e2e.exitCode !== 0) {
    process.exitCode = 1;
  }
}

main();
