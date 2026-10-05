import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import type { HealingIncident } from '../../tests/self-heal/incident.ts';
import { KNOWN_ROLES, type LocatorSpec } from '../../tests/self-heal/locatorSpec.ts';

export interface Suggestion {
  /** Untrusted until validated: may be malformed or use a forbidden strategy. */
  spec: unknown;
  confidence: number;
  reason: string;
}

export interface ProviderResponse {
  suggestions: Suggestion[];
  /** Raw details kept for the audit trail (model, cost, raw output). */
  raw: unknown;
}

export interface Provider {
  name: string;
  suggest(incident: HealingIncident, prompt: string): ProviderResponse;
}

// ---------------------------------------------------------------- Claude Code

/** JSON Schema the model's answer must follow (enforced by `claude -p --json-schema`). */
const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['strategy', 'value', 'confidence', 'reason'],
        properties: {
          strategy: { type: 'string', enum: ['role', 'label', 'testId', 'text'] },
          value: { type: 'string' },
          name: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          reason: { type: 'string' },
        },
      },
    },
  },
};

interface ModelCandidate {
  strategy: string;
  value: string;
  name?: string;
  confidence: number;
  reason: string;
}

function candidateToSpec(candidate: ModelCandidate): unknown {
  switch (candidate.strategy) {
    case 'role':
      return candidate.name === undefined
        ? { role: candidate.value }
        : { role: candidate.value, name: candidate.name };
    case 'label':
      return { label: candidate.value };
    case 'testId':
      return { testId: candidate.value };
    case 'text':
      return { text: candidate.value };
    default:
      // Passed through unchanged so validation rejects it with a clear reason.
      return { [candidate.strategy]: candidate.value };
  }
}

/** Is the `claude` CLI installed and logged in? */
export function claudeCodeAvailability(): { available: boolean; reason: string } {
  const status = spawnSync('claude', ['auth', 'status'], { encoding: 'utf8', timeout: 30_000 });
  if (status.error) return { available: false, reason: 'the `claude` CLI is not installed' };
  try {
    const parsed = JSON.parse(status.stdout) as { loggedIn?: boolean };
    return parsed.loggedIn
      ? { available: true, reason: 'logged in' }
      : { available: false, reason: '`claude` is not logged in (run: claude auth login)' };
  } catch {
    return {
      available: false,
      reason: `could not read \`claude auth status\`: ${status.stderr || status.stdout}`,
    };
  }
}

/**
 * Uses Claude Code in headless mode (`claude -p`) with the user's existing login, so no API
 * key is needed. Tools are disabled: the model can only answer, never run commands or edit files.
 */
export function claudeCodeProvider(model?: string): Provider {
  return {
    name: `claude-code${model ? ` (${model})` : ''}`,
    suggest(_incident, prompt) {
      const args = [
        '-p',
        '--output-format',
        'json',
        '--tools',
        '',
        '--no-session-persistence',
        '--strict-mcp-config',
        '--json-schema',
        JSON.stringify(RESPONSE_SCHEMA),
        ...(model ? ['--model', model] : []),
      ];
      // Run outside the repo, so the answer depends only on the prompt, not on project files.
      const run = spawnSync('claude', args, {
        input: prompt,
        encoding: 'utf8',
        timeout: 240_000,
        cwd: tmpdir(),
      });
      if (run.error) throw new Error(`Could not run claude: ${run.error.message}`);

      let output: {
        is_error?: boolean;
        result?: string;
        structured_output?: { candidates?: ModelCandidate[] };
        total_cost_usd?: number;
        duration_ms?: number;
        modelUsage?: Record<string, unknown>;
      };
      try {
        output = JSON.parse(run.stdout);
      } catch {
        throw new Error(`claude returned non-JSON output: ${(run.stdout || run.stderr).slice(0, 300)}`);
      }
      if (output.is_error) throw new Error(`claude reported an error: ${output.result}`);

      // The schema-validated answer; fall back to parsing the text result for older CLI versions.
      const answer =
        output.structured_output ?? (JSON.parse(output.result ?? '{}') as { candidates?: ModelCandidate[] });
      const candidates = answer.candidates ?? [];
      return {
        suggestions: candidates.map((candidate) => ({
          spec: candidateToSpec(candidate),
          confidence: candidate.confidence,
          reason: candidate.reason,
        })),
        raw: {
          models: Object.keys(output.modelUsage ?? {}),
          costUsd: output.total_cost_usd,
          durationMs: output.duration_ms,
          candidates,
        },
      };
    },
  };
}

// ---------------------------------------------------------------- Heuristic (no AI)

const STOP_WORDS = new Set(
  'the a an of in on to for and or with that this is are shown box number value amount cards card form details'.split(
    ' ',
  ),
);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Share of `candidate` words that also appear in `reference` (0–1), damped when only one
 * word matches, so a single shared word like "loan" is weak evidence.
 */
function overlap(candidate: string[], reference: Set<string>): number {
  if (candidate.length === 0) return 0;
  const matched = candidate.filter((word) => reference.has(word)).length;
  return (matched / candidate.length) * Math.min(1, matched / 2);
}

/** Landmarks and containers: never the single element a broken locator was meant to find. */
const CONTAINER_ROLES = new Set([
  'form',
  'navigation',
  'region',
  'tablist',
  'tabpanel',
  'figure',
  'table',
  'row',
]);

/** 1 = identical strings, 0 = nothing alike (normalised Levenshtein distance). */
function similarity(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  const rows = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array<number>(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) rows[0]![j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      rows[i]![j] = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
    }
  }
  return 1 - rows[x.length]![y.length]! / Math.max(x.length, y.length, 1);
}

/** Elements with a role and a name, read from lines like:  - spinbutton "Loan Tenure": "10" */
function namedElements(ariaSnapshot: string): { role: string; name: string }[] {
  const found: { role: string; name: string }[] = [];
  for (const line of ariaSnapshot.split('\n')) {
    const match = /^\s*- ([a-z]+) "((?:[^"\\]|\\.)*)"/.exec(line);
    if (match && (KNOWN_ROLES as readonly string[]).includes(match[1]!)) {
      found.push({ role: match[1]!, name: match[2]!.replace(/\\"/g, '"') });
    }
  }
  return found;
}

/**
 * A deterministic, offline fallback for when no AI is available. It compares the intent and
 * the broken locator with what is on the page (accessibility tree and test ids). It is much
 * less capable than a model, which is fine: every suggestion still has to pass the same
 * validation before it can be used.
 */
export function heuristicProvider(): Provider {
  return {
    name: 'heuristic (no AI)',
    suggest(incident) {
      const spec = incident.spec as LocatorSpec;
      const oldText = Object.values(spec)
        .filter((value) => typeof value === 'string')
        .join(' ');
      const intentWords = new Set(words(`${incident.intent} ${oldText}`));
      const scored: Suggestion[] = [];

      for (const element of namedElements(incident.ariaSnapshot)) {
        if (CONTAINER_ROLES.has(element.role)) continue;
        let score = overlap(words(element.name), intentWords);
        let reason = `"${element.name}" shares words with the intent`;
        if ('role' in spec && spec.name !== undefined) {
          const nameScore = similarity(spec.name, element.name);
          if (element.role === spec.role && nameScore > score) {
            score = nameScore;
            reason = `same role, name "${element.name}" is close to the old name "${spec.name}"`;
          } else if (element.role !== spec.role && nameScore === 1) {
            score = Math.max(score, 0.95);
            reason = `same name "${element.name}" but role "${element.role}" (the old role "${spec.role}" was wrong)`;
          }
        }
        if (score >= 0.5)
          scored.push({ spec: { role: element.role, name: element.name }, confidence: score, reason });
      }

      for (const element of incident.testIdElements) {
        const score = overlap(words(element.testId), intentWords);
        if (score >= 0.5) {
          scored.push({
            spec: { testId: element.testId },
            confidence: Math.min(score, 0.9),
            reason: `test id "${element.testId}" shares words with the intent`,
          });
        }
      }

      const best = scored.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
      return { suggestions: best, raw: { considered: scored.length } };
    },
  };
}
