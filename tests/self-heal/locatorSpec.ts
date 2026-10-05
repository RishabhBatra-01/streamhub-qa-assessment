/**
 * A locator written as plain data, e.g. { role: 'tab', name: 'Home Loan' } or { testId: 'emi-value' }.
 *
 * Keeping locators as data (instead of code) is what makes self-healing possible: the
 * healer can read a broken locator, ask for a replacement in the same format, validate it,
 * and rewrite exactly that entry in the source file.
 *
 * This file must stay dependency-free (type imports only): it is used both by the
 * Playwright tests and by the self-heal CLI, which Node runs directly.
 */
import type { Locator, Page } from '@playwright/test';

/** Roles the app uses; a candidate with any other role is rejected before it is tried. */
export const KNOWN_ROLES = [
  'button',
  'link',
  'tab',
  'tablist',
  'tabpanel',
  'spinbutton',
  'slider',
  'textbox',
  'combobox',
  'heading',
  'figure',
  'table',
  'row',
  'cell',
  'region',
  'navigation',
  'form',
  'status',
  'alert',
  'img',
] as const;

export type AriaRoleName = (typeof KNOWN_ROLES)[number];

export type LocatorSpec =
  | { role: AriaRoleName; name?: string; exact?: boolean }
  | { label: string; exact?: boolean }
  | { testId: string }
  | { text: string; exact?: boolean }
  | { placeholder: string }
  | { css: string }
  | { xpath: string };

/** Strategies the framework allows in healed locators, best first (see README locator rules). */
export const PREFERRED_STRATEGIES = ['role', 'label', 'testId', 'text', 'placeholder'] as const;
/** Brittle strategies: allowed to exist (they are what breaks), never accepted as a fix. */
export const BRITTLE_STRATEGIES = ['css', 'xpath'] as const;

export type Strategy = (typeof PREFERRED_STRATEGIES)[number] | (typeof BRITTLE_STRATEGIES)[number];

export function strategyOf(spec: LocatorSpec): Strategy {
  if ('role' in spec) return 'role';
  if ('label' in spec) return 'label';
  if ('testId' in spec) return 'testId';
  if ('text' in spec) return 'text';
  if ('placeholder' in spec) return 'placeholder';
  if ('css' in spec) return 'css';
  return 'xpath';
}

export function toLocator(page: Page, spec: LocatorSpec): Locator {
  if ('role' in spec) {
    return page.getByRole(
      spec.role,
      spec.name === undefined ? {} : { name: spec.name, exact: spec.exact ?? true },
    );
  }
  if ('label' in spec) return page.getByLabel(spec.label, { exact: spec.exact ?? true });
  if ('testId' in spec) return page.getByTestId(spec.testId);
  if ('text' in spec) return page.getByText(spec.text, { exact: spec.exact ?? true });
  if ('placeholder' in spec) return page.getByPlaceholder(spec.placeholder);
  if ('css' in spec) return page.locator(spec.css);
  return page.locator(`xpath=${spec.xpath}`);
}

/** Human-readable form, e.g. getByRole('tab', { name: 'Home Loan' }). */
export function describeSpec(spec: LocatorSpec): string {
  const q = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if ('role' in spec)
    return spec.name === undefined
      ? `getByRole(${q(spec.role)})`
      : `getByRole(${q(spec.role)}, { name: ${q(spec.name)} })`;
  if ('label' in spec) return `getByLabel(${q(spec.label)})`;
  if ('testId' in spec) return `getByTestId(${q(spec.testId)})`;
  if ('text' in spec) return `getByText(${q(spec.text)})`;
  if ('placeholder' in spec) return `getByPlaceholder(${q(spec.placeholder)})`;
  if ('css' in spec) return `locator(${q(spec.css)})`;
  return `locator('xpath=${spec.xpath.replace(/'/g, "\\'")}')`;
}

/** The spec as a TypeScript object literal, for writing back into the source file. */
export function specToSource(spec: LocatorSpec): string {
  const entries = Object.entries(spec).map(([key, value]) => {
    const literal =
      typeof value === 'string' ? `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(value);
    return `${key}: ${literal}`;
  });
  return `{ ${entries.join(', ')} }`;
}

/**
 * Checks that an untrusted value (e.g. from an AI response) is a well-formed spec that uses
 * a preferred strategy. Returns the reason it is not acceptable, or null if it is.
 */
export function rejectReason(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'not an object';
  const spec = value as Record<string, unknown>;
  const keys = Object.keys(spec);
  const strategyKeys = keys.filter((key) =>
    [...PREFERRED_STRATEGIES, ...BRITTLE_STRATEGIES].includes(key as Strategy),
  );
  if (strategyKeys.length !== 1) return `must have exactly one strategy key, got [${keys.join(', ')}]`;
  const strategy = strategyKeys[0] as Strategy;
  if ((BRITTLE_STRATEGIES as readonly string[]).includes(strategy)) {
    return `"${strategy}" locators are brittle and never accepted as a fix`;
  }
  const allowed: Record<string, string[]> = {
    role: ['role', 'name', 'exact'],
    label: ['label', 'exact'],
    testId: ['testId'],
    text: ['text', 'exact'],
    placeholder: ['placeholder'],
  };
  const extra = keys.filter((key) => !allowed[strategy]!.includes(key));
  if (extra.length > 0) return `unexpected keys for a ${strategy} locator: ${extra.join(', ')}`;
  if (typeof spec[strategy] !== 'string' || (spec[strategy] as string).trim() === '') {
    return `${strategy} must be a non-empty string`;
  }
  if (strategy === 'role' && !(KNOWN_ROLES as readonly string[]).includes(spec.role as string)) {
    return `unknown role "${String(spec.role)}"`;
  }
  if ('name' in spec && typeof spec.name !== 'string') return 'name must be a string';
  if ('exact' in spec && typeof spec.exact !== 'boolean') return 'exact must be true or false';
  return null;
}
