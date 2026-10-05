import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { HealingIncident, LocatorMatch } from '../../tests/self-heal/incident.ts';
import { describeSpec, type LocatorSpec } from '../../tests/self-heal/locatorSpec.ts';
import type { Suggestion } from './providers.ts';

export interface CandidateResult extends Suggestion {
  /** Why the suggestion was rejected before running anything (malformed, CSS/XPath, …). */
  staticProblem?: string;
  validation?: { passed: boolean; summary: string; failure?: string; match?: LocatorMatch };
}

export interface HealingOutcome {
  incident: HealingIncident;
  promptFile: string;
  providerError?: string;
  candidates: CandidateResult[];
  chosen?: LocatorSpec;
}

export interface HealingRun {
  startedAt: string;
  finishedAt: string;
  provider: string;
  providerNote: string;
  registryFile: string;
  detection: string;
  outcomes: HealingOutcome[];
  regression?: { passed: boolean; summary: string };
  diff: string;
  applied?: { done: boolean; reason?: string; confirmation?: string; passed?: boolean };
}

const code = (text: string) => `\`${text.replace(/`/g, "'").replace(/\|/g, '\\|')}\``;
const cellText = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function candidateRow(candidate: CandidateResult, index: number): string {
  const locator =
    candidate.staticProblem === undefined
      ? code(describeSpec(candidate.spec as LocatorSpec))
      : code(JSON.stringify(candidate.spec));
  let result: string;
  if (candidate.staticProblem) result = `❌ rejected before running: ${cellText(candidate.staticProblem)}`;
  else if (candidate.validation?.passed) {
    const element = candidate.validation.match?.element;
    result = `✅ scenario passes${element ? `; matched \`<${element.tag}>\` "${cellText(element.text)}"` : ''}`;
  } else result = `❌ scenario fails: ${cellText(candidate.validation?.failure ?? 'not run')}`;
  return `| ${index + 1} | ${locator} | ${candidate.confidence.toFixed(2)} | ${cellText(candidate.reason)} | ${result} |`;
}

function outcomeSection(outcome: HealingOutcome, root: string): string {
  const { incident } = outcome;
  const status = outcome.chosen ? `✅ healed → ${code(describeSpec(outcome.chosen))}` : '❌ not healed';
  const rows = outcome.candidates.map(candidateRow).join('\n');
  return `### \`${incident.key}\`: ${status}

- **Intent:** ${incident.intent}
- **Broken locator:** ${code(incident.specText)}, matched ${incident.matchCount} element(s) (${incident.problem})
- **Scenario:** "${incident.scenarioTitle}"
- **Evidence:** [prompt](${path.relative(root, outcome.promptFile)}), [incident](incidents/${incident.key.toLowerCase()}.json), [screenshot at failure](screenshots/${incident.key.toLowerCase()}.png)
${outcome.providerError ? `- **Provider error:** ${outcome.providerError}\n` : ''}
${
  rows
    ? `| # | Suggested locator | Confidence | Reason given | Validation |\n| --- | --- | --- | --- | --- |\n${rows}`
    : '_No suggestions._'
}
`;
}

/** Writes healing-report.md (for people) and healing-report.json (for tools). */
export function writeReport(dir: string, run: HealingRun): string {
  const healed = run.outcomes.filter((outcome) => outcome.chosen).length;
  const summaryRows = run.outcomes
    .map(
      (outcome) =>
        `| \`${outcome.incident.key}\` | ${code(outcome.incident.specText)} | ${
          outcome.chosen ? code(describeSpec(outcome.chosen)) : '—'
        } | ${outcome.chosen ? '✅' : '❌'} |`,
    )
    .join('\n');

  const applied = run.applied
    ? run.applied.done
      ? `Applied to \`${run.registryFile}\`. Re-run without overrides: **${run.applied.confirmation}**.`
      : `Not applied: ${run.applied.reason}.`
    : `**Dry run: nothing was changed.** Review \`locators.patch\`, then apply it with \`git apply reports/self-heal/locators.patch\` or re-run with \`--apply\`.`;

  const markdown = `# Self-healing report

| | |
| --- | --- |
| **Run** | ${run.startedAt} → ${run.finishedAt} |
| **Provider** | ${run.provider} (${run.providerNote}) |
| **Detection run** | ${run.detection} |
| **Healed and validated** | **${healed} of ${run.outcomes.length}** |
| **Regression run (all fixes together)** | ${run.regression ? `${run.regression.passed ? '✅' : '❌'} ${run.regression.summary}` : 'not run'} |

## Summary

| Locator | Broken | Fix | Validated |
| --- | --- | --- | --- |
${summaryRows}

## Proposed change

${applied}

\`\`\`diff
${run.diff.trim() || '(no changes)'}
\`\`\`

## Details

A candidate is accepted only if (1) it is well formed and uses a preferred strategy (role, label, test id or
text; never CSS or XPath), and (2) the scenario that failed **passes** with the candidate swapped in, with
the locator matching exactly one element. Candidates are tried in the order the provider ranked them.

${run.outcomes.map((outcome) => outcomeSection(outcome, dir)).join('\n')}`;

  const file = path.join(dir, 'healing-report.md');
  writeFileSync(file, markdown);
  writeFileSync(path.join(dir, 'healing-report.json'), `${JSON.stringify(run, null, 2)}\n`);
  return file;
}
