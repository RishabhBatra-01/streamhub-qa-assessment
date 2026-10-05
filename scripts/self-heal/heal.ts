/**
 * AI self-healing POC for broken locators.
 *
 *   npm run self-heal                         dry run: detect → suggest → validate → report + patch
 *   npm run self-heal -- --apply              also apply the validated fixes to the source file
 *   npm run self-heal -- --provider heuristic use the offline, non-AI matcher
 *   npm run self-heal -- --model sonnet       pick the Claude model (provider claude-code)
 *
 * Steps (docs/SELF_HEALING.md explains each):
 *   1. DETECT    run the @self-heal scenarios; each broken locator writes an incident file
 *   2. SUGGEST   ask the provider (Claude Code by default) for up to 3 ranked replacements
 *   3. VALIDATE  reject unsafe suggestions statically, then re-run the failing scenario with
 *                the candidate swapped in; the first candidate whose scenario passes wins
 *   4. REGRESS   re-run all @self-heal scenarios with every chosen fix at once
 *   5. REPORT    write healing-report.md/.json and locators.patch for human review
 *   6. APPLY     only with --apply: patch the source, then re-run to confirm it is green
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { HealingIncident, LocatorMatch } from '../../tests/self-heal/incident.ts';
import { describeSpec, rejectReason, type LocatorSpec } from '../../tests/self-heal/locatorSpec.ts';
import { patchRegistry, unifiedDiff } from './patch.ts';
import { generateBddTests, runSelfHealScenarios } from './playwrightRunner.ts';
import { buildPrompt } from './prompt.ts';
import { claudeCodeAvailability, claudeCodeProvider, heuristicProvider, type Provider } from './providers.ts';
import { writeReport, type CandidateResult, type HealingOutcome, type HealingRun } from './report.ts';

const REGISTRY_FILE = 'tests/self-heal/legacyLocators.ts';
const OUT_DIR = path.resolve('reports/self-heal');
const MAX_CANDIDATES = 3;

const { values: options } = parseArgs({
  options: {
    provider: { type: 'string', default: 'auto' },
    model: { type: 'string' },
    apply: { type: 'boolean', default: false },
  },
});

const log = (message = '') => console.log(message);

function chooseProvider(): { provider: Provider; note: string } {
  const requested = options.provider;
  if (requested === 'heuristic')
    return { provider: heuristicProvider(), note: 'requested with --provider heuristic' };
  const claude = claudeCodeAvailability();
  if (requested === 'claude-code') {
    if (!claude.available) throw new Error(`Claude Code is not available: ${claude.reason}`);
    return { provider: claudeCodeProvider(options.model), note: 'requested with --provider claude-code' };
  }
  if (requested !== 'auto')
    throw new Error(`Unknown --provider "${requested}" (use auto, claude-code or heuristic)`);
  return claude.available
    ? { provider: claudeCodeProvider(options.model), note: 'auto: Claude Code is logged in' }
    : {
        provider: heuristicProvider(),
        note: `auto: fell back to the non-AI matcher because ${claude.reason}`,
      };
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function readIncidents(dir: string): HealingIncident[] {
  const incidentDir = path.join(dir, 'incidents');
  if (!existsSync(incidentDir)) return [];
  return readdirSync(incidentDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readJson<HealingIncident>(path.join(incidentDir, file)))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function healIncident(incident: HealingIncident, provider: Provider): HealingOutcome {
  log(`\n▶ ${incident.key}: ${incident.specText} matched ${incident.matchCount} element(s)`);
  const prompt = buildPrompt(incident);
  const promptFile = path.join(OUT_DIR, 'prompts', `${incident.key}.md`);
  writeFileSync(promptFile, prompt);
  // Reports store repository-relative paths, so they can be committed without local paths.
  const relativePromptFile = path.relative(process.cwd(), promptFile);

  let response;
  try {
    response = provider.suggest(incident, prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`  ✗ provider error: ${message}`);
    return { incident, promptFile: relativePromptFile, providerError: message, candidates: [] };
  }
  writeFileSync(
    path.join(OUT_DIR, 'responses', `${incident.key}.json`),
    `${JSON.stringify(response, null, 2)}\n`,
  );
  if (response.suggestions.length === 0) log('  ✗ no suggestions (nothing on the page matched the intent)');

  const candidates: CandidateResult[] = [];
  for (const [index, suggestion] of response.suggestions.slice(0, MAX_CANDIDATES).entries()) {
    const label = `  candidate ${index + 1}`;
    const staticProblem = rejectReason(suggestion.spec);
    if (staticProblem) {
      log(`${label}: ${JSON.stringify(suggestion.spec)} ✗ rejected: ${staticProblem}`);
      candidates.push({ ...suggestion, staticProblem });
      continue;
    }
    const spec = suggestion.spec as LocatorSpec;
    const evidenceDir = path.join(OUT_DIR, 'validation', `${incident.key}-${index + 1}`);
    const run = runSelfHealScenarios({
      selfHealDir: evidenceDir,
      scenarioTitle: incident.scenarioTitle,
      overrides: { [incident.key]: spec },
    });
    const matchFile = path.join(evidenceDir, 'matches', `${incident.key.toLowerCase()}.json`);
    const match = existsSync(matchFile) ? readJson<LocatorMatch>(matchFile) : undefined;
    const failure = run.passed
      ? undefined
      : (/^\s+(Error|BrokenLocatorError):.*$/m.exec(run.output)?.[0].trim() ?? run.summary);
    log(`${label}: ${describeSpec(spec)} → ${run.passed ? '✓ scenario passes' : `✗ ${failure}`}`);
    candidates.push({
      ...suggestion,
      spec,
      validation: { passed: run.passed, summary: run.summary, failure, match },
    });
    if (run.passed) break;
  }

  const chosen = candidates.find((candidate) => candidate.validation?.passed);
  return {
    incident,
    promptFile: relativePromptFile,
    candidates,
    chosen: chosen?.spec as LocatorSpec | undefined,
  };
}

function main(): void {
  const startedAt = new Date();
  rmSync(OUT_DIR, { recursive: true, force: true });
  for (const dir of ['prompts', 'responses']) mkdirSync(path.join(OUT_DIR, dir), { recursive: true });

  const { provider, note } = chooseProvider();
  log(
    `Self-healing POC · provider: ${provider.name} (${note})${options.apply ? ' · --apply' : ' · dry run'}`,
  );

  log('\n1. DETECT: running the @self-heal scenarios…');
  generateBddTests();
  const detection = runSelfHealScenarios({ selfHealDir: OUT_DIR });
  const incidents = readIncidents(OUT_DIR);
  log(`   ${detection.summary}; ${incidents.length} broken locator(s) recorded`);
  if (incidents.length === 0) {
    log(
      detection.passed
        ? '   Nothing to heal.'
        : '   Scenarios failed WITHOUT a locator incident: not a locator problem, so nothing to heal.',
    );
    return;
  }

  log('\n2–3. SUGGEST + VALIDATE');
  const outcomes = incidents.map((incident) => healIncident(incident, provider));
  const fixes = Object.fromEntries(
    outcomes.filter((outcome) => outcome.chosen).map((outcome) => [outcome.incident.key, outcome.chosen!]),
  );

  log('\n4. REGRESS: all @self-heal scenarios with every chosen fix…');
  const regression =
    Object.keys(fixes).length > 0
      ? runSelfHealScenarios({ selfHealDir: path.join(OUT_DIR, 'regression'), overrides: fixes })
      : undefined;
  log(`   ${regression ? regression.summary : 'skipped: no validated fixes'}`);

  const before = readFileSync(REGISTRY_FILE, 'utf8');
  const after = patchRegistry(before, fixes);
  const diff = unifiedDiff(REGISTRY_FILE, before, after);
  writeFileSync(path.join(OUT_DIR, 'locators.patch'), diff);

  let applied: HealingRun['applied'];
  if (options.apply) {
    const allHealed = regression?.passed === true;
    if (!allHealed) {
      log('\n6. APPLY: skipped, because the regression run did not pass with every fix');
      applied = { done: false, reason: 'regression run did not pass' };
    } else {
      writeFileSync(REGISTRY_FILE, after);
      const confirm = runSelfHealScenarios({ selfHealDir: path.join(OUT_DIR, 'after-apply') });
      log(`\n6. APPLY: patched ${REGISTRY_FILE}; re-run without overrides: ${confirm.summary}`);
      applied = { done: true, confirmation: confirm.summary, passed: confirm.passed };
    }
  }

  const reportFile = writeReport(OUT_DIR, {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    provider: provider.name,
    providerNote: note,
    registryFile: REGISTRY_FILE,
    detection: detection.summary,
    outcomes,
    regression: regression ? { passed: regression.passed, summary: regression.summary } : undefined,
    diff,
    applied,
  });

  const healed = outcomes.filter((outcome) => outcome.chosen).length;
  log(`\n5. REPORT: ${healed}/${outcomes.length} locators healed and validated`);
  log(`   ${path.relative(process.cwd(), reportFile)}`);
  log(
    `   ${path.relative(process.cwd(), path.join(OUT_DIR, 'locators.patch'))}${options.apply ? '' : ' (review, then apply with --apply or git apply)'}`,
  );
  if (healed < outcomes.length) process.exitCode = 1;
}

main();
