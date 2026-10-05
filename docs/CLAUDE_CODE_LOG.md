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
