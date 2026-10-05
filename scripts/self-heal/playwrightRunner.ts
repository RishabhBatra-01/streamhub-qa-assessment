import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import type { LocatorSpec } from '../../tests/self-heal/locatorSpec.ts';

export interface RunResult {
  passed: boolean;
  /** e.g. "1 passed" or "4 failed, 1 passed" */
  summary: string;
  output: string;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateBddTests(): void {
  const run = spawnSync('npx', ['bddgen'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`bddgen failed:\n${run.stdout}${run.stderr}`);
}

/**
 * Runs the @self-heal scenarios in a child Playwright process.
 *  - `scenarioTitle` limits the run to one scenario (exact title match).
 *  - `overrides` swaps locators in without touching source files (SELF_HEAL_OVERRIDES).
 *  - `selfHealDir` keeps each run's incident/match evidence separate.
 */
export function runSelfHealScenarios(options: {
  selfHealDir: string;
  scenarioTitle?: string;
  overrides?: Record<string, LocatorSpec>;
}): RunResult {
  const args = ['playwright', 'test', '--project=self-heal', '--reporter=line'];
  if (options.scenarioTitle) args.push('--grep', `${escapeRegExp(options.scenarioTitle)}`);

  const run = spawnSync('npx', args, {
    encoding: 'utf8',
    timeout: 300_000,
    env: {
      ...process.env,
      SELF_HEAL_DIR: options.selfHealDir,
      SELF_HEAL_OVERRIDES: options.overrides ? JSON.stringify(options.overrides) : '',
    },
  });
  const output = stripVTControlCharacters(`${run.stdout ?? ''}${run.stderr ?? ''}`);
  const counts = output.match(/^\s*\d+ (passed|failed|flaky|skipped|did not run)\b/gm) ?? [];
  return {
    passed: run.status === 0,
    summary: counts.map((line) => line.trim()).join(', ') || `exit code ${run.status}`,
    output,
  };
}
