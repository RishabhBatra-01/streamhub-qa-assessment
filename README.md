# Streamhub QA Automation Assessment: Section A

A small **Loan Planner** web app (an EMI calculator with a dashboard, a payment-schedule report and charts),
tested with a **Playwright + Cucumber (BDD) framework**, plus **API tests** for JSONPlaceholder, **SQL
scenarios**, and an **AI self-healing** proof of concept for broken locators.

| Part of the brief                  | What was built                                                                    | Result                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **A1** Web application             | React + TypeScript app: dashboard, input-driven report, pie and bar charts, table | [app/](app/)                                                     |
| **A2** Playwright UI tests         | 41 BDD scenarios against our own independently computed values                    | ✅ 41/41                                                         |
| **A3** API tests (JSONPlaceholder) | 44 scenarios: long titles, special characters, missing fields, extras             | ✅ 23 pass + ⚠️ 21 known defects ([report](docs/API_DEFECTS.md)) |
| **A4** SQL tests                   | 2 scenarios: schema, edge-case data, queries, 31 automated checks, screenshots    | ✅ 31/31                                                         |
| Broken locators + AI self-healing  | 5 locators left broken, design doc, working POC (bonus)                           | ✅ 5/5 healed and validated ([doc](docs/SELF_HEALING.md))        |
| Test results in the repo           | Reports, logs and screenshots                                                     | [results/](results/README.md)                                    |

> **Test results:** see [results/README.md](results/README.md) for the latest full run: Playwright and Cucumber
> HTML reports, JUnit XML, console logs and screenshots.

---

## Contents

1. [Quick start](#1-quick-start)
2. [Commands](#2-commands)
3. [Project structure](#3-project-structure)
4. [Architecture](#4-architecture)
5. [The web app (A1)](#5-the-web-app-a1)
6. [UI tests (A2)](#6-ui-tests-a2)
7. [API tests (A3)](#7-api-tests-a3)
8. [SQL tests (A4)](#8-sql-tests-a4)
9. [AI self-healing](#9-ai-self-healing)
10. [CI](#10-ci)
11. [Requirements checklist](#11-requirements-checklist)
12. [Claude Code reflection](#12-claude-code-reflection)

---

## 1. Quick start

**Needs:** Node.js 22.18 or newer (developed on Node 24; see `.nvmrc`) and git. Nothing else: the SQL
scenarios use Node's built-in SQLite.

```bash
npm ci                                 # install dependencies
npx playwright install chromium        # install the test browser (once)
npm test                               # UI + API + SQL scenarios (starts the app automatically)
npm run report                         # open the Playwright HTML report
```

To use the app yourself: `npm run dev`, then open http://localhost:5173.

## 2. Commands

| Command                                       | What it does                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                                 | Start the app at http://localhost:5173                                     |
| `npm test`                                    | All UI, API and SQL scenarios                                              |
| `npm run test:ui` / `test:api` / `test:sql`   | One suite                                                                  |
| `npm run test:smoke`                          | Only scenarios tagged `@smoke`                                             |
| `npm run report`                              | Open the latest Playwright HTML report                                     |
| `npm run test:unit`                           | Vitest unit tests for the app's maths and URL handling                     |
| `npm run lint` / `typecheck` / `format:check` | Code quality checks (also run in CI)                                       |
| `npm run sql`                                 | Print every SQL query's output in the terminal                             |
| `npm run test:self-heal`                      | The deliberately broken-locator scenarios (**fail on purpose**)            |
| `npm run self-heal`                           | AI self-healing POC: detect, suggest, validate, report and patch (dry run) |
| `npm run results`                             | Run everything and refresh the committed evidence in `results/`            |

**Environments:** `TEST_ENV=ci npm test` tests the production build instead of the dev server. See
[Environment configuration](#environment-configuration).

## 3. Project structure

```text
app/                         A1: the Loan Planner web app (React + TypeScript + Vite)
  src/lib/                     loan maths (emi.ts), URL state, formatting, with unit tests
  src/components/, pages/      input fields, charts, table; dashboard and schedule pages
config/
  env.ts                       loads and validates the environment (no URLs in test code)
  environments/                local.env, ci.env, staging.env.example
tests/
  features/                    Gherkin feature files: ui/, api/, sql/, self-heal/
  steps/                       step definitions, one folder per suite
  pages/                       Page Objects: BasePage, DashboardPage, SchedulePage (+ LegacyDashboardPage ⚠️)
  api/                         PostsApiClient (the API "page object") and the payload catalogue
  sql/                         SqlSession (the database "page object") and screenshot rendering
  support/                     fixtures, hooks, per-scenario context
  utils/                       the tests' OWN loan maths and money helpers
  self-heal/                   ⚠️ broken locators + detection runtime (self-healing exercise)
sql/                         A4: schema.sql, seed.sql, query.sql per scenario + screenshots
scripts/                     self-heal CLI, results publisher, SQL runner
docs/                        API defect report, self-healing design, Claude Code working log
results/                     committed test evidence (reports, logs, screenshots)
.github/workflows/ci.yml     GitHub Actions pipeline
```

## 4. Architecture

```text
 Feature files (Gherkin, plain English)          tests/features/**/*.feature
          │  bddgen turns each scenario into a Playwright test
          ▼
 Step definitions                                tests/steps/**/*.steps.ts
          │  get page objects and helpers from fixtures (tests/support/fixtures.ts)
          ▼
 ┌──────────────────┬───────────────────┬──────────────────┬──────────────────────┐
 │ Page Objects     │ PostsApiClient    │ SqlSession       │ ScenarioContext      │
 │ DashboardPage    │ (API requests)    │ (in-memory       │ (state shared by the │
 │ SchedulePage     │                   │  SQLite per      │  steps of ONE        │
 │                  │                   │  scenario)       │  scenario)           │
 └────────┬─────────┴─────────┬─────────┴────────┬─────────┴──────────────────────┘
          ▼                   ▼                  ▼
   Loan Planner app      JSONPlaceholder      sql/<scenario>/*.sql
   (APP_BASE_URL)        (API_BASE_URL)
```

- **Runner:** [playwright-bdd](https://github.com/vitalets/playwright-bdd). Feature files and step
  definitions are standard Cucumber, but they run on Playwright's test runner. That gives parallel runs,
  retries, traces, video and the Playwright HTML report, **plus** a Cucumber HTML/JSON report from the same
  run.
- **Projects** (in [playwright.config.ts](playwright.config.ts)): `ui`, `api`, `sql` and `self-heal`. API and
  SQL scenarios only start a browser when a step needs one (fixtures are lazy).
- **Fixtures** hand each step what it needs: page objects, the API client, the SQL session and a fresh
  per-scenario context. UI fixtures also **fail a scenario if the app throws an uncaught error**.
- **Evidence:** every UI scenario keeps a screenshot. Failures also keep video, a trace and Playwright's
  `error-context.md`.

### Locator rules

1. `getByRole`, `getByLabel`, `getByText`: what a user (or screen reader) sees.
2. `getByTestId`: only for values with no accessible name of their own (amounts in cards, chart shapes).
3. **Never** positional CSS/XPath (`nth-child`, `//div[3]/span`).

The app was built for this: every input has a real label, the tabs follow the ARIA tabs pattern, and chart
shapes carry `data-testid` and `data-value`.

### Environment configuration

URLs live only in [config/environments/](config/environments/), loaded by [config/env.ts](config/env.ts):

| Variable                                  | local                                  | ci                                          |
| ----------------------------------------- | -------------------------------------- | ------------------------------------------- |
| `APP_BASE_URL`                            | `http://localhost:5173` (dev server)   | `http://localhost:4173` (production build)  |
| `API_BASE_URL`                            | `https://jsonplaceholder.typicode.com` | same                                        |
| `START_WEB_SERVER` / `WEB_SERVER_COMMAND` | `true` / `npm run dev`                 | `true` / `npm run build && npm run preview` |

`TEST_ENV` picks the file (default `local`). Any variable set in the shell overrides the file, e.g.
`APP_BASE_URL=https://staging.example.com START_WEB_SERVER=false npm test`. Missing or invalid values stop
the run with a clear message.

## 5. The web app (A1)

An EMI calculator in the spirit of emicalculator.net, with its own design and code.

| Requirement                                   | Where                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard with summarised and calculated data | **EMI Calculator** page: Home, Personal and Car loan tabs; monthly EMI, total interest and total payment; a "Loan at a Glance" panel |
| Report driven by user input                   | **Payment Schedule** page: first-EMI month and year, year-wise or month-wise breakdown                                               |
| Chart or visual                               | Principal/interest **pie chart**; yearly **stacked bar chart** with balance line and tooltip; schedule **table**                     |

- Every input has a number box **and** a slider, with validation messages (e.g. "Interest Rate must be
  between 5% and 20%.").
- The loan is kept in the URL (`?type=home&amount=2500000&rate=10&tenure=10&start=2026-01`), so every view is
  deep-linkable and survives a reload.
- Accessible: labelled inputs, keyboard-operable tabs and sliders, `prefers-reduced-motion` honoured (tests
  use it, so charts render without waiting for animations), responsive down to phone width.

![Dashboard](results/screenshots/dashboard.png)

## 6. UI tests (A2)

[tests/features/ui/](tests/features/ui/): **41 scenarios**

| Brief                                                   | Feature                         | What is checked                                                                                                                                                                                          |
| ------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page loads correctly                                    | `dashboard`, `payment-schedule` | Both pages and their sections; tab defaults; the loan carries between pages                                                                                                                              |
| Output matches **our own independently computed value** | `emi-calculation`               | EMI, total interest and total payment for 6 loans (all 3 types, smallest and largest), plus literal reference values (25L at 10% for 10y → **₹33,038**)                                                  |
| Chart visible with **non-zero, valid** data             | `charts`                        | Pie: 2 drawn slices > 0 that equal principal and interest and add to 100%. Bars: one per calendar year (5 vs 6 depending on start month), every bar drawn and > 0 and equal to our maths; tooltip values |
| Report driven by input                                  | `payment-schedule`              | Year-wise table vs our maths row by row; month-wise breakdown; reload                                                                                                                                    |
| (extra) Input validation                                | `input-validation`              | Invalid and boundary values; messages linked to inputs for screen readers                                                                                                                                |

**Independent expected values:** [tests/utils/loanMath.ts](tests/utils/loanMath.ts) never imports app code,
and it uses a **different method** (closed-form balance formula) from the app (month-by-month loop), so the
two cross-check each other. Amounts must be correctly rounded to the nearest rupee.

**Shown to catch bugs:** a deliberate 0.1% error in the app's EMI formula (₹33 on ₹33,038) made **22 of 41**
scenarios fail, and that was every scenario that checks a number. The suite was also run 3 times in a row
(123 runs) with no flaky results.

## 7. API tests (A3)

[tests/features/api/create-post.feature](tests/features/api/create-post.feature): `POST /posts` with
excessively long titles (256 to 1,000,000 characters), unsupported special characters (null byte,
control characters, lone surrogate, right-to-left override, script tag) and missing required fields, plus
extras (wrong types, malformed JSON).

**JSONPlaceholder is a fake API and accepts everything** (`201 Created`), so the brief's expected outcome
(4xx errors) is not met. The tests handle that honestly:

- **Must pass:** no server error for any valid JSON body; accepted data is stored unchanged (including
  legitimate special characters such as emoji and other scripts).
- **The brief's expectation** ("rejected with a client error") runs every time as a **known defect**
  (`@known-defect @defect:API-00x @fail`). If the API is ever fixed, Playwright reports "expected to fail,
  but passed".
- These are separate scenarios on purpose, so a real 5xx crash can never hide inside an expected failure.

**Findings** ([docs/API_DEFECTS.md](docs/API_DEFECTS.md)): API-001 to API-004 (missing fields, unlimited
title length, unsupported characters and wrong types all accepted), **API-005: malformed JSON causes a 500**,
and **API-006: the 500 response leaks a stack trace with server file paths** (a security issue).

## 8. SQL tests (A4)

[sql/](sql/README.md): **SQLite** through Node's built-in `node:sqlite`, so nothing needs installing. Each
scenario has `schema.sql`, `seed.sql` (one commented block per edge case) and `query.sql`.

| Scenario                                                             | Approach                                                                                          | Result                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Round-trip transfers:** A→B then B→A within 10% and 24 hours       | Self-join on reversed accounts; amounts in integer paise for an exact 10% test                    | 7 round trips ([screenshot](sql/screenshots/round-trip-transfers.png)) |
| **IPL streaks:** 30+ runs in 3+ consecutive matches, with start date | "Gaps and islands" with `ROW_NUMBER()`, one row per streak; plus a stricter team-schedule variant | 8 streaks ([screenshot](sql/screenshots/ipl-batting-streaks.png))      |

Every open question (10% of which amount? is exactly 24h included? does a missed match break a streak?) is
answered in [sql/README.md](sql/README.md) and tested by a named rule check. Five typical SQL mistakes were
injected one at a time, and every one was caught.

## 9. AI self-healing

[docs/SELF_HEALING.md](docs/SELF_HEALING.md) covers detection, the prompt approach and validation before applying
a fix.

- **5 locators left broken** in [tests/self-heal/legacyLocators.ts](tests/self-heal/legacyLocators.ts): a stale
  test id, a wrong role, renamed text, an absolute XPath and old CSS classes. Each is stored with an
  **intent** (what it should find).
- **Detection:** a locator must match exactly one element; otherwise the test fails and saves an incident
  (accessibility tree, test ids, screenshot).
- **POC:** `npm run self-heal` asks **Claude Code in headless mode** (`claude -p`, tools disabled, JSON-schema
  output, no API key needed) for up to 3 ranked fixes. Each is checked statically (no CSS or XPath), then
  **replayed in the failing scenario**, and must make it pass. Then all fixes are run together, and a report
  plus a git patch are written. `--apply` applies the patch only after validation. Without a Claude login it
  falls back to a non-AI matcher and says so.
- **Shown not to hide bugs:** with the EMI card removed from the app, the healer returned no fix for it.

**Result with Claude Code (Opus 5):** the model's first-ranked fix was correct for **all 5** locators, and each
passed replay and the regression run. It also explained its choices, e.g. matching the input box "not the
adjacent slider". Example run: [docs/self-healing/example-run/healing-report.md](docs/self-healing/example-run/healing-report.md).

## 10. CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push and pull request:

1. **quality:** format check, lint, type check, unit tests, production build
2. **e2e:** UI, API and SQL scenarios against the **production build** (`TEST_ENV=ci`, retries 2), with
   reports, traces and screenshots uploaded as artifacts
3. **self-heal:** runs the healer on the broken locators and uploads the healing report and patch

## 11. Requirements checklist

| Brief requirement                                                                   | Where                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Playwright framework with separate feature, step-definition and page files          | [tests/features](tests/features), [tests/steps](tests/steps), [tests/pages](tests/pages)              |
| Environment configuration, no hardcoded URLs                                        | [config/](config/)                                                                                    |
| Dynamic, resilient locators                                                         | [Locator rules](#locator-rules), [BasePage.ts](tests/pages/BasePage.ts)                               |
| 3–5 broken locators, left broken                                                    | [legacyLocators.ts](tests/self-heal/legacyLocators.ts) (5)                                            |
| Markdown: detection, prompt approach, validation                                    | [docs/SELF_HEALING.md](docs/SELF_HEALING.md)                                                          |
| Working POC (bonus)                                                                 | `npm run self-heal` · [scripts/self-heal/](scripts/self-heal/)                                        |
| A1 dashboard, input-driven report, chart                                            | [app/](app/) · [section 5](#5-the-web-app-a1)                                                         |
| A2 page loads; output vs own calculation; chart visible with valid non-zero data    | [tests/features/ui/](tests/features/ui/)                                                              |
| A3 long titles, special characters, missing userId; error codes, no server failures | [create-post.feature](tests/features/api/create-post.feature) · [API_DEFECTS.md](docs/API_DEFECTS.md) |
| A4 both SQL scenarios, schema, output screenshots                                   | [sql/](sql/README.md)                                                                                 |
| README: setup, how to run, architecture                                             | this file                                                                                             |
| Claude Code reflection                                                              | [section 12](#12-claude-code-reflection)                                                              |
| Test results in the repository                                                      | [results/](results/README.md)                                                                         |

## 12. Claude Code reflection

I used Claude Code throughout, as a pair programmer rather than a code generator. The full, phase-by-phase
log of what it did, what it got wrong and how each problem was caught is in
[docs/CLAUDE_CODE_LOG.md](docs/CLAUDE_CODE_LOG.md).

**How I used it**

- **Understanding the brief:** it summarised both sections and spotted the traps (JSONPlaceholder never
  validating; the bar count depending on the start month). I chose Section A and made the key decisions:
  playwright-bdd as the runner, known-defect handling for the API, and Claude Code (no API key) for the
  self-healing POC.
- **Building in phases:** app, framework, UI tests, API, SQL, self-healing, CI and results. Each phase was
  reviewed and committed before the next.
- **Unfamiliar territory:** gaps-and-islands window functions, playwright-bdd v9, React Router 8 internals,
  Node's built-in SQLite, and `claude -p` with JSON-schema output.

**What worked**

- **Checking reality before writing assertions:** probing JSONPlaceholder first exposed the 500 and the
  stack-trace leak; reading library source instead of guessing APIs avoided invented options.
- **Proving tests can fail:** injecting deliberate bugs (a 0.1% EMI error, five SQL mistakes, an app bug
  for the healer) showed the checks catch what they claim to.
- **Verifying in a real browser:** this found bugs that type checks and unit tests missed.

**What did not work, and needed correcting**

- **It fixed a symptom first:** a lost-update bug in Phase 1 was patched locally. The real cause (React
  Router rendering URL changes in a transition) only surfaced when a UI test caught slider key presses being
  dropped.
- **Over-complicated or wrong code:** an XPath-heavy locator helper (rejected for a test id); a scoring bug
  in the healer's matcher; a doc that silently contained the invisible U+202E character it was describing.
- **Over-claiming:** "10x smaller" (measured: 4x) and "runs unchanged on PostgreSQL/MySQL" (untested). Both
  were corrected. The lesson I took: every claim needs a run or a measurement behind it.
- **Environment limits:** the command-line Claude was logged out at first, so the healer was built with a
  clearly reported non-AI fallback rather than pretending to use AI. After logging in, the real AI run healed
  all 5 locators at the first attempt, where the fallback needed a second try on two of them.

---

<sub>The assessment brief (Streamhub's PDF) is intentionally not committed.</sub>
