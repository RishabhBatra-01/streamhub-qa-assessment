# AI self-healing for broken locators

This covers the brief's self-healing exercise: **3–5 broken locators left broken in the tests**, and **how AI
can heal them**: detection, prompt approach and validation before a fix is applied. A **working proof of
concept** (the bonus) is included and can be run with one command.

**Contents:** [The broken locators](#1-the-broken-locators) · [How to run](#2-how-to-run) ·
[Overview](#3-overview) · [Detection](#4-detection) · [Prompt approach](#5-prompt-approach) ·
[Validation before applying](#6-validation-before-applying-a-fix) · [Results](#7-results) ·
[Running it in a real team](#8-running-it-in-a-real-team) · [Limitations](#9-limitations)

---

## 1. The broken locators

[`tests/self-heal/legacyLocators.ts`](../tests/self-heal/legacyLocators.ts) holds 5 locators "written for an older
version of the UI". They are used only by [`LegacyDashboardPage`](../tests/pages/LegacyDashboardPage.ts) and the
`@self-heal` scenarios in [`legacy-dashboard.feature`](../tests/features/self-heal/legacy-dashboard.feature).
They stay broken in the repository, as the brief asks. Each one breaks in a different, realistic way:

| #   | Key                  | Broken locator                                                                 | Why it breaks                                    |
| --- | -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| 1   | `monthlyEmi`         | `getByTestId('monthly-emi')`                                                   | **Stale test id:** renamed to `emi-value`        |
| 2   | `interestRateInput`  | `getByRole('textbox', { name: 'Interest Rate' })`                              | **Wrong role:** a number input is a `spinbutton` |
| 3   | `personalLoanTab`    | `getByRole('tab', { name: 'Personal Loans' })`                                 | **Renamed text:** the tab says "Personal Loan"   |
| 4   | `loanTenureInput`    | `xpath=/html/body/div/div/main/section[2]/div[2]/form/div[3]/div[1]/div/input` | **Brittle absolute XPath:** the layout changed   |
| 5   | `totalInterestValue` | `div.summary-card.interest > span.amount`                                      | **Brittle CSS:** old styling class names         |

Every locator is stored as **data** with its **intent**, a plain-words description of what it should find:

```ts
monthlyEmi: {
  intent: 'The Monthly EMI amount shown in the loan summary cards',
  spec: { testId: 'monthly-emi' },
},
```

That one design choice makes healing practical. The healer knows what each locator was _for_, a model
can answer in the same small format, a candidate can be swapped in **without editing code**, and the
final fix is a one-line, reviewable change.

## 2. How to run

```bash
npm run test:self-heal                       # show the 5 failures (an incident is recorded for each)
npm run self-heal                            # detect → suggest → validate → report + patch (dry run)
npm run self-heal -- --apply                 # same, then apply the validated fixes to the source file
npm run self-heal -- --provider heuristic    # offline, non-AI matcher (no Claude needed)
npm run self-heal -- --model opus            # choose the Claude model
```

The AI provider is **Claude Code in headless mode** (`claude -p`), using your existing Claude login, so **no
API key is needed**. If `claude` is not installed or not logged in (`claude auth login`), `--provider auto`
(the default) falls back to the non-AI matcher and says so in the report.

Output goes to `reports/self-heal/`: `healing-report.md`, `healing-report.json`, `locators.patch`, plus the
prompt, AI response, incident, screenshot and validation evidence for every locator.

## 3. Overview

```text
 npm run self-heal
 │
 ├─ 1 DETECT ──── run @self-heal scenarios ── locator matches ≠ 1 element? ──► incident.json
 │                                             (+ ARIA snapshot, test ids, screenshot)
 │
 ├─ 2 SUGGEST ─── prompt (intent + broken locator + page) ──► Claude Code (tools off, JSON schema)
 │                                                          ──► up to 3 ranked candidates
 │
 ├─ 3 VALIDATE ── for each candidate, best first:
 │                  a. static gate: well-formed? role/label/testId/text only (no CSS/XPath)?
 │                  b. replay: re-run the failing scenario with the candidate swapped in
 │                     → must match exactly 1 element AND the whole scenario must pass
 │                  first candidate that passes = the fix
 │
 ├─ 4 REGRESS ─── re-run every @self-heal scenario with all fixes together
 │
 ├─ 5 REPORT ──── healing-report.md + locators.patch  (dry run: nothing changed)
 │
 └─ 6 APPLY ───── only with --apply, only if step 4 passed: patch source, re-run, confirm green
```

| Piece                                                  | File                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Locator format, safety checks, code generation         | [`tests/self-heal/locatorSpec.ts`](../tests/self-heal/locatorSpec.ts)               |
| Detection and incident capture (runs inside the tests) | [`tests/self-heal/healingLocator.ts`](../tests/self-heal/healingLocator.ts)         |
| Healer CLI (orchestration)                             | [`scripts/self-heal/heal.ts`](../scripts/self-heal/heal.ts)                         |
| Prompt                                                 | [`scripts/self-heal/prompt.ts`](../scripts/self-heal/prompt.ts)                     |
| Providers: Claude Code and non-AI fallback             | [`scripts/self-heal/providers.ts`](../scripts/self-heal/providers.ts)               |
| Re-running scenarios with overrides                    | [`scripts/self-heal/playwrightRunner.ts`](../scripts/self-heal/playwrightRunner.ts) |
| Patch and diff                                         | [`scripts/self-heal/patch.ts`](../scripts/self-heal/patch.ts)                       |

## 4. Detection

**Goal:** tell a _broken locator_ apart from a _broken application_, and capture enough context to fix it.

**The rule: a locator must match exactly one element.** Before a legacy locator is used,
[`findLegacy()`](../tests/self-heal/healingLocator.ts) waits up to 5 s for exactly one match:

| Matches | Meaning                                                                    | Action                                                    |
| ------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1       | Locator is fine                                                            | Use it (and record which element it matched, as evidence) |
| 0       | **not-found:** the usual sign of a stale locator                           | Record an incident, fail the test                         |
| 2+      | **ambiguous:** the locator is too loose and could act on the wrong element | Record an incident, fail the test                         |

If the locator _does_ find one element but a later **assertion** fails (wrong EMI, wrong text), that is
**not** a locator incident. It is reported as an ordinary test failure, because it points at the
application, not the locator.

**What an incident records** (`reports/self-heal/incidents/<key>.json`):

- the key, the **intent**, the broken locator and the problem (`not-found` / `ambiguous`, match count)
- the page URL and title, and the scenario title and feature file (so it can be replayed exactly)
- the page's **ARIA snapshot** (Playwright's accessibility tree: roles, names, values; about 2.6 KB here)
- every element with a `data-testid` (tag and text), because the accessibility tree does not show test ids
- a full-page screenshot

**No healing at run time, on purpose.** The test still fails. Tools that quietly swap in a "healed" locator
during the run turn red builds green without anyone looking. That can hide real bugs, and it makes
results depend on a model's answer on the day. Here, healing is a separate, reviewed step.

## 5. Prompt approach

The prompt is built by [`buildPrompt()`](../scripts/self-heal/prompt.ts). You can read a real one in
[`example-run/prompts/`](self-healing/example-run/prompts).

**What the model is given:**

1. **The intent:** what the element is for. Without it, "find something similar to `monthly-emi`" is
   guesswork. With it, the model looks for _the Monthly EMI amount_.
2. **The broken locator and how it failed** (0 matches, or N matches).
3. **The page as an accessibility tree plus the test-id list, not raw HTML.** Here it is about 4x smaller than the page's
   HTML (2.5 KB against 9.8 KB), it has no styling noise, and it shows exactly what `getByRole`, `getByLabel` and `getByTestId` locators are
   built from, so every name the model sees can be used as-is.

**What it is told** (the rules mirror the framework's locator rules):

- Suggest **up to 3 candidates, best first**, each with a confidence and a one-line reason.
- Use **role + accessible name > label > test id > text**. **Never CSS, XPath, positions or class names.**
  Those are what broke.
- Match **exactly one** element, and **the** element in the intent, not the card around it or a similar
  neighbour.
- **Use only names and test ids that appear on the page.** Do not invent any.
- **If nothing matches the intent, return an empty list.** The element may really be missing (an app bug),
  and a forced match would hide it.

**How it is called** ([`providers.ts`](../scripts/self-heal/providers.ts)):

```bash
claude -p --output-format json --json-schema '<schema>' --tools "" --no-session-persistence --strict-mcp-config
```

- `--json-schema`: the answer must be valid JSON in a fixed shape (`strategy`, `value`, `name`, `confidence`,
  `reason`). No free-text parsing.
- `--tools ""`: the model can **only answer**. It cannot read files, run commands or edit code.
- It runs in a temporary directory, so the answer depends only on the prompt, not on project files.
- Every prompt and raw response (with model name, cost and duration) is saved for audit.

**Fallback without AI:** a deterministic matcher compares the intent and the old locator with the
accessibility tree and test ids (word overlap, name similarity, same name with a different role). It is much
weaker than a model, which is fine, because its suggestions go through exactly the same validation.

## 6. Validation before applying a fix

A model's suggestion is **untrusted input**. It is only accepted after passing every gate below, in order:

| Gate                                                                  | Check                                                                                                                                                                       | What it catches                                                                                                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Static** ([`rejectReason()`](../tests/self-heal/locatorSpec.ts)) | Well-formed, one strategy, allowed keys only, a known ARIA role, never CSS/XPath                                                                                            | Malformed output, brittle "fixes", invented roles                                                                                                                   |
| **2. Exactly one match**                                              | During replay, the candidate must match exactly 1 element                                                                                                                   | Loose locators that match several elements                                                                                                                          |
| **3. Scenario replay**                                                | The scenario that failed is re-run with the candidate swapped in through `SELF_HEAL_OVERRIDES` (no source edit). **The whole scenario must pass**, with all its assertions. | The **wrong element**: a container, a neighbour, the slider instead of the input. The assertions (exact EMI, selected tab, form values) only pass on the right one. |
| **4. Regression**                                                     | All `@self-heal` scenarios are re-run with **all** fixes together                                                                                                           | Fixes that conflict or only work alone                                                                                                                              |
| **5. Human review**                                                   | Default is a **dry run**: a report plus a one-line-per-locator `git` patch                                                                                                  | Anything automation cannot judge, e.g. "is this really the element we meant?"                                                                                       |
| **6. Apply and confirm**                                              | Only with `--apply` and only if gate 4 passed: patch the file, then re-run **without** overrides                                                                            | A patch that does not behave like the override                                                                                                                      |

Candidates are tried in the model's ranked order, and the **first one that passes gates 1–3 wins**. The
report shows every candidate and why it was accepted or rejected, including the element it actually matched.

**Shown to work** (from real runs of the POC):

- **Wrong suggestions are rejected.** The non-AI matcher first suggested the _whole summary card_
  (`summary-emi`) for the EMI value. Replay failed (`toHaveText` saw the card's label and note too), so it
  was rejected and the next candidate, `emi-value`, was accepted. An earlier version of the matcher even
  suggested the entire _form_ for an input box. Gate 3 rejected that too.
- **Real bugs are not hidden.** With the Monthly EMI card _removed from the app_ (a simulated application
  bug), the healer returned **no fix** for `monthlyEmi` ("nothing on the page matched the intent"). It also
  refused the correct input-box locators for two other scenarios, because those scenarios still failed on
  the missing EMI. Result: 2 of 5 healed, exit code 1, and the bug stays visible.

## 7. Results

The committed example run in [`docs/self-healing/example-run/`](self-healing/example-run) is a real run of
`npm run self-heal` with **Claude Code (Claude Opus 5) as the provider**. Its
[healing report](self-healing/example-run/healing-report.md) shows every prompt, the ranked candidates with
the model's reasons, the validation outcome and the final patch.

**The AI's first-ranked suggestion was correct for all five locators**, and each one passed replay:

| Locator              | Claude's first choice (confidence)                          | Its reasoning, in short                                                   | Backup it offered                                             |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `interestRateInput`  | `getByRole('spinbutton', { name: 'Interest Rate' })` (0.96) | Only the role was wrong; the exact name avoids the "Interest Rate slider" | `getByLabel('Interest Rate')`                                 |
| `loanTenureInput`    | `getByRole('spinbutton', { name: 'Loan Tenure' })` (0.96)   | Exact name excludes the adjacent "Loan Tenure slider"                     | `getByLabel('Loan Tenure')`                                   |
| `monthlyEmi`         | `getByTestId('emi-value')` (0.95)                           | The value itself, "not the surrounding summary card"                      | text "₹33,038" (0.50), flagged by the model itself as brittle |
| `personalLoanTab`    | `getByRole('tab', { name: 'Personal Loan' })` (0.97)        | Singular, not "Personal Loans"                                            | text "Personal Loan" (0.40)                                   |
| `totalInterestValue` | `getByTestId('total-interest-value')` (0.97)                | The single element holding the amount, not the card                       | none                                                          |

**AI compared with the non-AI fallback, on the same incidents:**

|                                | Claude Code                                                                                           | Non-AI matcher                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Healed and validated           | 5 / 5                                                                                                 | 5 / 5                                                                       |
| Correct at the first candidate | **5 / 5**                                                                                             | 3 / 5 (twice it first picked the whole summary card, which replay rejected) |
| Explains its choice            | Yes, specific to the page                                                                             | Generic ("shares words with the intent")                                    |
| Time and cost                  | about 70 s of model time for 5 prompts; about $0.30 API-equivalent (covered by a Claude subscription) | under 1 s, free                                                             |

The proposed patch turns all five brittle or stale locators into resilient role or test-id locators:

```diff
-    spec: { testId: 'monthly-emi' },
+    spec: { testId: 'emi-value' },
-    spec: { role: 'textbox', name: 'Interest Rate' },
+    spec: { role: 'spinbutton', name: 'Interest Rate' },
-    spec: { role: 'tab', name: 'Personal Loans' },
+    spec: { role: 'tab', name: 'Personal Loan' },
-    spec: { xpath: '/html/body/div/div/main/section[2]/div[2]/form/div[3]/div[1]/div/input' },
+    spec: { role: 'spinbutton', name: 'Loan Tenure' },
-    spec: { css: 'div.summary-card.interest > span.amount' },
+    spec: { testId: 'total-interest-value' },
```

**5 of 5** pass validation and the regression run. `git apply --check` accepts the patch, and `--apply`
followed by a plain re-run gives 5 passed. The repository keeps the broken versions, as the brief asks;
the patch is the proposed fix.

## 8. Running it in a real team

- **Where it runs:** as a CI job after a UI test failure (or nightly). The job opens a pull request with the
  patch and the healing report attached. **It never pushes or auto-merges.** A reviewer approves it like any
  other change.
- **Flaky or broken?** Re-run a failed test once before healing. Only locators that fail consistently
  are worth healing.
- **Keep intents up to date:** an intent is part of the locator. Pages written this way get healing
  almost for free, and reviewers can read what each locator is for.
- **Privacy:** the prompt contains the page's text. Use it on test environments with test data only, and
  never send production customer data to a model.
- **Cost and time:** one short prompt per broken locator (about 3 KB of page context). Validation re-runs one
  scenario per candidate (a few seconds each), so a whole run is a minute or two.
- **Other ways to plug in AI:** the provider is one function, so the Anthropic API or another model can be
  added without touching detection or validation. Related tools exist: playwright-bdd's `aiFix` prompt
  attachment and Playwright's `error-context.md` give a model similar page context, and Healenium heals at
  run time. This POC's choices (intent-aware, validated by replay, reviewed rather than silent) are about
  keeping the tests trustworthy.

## 9. Limitations

- It heals **locators**, not test logic: if the flow changed (a new step, a new page), a person has to
  update the scenario.
- Healing needs the page to reach the right state. If the broken locator is used _after_ another broken
  step, it is only reached once the earlier one is fixed. Each scenario here uses one legacy locator, for
  that reason.
- Replay proves the scenario passes. It cannot prove that the matched element is what a human meant in
  every possible state, which is why the last gate is human review.
- The non-AI fallback only handles simple renames and keyword matches. Real-world drift needs the model.
