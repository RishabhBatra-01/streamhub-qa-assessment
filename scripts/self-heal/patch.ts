import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { specToSource, type LocatorSpec } from '../../tests/self-heal/locatorSpec.ts';

/**
 * Rewrites the one-line `spec:` of each healed entry in the locator registry, e.g.
 *     monthlyEmi: {
 *       intent: '...',
 *       spec: { testId: 'monthly-emi' },     →     spec: { testId: 'emi-value' },
 * Throws if an entry cannot be found unambiguously, rather than guessing.
 */
export function patchRegistry(source: string, fixes: Record<string, LocatorSpec>): string {
  const lines = source.split('\n');
  for (const [key, spec] of Object.entries(fixes)) {
    const start = lines.findIndex((line) => new RegExp(`^\\s*${key}: \\{$`).test(line));
    if (start === -1) throw new Error(`Registry entry "${key}" not found`);
    let specLine = -1;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^\s*\w+: \{$/.test(lines[i]!) || /^\}/.test(lines[i]!)) break; // next entry or end
      if (/^\s*spec: \{.*\},$/.test(lines[i]!)) {
        specLine = i;
        break;
      }
    }
    if (specLine === -1) throw new Error(`One-line "spec:" not found for registry entry "${key}"`);
    const indent = /^\s*/.exec(lines[specLine]!)![0];
    lines[specLine] = `${indent}spec: ${specToSource(spec)},`;
  }
  return lines.join('\n');
}

/** A unified diff (git format) between two versions of a repository file. */
export function unifiedDiff(relativePath: string, before: string, after: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'self-heal-'));
  try {
    const oldFile = path.join(dir, 'old');
    const newFile = path.join(dir, 'new');
    writeFileSync(oldFile, before);
    writeFileSync(newFile, after);
    const run = spawnSync('git', ['diff', '--no-index', '--no-color', '--', oldFile, newFile], {
      encoding: 'utf8',
    });
    return run.stdout
      .replaceAll(`a${oldFile}`, `a/${relativePath}`)
      .replaceAll(`b${newFile}`, `b/${relativePath}`)
      .replace(/^diff --git .*$/m, `diff --git a/${relativePath} b/${relativePath}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
