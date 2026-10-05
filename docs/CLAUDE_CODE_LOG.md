# Claude Code working log

A running record of how Claude Code was used on this project: what it was asked to do, what it got right,
and where it was wrong and had to be corrected. The README's "Claude Code reflection" section is written
from these notes.

## Phase 0: Reading the brief

- **Used for:** a first pass over the assessment PDF, and comparing Section A with Section B.
- **Caught before writing any code:** the A3 "expected outcome" (proper 4xx errors for invalid posts)
  does not match how JSONPlaceholder actually behaves. Quick `curl` probes showed **201 Created** for a
  missing `userId`, an empty body, special characters and a 200,000-character title, and **500** for
  malformed JSON. Decision: assert the brief's expectation, mark those checks as known defects, and
  write a defect report, rather than quietly asserting 201 so the suite goes green.
- **Ambiguity flagged:** in the emicalculator-style bar chart, the number of bars depends on the start
  month (a 5-year loan starting in June spans 6 calendar years). This is now covered by a unit test.

## Phase 1: Building the web app

- **Used for:** scaffolding the Vite + React + TypeScript app, the EMI maths, the charts and the styling.
- **Library versions newer than the model's experience** (React Router 8, Vite 8 with Rolldown,
  TypeScript 6, Recharts 3). Instead of trusting memory, the exports and config options were checked in
  `node_modules` before they were used (e.g. `useSearchParams` internals, Rolldown `codeSplitting`).
- **Bug found by checking in a real browser, not by the type checker or unit tests:** two quick dropdown
  changes on the schedule page (breakdown year, then start month) lost the first change. Cause: React
  Router's functional `setSearchParams` starts from the params of the _last render_, and its navigations
  render in a transition, so the second update was built from stale params. A fast Playwright test would
  have hit this as a flaky failure. Fix: build every URL update from `window.location.search`
  (`app/src/hooks/useLoanParams.ts`).
- **Chart appeared blank in the first screenshot:** the pie chart was mid-animation, not broken. The
  charts now honour `prefers-reduced-motion`, so UI tests can turn animation off and avoid timing waits.
- **Testability decision:** the expected values in the UI tests must be computed by the tests' own code,
  never by importing the app's `emi.ts`. Otherwise a bug in the app's maths would also be in the
  "expected" value and the test would still pass.

## Phase 2: Test framework

- **Used for:** wiring Playwright + playwright-bdd (projects, reporters, fixtures), the environment loader,
  and the base page object.
- **Checked the real API instead of guessing:** playwright-bdd is at v9. Its config options, the
  `cucumberReporter` options and `defineBddProject` were read from the package's type definitions. This
  showed it needs no separate `@cucumber/cucumber` install, and that it ships an `aiFix` prompt option,
  which is relevant to the self-healing phase.
- **First draft replaced:** the first version of the API steps kept the last response in a module-level
  `WeakMap` keyed by `testInfo`. It worked, but it was not idiomatic and was hard to read. It was replaced
  with a typed, per-scenario `ScenarioContext` fixture.
- **Failure path proven, not assumed:** a temporary, deliberately failing feature (then deleted) confirmed
  that a failed scenario keeps a screenshot, video, trace and `error-context.md`, and that an uncaught
  error thrown by the app fails the scenario even when its assertions pass.
- **Note for Phase 6:** Playwright's `error-context.md` holds an accessibility snapshot of the page at the
  moment of failure, which is useful input for an AI locator-healing prompt.

## Phase 3: UI tests

- **Used for:** writing the feature files, page objects and step definitions, and the tests' own loan maths.
- **The tests found a real app bug.** Pressing the slider's right-arrow key 4 times moved it only 2 steps.
  A user holding the arrow key down would also lose steps. Root cause: React Router v8's `BrowserRouter`
  renders URL changes in a React transition (low priority) unless `useTransitions={false}` is set. The
  form inputs are bound to the URL, so after each key press React briefly restored the old value. This
  was the _same root cause_ as the lost-dropdown bug in Phase 1. The Phase 1 fix (build updates from
  `window.location`) had only treated the symptom. Fixed at the source in `app/src/main.tsx`, then the
  scenario was re-run 5 times to confirm.
- **Over-complicated code from the AI, rejected:** the first version of `DashboardPage.glanceValue()`
  chained `.filter()`, `.and()` and an XPath parent lookup. It was hard to read and fragile, which goes
  against the brief's locator guidance. Replaced with the existing `data-testid`s.
- **Independent expected values, done properly:** `tests/utils/loanMath.ts` does not import app code, and
  it uses a _different method_ (closed-form balance formula) from the app (month-by-month loop), so the
  two implementations genuinely cross-check each other. The reference-value scenario adds literal figures
  worked out separately, guarding against a mistake shared by both.
- **Rounding tolerance chosen deliberately:** a first draft allowed "within ₹1". That was tightened to
  "correctly rounded to the nearest rupee" (`toBeCloseTo(x, 0)`, i.e. within ₹0.50), so a real
  off-by-one-rupee bug would not slip through.
- **Proved the tests can fail:** a deliberate 0.1% error was injected into the app's EMI formula (about
  ₹33 on a ₹33,038 EMI) and then reverted. 22 of 41 UI scenarios failed: every scenario that checks
  numbers. The 19 that passed only check navigation, page structure and validation messages, as
  expected.
- **Flakiness check:** the full UI suite was run 3 times in a row (123 runs, all passed), and once
  against the production build in CI mode.

## Phase 4: API tests (JSONPlaceholder)

- **Used for:** probing the real API, designing the scenarios and payload catalogue, the step definitions
  and the defect report.
- **Probed before asserting.** `curl` probes showed 201 for everything that is valid JSON (even a
  5,000,000-character title), and a `500` for malformed JSON whose body **leaks a Node.js stack trace with
  server file paths**. That security finding (API-006) only exists because the actual response was read
  instead of assumed.
- **Test design decision:** "does not cause a server error" and "is rejected with a client error" are
  _separate_ scenarios. If they were combined in one `@fail` (expected-failure) scenario, a real 5xx crash
  would be hidden as "failed as expected".
- **Expected failures verified, not assumed:** each `@fail` scenario's failure reason was extracted from
  the JSON report. All 17 rejection checks fail on `201 Created`, and the 4 malformed-body checks fail on
  `500`, so none of them "fails as expected" because of a typo or a broken step.
- **Judgement over the literal brief:** the brief lists "unsupported special characters" as invalid. Not
  every special character is, though: emoji, non-Latin scripts, quotes and SQL-looking text are
  legitimate titles and are tested as _accepted and stored unchanged_. Only genuinely unsupported
  characters (null byte, control characters, lone surrogate, right-to-left override, script tag) are
  expected to be rejected.
- **AI mistake caught:** while writing `docs/API_DEFECTS.md`, the escape sequence for the right-to-left
  override character was written into the file as the **literal invisible U+202E character**, which is the
  very spoofing character being reported, and it silently reversed part of a table row. Found by checking
  the file, then replaced with escaped text. The whole repo was then scanned for invisible control or
  direction characters (clean).
- **Smaller fixes:** a feature-description line that started with `@known-defect` was parsed by Gherkin as
  a tag. The API base URL now gets a trailing slash, so relative paths work under any base path
  (`https://host/api/`). Cucumber has no "expected failure" status, so known-defect scenarios now carry an
  explicit "KNOWN DEFECT: this failure is expected" attachment in that report.

## Phase 5: SQL

- **Used for:** designing the schemas and edge-case seed data, the window-function ("gaps and islands")
  query for the streaks, the BDD checks and the screenshot rendering.
- **Data designed backwards from the rules.** Every rule and assumption (exactly 10%, exactly 24 hours,
  return before original, two qualifying returns, exactly 30 runs, a 29, a missed match, a run crossing
  from 2023 into 2024) has its own commented block in `seed.sql`, and its own named rule check in the
  feature file.
- **A database quirk found through the screenshots:** the schema screenshot showed `team_code TEXT PRIMARY
KEY` as nullable. SQLite, unlike most databases, allows NULL in a non-INTEGER primary key. A quick check
  confirmed that an account with a NULL id was accepted. Fixed with explicit `NOT NULL`, and covered by
  new constraint tests.
- **Strict SQLite caught a habit:** Node's bundled SQLite rejects double-quoted string literals. The first
  probe used `"x"` for a string, which other SQLite builds silently accept, and it failed. All SQL now
  uses standard single quotes.
- **Step wording bug:** `streak(s)` in a Cucumber expression means "streak or streaks", so the literal text
  "1 streak(s)" in the feature did not match. The step was reworded.
- **Proved the checks catch real mistakes:** five common SQL bugs were each injected and reverted
  (exclusive 24h window, exclusive 10% bound, return allowed before the original, missing season filter,
  `> 30` instead of `>= 30`). Each one made 2–3 named rule checks fail.
- **Over-claim removed:** a first draft of `sql/README.md` said the streak query "runs unchanged on
  PostgreSQL, MySQL and SQL Server". That had not been tested, so it was reworded to say it has only
  been run on SQLite.
