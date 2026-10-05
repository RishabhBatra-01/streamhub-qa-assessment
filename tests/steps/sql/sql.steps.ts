import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { DataTable, defineParameterType } from 'playwright-bdd';
import { renderQueryResult, renderSchema } from '../../sql/renderSqlEvidence';
import { SQL_ROOT, type SqlSession } from '../../sql/SqlSession';
import { Given, Then, When } from '../../support/fixtures';

const SCREENSHOT_DIR = path.join(SQL_ROOT, 'screenshots');

defineParameterType({
  name: 'outcome',
  regexp: /reported|not reported/,
  transformer: (text: string) => text === 'reported',
});

/** Every value as text, the way it appears in a feature-file table. */
function resultAsTable(sql: SqlSession): string[][] {
  const { columns, rows } = sql.lastResult;
  return [columns, ...rows.map((row) => columns.map((column) => String(row[column] ?? 'NULL')))];
}

/** Renders HTML in the browser and saves a screenshot to sql/screenshots and the report. */
async function saveEvidence(page: Page, testInfo: TestInfo, html: string, name: string): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Invalid screenshot name "${name}"`);
  await page.setViewportSize({ width: 1500, height: 600 });
  await page.setContent(html);
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.locator('.card').screenshot({ path: file });
  await testInfo.attach(`${name}.png`, { path: file, contentType: 'image/png' });
}

Given('the {string} database with its sample data', async ({ sql }, scenario: string) => {
  sql.open(scenario);
});

When('I run {string}', async ({ sql }, fileName: string) => {
  sql.runQueryFile(fileName);
});

When('I try to run {string}', async ({ sql, scenario }, statement: string) => {
  scenario.sqlError = sql.tryExecute(statement);
});

Then('the database rejects it with an error containing {string}', async ({ scenario }, expected: string) => {
  expect(scenario.sqlError, 'the statement should have been rejected').not.toBeNull();
  expect(scenario.sqlError).toContain(expected);
});

Then('the database has the tables {string}', async ({ sql }, list: string) => {
  expect(sql.tables()).toEqual(list.split(',').map((name) => name.trim()));
});

Then('the result has exactly these rows:', async ({ sql }, table: DataTable) => {
  // Same columns, same rows, same order: one comparison gives a clear diff on failure.
  expect(resultAsTable(sql)).toEqual(table.raw());
});

Then('the first columns are {string}', async ({ sql }, list: string) => {
  const expected = list.split(',').map((name) => name.trim());
  expect(sql.lastResult.columns.slice(0, expected.length)).toEqual(expected);
});

Then(
  'transactions {int} and {int} are {outcome} as a round trip',
  async ({ sql }, original: number, returned: number, reported: boolean) => {
    const pairs = sql.lastResult.rows.map((row) => `${row.original_txn}->${row.return_txn}`);
    if (reported) expect(pairs).toContain(`${original}->${returned}`);
    else expect(pairs).not.toContain(`${original}->${returned}`);
  },
);

Then('the number of streaks for {string} is {int}', async ({ sql }, player: string, streaks: number) => {
  const rows = sql.lastResult.rows.filter((row) => row.player_name === player);
  expect(rows, `${player}'s streaks`).toHaveLength(streaks);
});

Then('I save a screenshot of the result as {string}', async ({ sql, page, $testInfo }, name: string) => {
  const html = renderQueryResult(
    `${sql.scenario}: ${sql.lastQuery}`,
    `SQLite ${sql.sqliteVersion()} · sql/${sql.scenario}/schema.sql + seed.sql`,
    sql.lastResult,
  );
  await saveEvidence(page, $testInfo, html, name);
});

Then('I save a screenshot of the schema as {string}', async ({ sql, page, $testInfo }, name: string) => {
  const tables = sql.tables().map((table) => ({ name: table, columns: sql.columnsOf(table) }));
  const html = renderSchema(
    `${sql.scenario}: table schema`,
    `SQLite ${sql.sqliteVersion()} · created from sql/${sql.scenario}/schema.sql`,
    tables,
  );
  await saveEvidence(page, $testInfo, html, name);
});
