import type { HealingIncident } from '../../tests/self-heal/incident.ts';

/**
 * Builds the prompt sent to the AI for one broken locator.
 *
 * Design choices (see docs/SELF_HEALING.md):
 *  - Give the model the INTENT (what the locator should find), not just the broken selector.
 *  - Give it the page as an accessibility tree plus the data-testid list: compact, semantic,
 *    and exactly what role/label/testId locators are built from. No raw HTML or CSS classes.
 *  - Ask for structured JSON only, with up to 3 ranked candidates.
 *  - Explicitly allow "no match": if nothing fits the intent, the app may have a real bug,
 *    and a forced "fix" would hide it.
 */
export function buildPrompt(incident: HealingIncident): string {
  const testIds = incident.testIdElements
    .map(
      (element) =>
        `| \`${element.testId}\` | ${element.tag} | ${element.text.replace(/\|/g, '\\|') || '(empty)'} |`,
    )
    .join('\n');

  return `You are repairing a broken locator in a Playwright UI test suite.

## The locator that broke

- Key: \`${incident.key}\`
- What it must find (intent): **${incident.intent}**
- Broken locator: \`${incident.specText}\`
- Problem: it matched ${incident.matchCount} element(s); it must match exactly 1.
- Page: ${incident.url} (title "${incident.pageTitle}")
- Failing scenario: "${incident.scenarioTitle}"

## The page right now

### Accessibility tree (Playwright ARIA snapshot)

\`\`\`yaml
${incident.ariaSnapshot}
\`\`\`

### Elements with a data-testid

| data-testid | tag | text |
| --- | --- | --- |
${testIds || '| (none) | | |'}

## Rules

1. Suggest up to 3 replacement locators for the element described by the intent, best first.
2. Allowed strategies, in order of preference:
   - "role": an ARIA role plus the element's accessible name exactly as shown in the tree, e.g. role "spinbutton", name "Loan Tenure".
   - "label": the text of the element's label.
   - "testId": a data-testid from the table above, exactly as written.
   - "text": exact visible text (only for elements with no role, label or test id).
3. NEVER suggest CSS selectors, XPath, nth()/positions or class names. They are what broke.
4. Each candidate must match exactly ONE element, and it must be the element the intent describes, not a container around it or a similar-looking neighbour. For example, a value shown in a card is the value element, not the whole card.
5. Only use roles, names and test ids that appear above. Do not invent any.
6. If NOTHING on the page matches the intent, return an empty list. The element may really be missing (an application bug), and a forced match would hide that bug.

For each candidate give: strategy, value (the role, label, testId or text), name (only for "role"), confidence from 0 to 1, and a one-sentence reason.`;
}
