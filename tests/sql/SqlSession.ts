import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';

/** The sql/ folder: one sub-folder per scenario with schema.sql, seed.sql and query files. */
export const SQL_ROOT = fileURLToPath(new URL('../../sql/', import.meta.url));

export type SqlValue = string | number | null;

export interface QueryResult {
  /** The SQL text that was run. */
  sql: string;
  columns: string[];
  rows: Record<string, SqlValue>[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
}

/**
 * Node's built-in SQLite (node:sqlite) prints an "experimental feature" warning when
 * it loads. It is stable for this use, so only that one warning is silenced.
 */
function loadSqlite(): typeof import('node:sqlite') {
  const emitWarning = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    if (String(warning).includes('SQLite is an experimental feature')) return;
    return (emitWarning as (...args: unknown[]) => void).call(process, warning, ...rest);
  }) as typeof process.emitWarning;
  try {
    return createRequire(import.meta.url)('node:sqlite');
  } finally {
    process.emitWarning = emitWarning;
  }
}

/**
 * A fresh in-memory SQLite database for one SQL scenario: the database equivalent of a
 * page object. Each test scenario gets its own database, so tests never affect each other.
 */
export class SqlSession {
  private db?: DatabaseSync;
  private scenarioDir?: string;
  private result?: QueryResult;
  private lastQueryFile?: string;

  /** Creates the tables from schema.sql and loads seed.sql. */
  open(scenario: string): void {
    if (!/^[a-z0-9-]+$/.test(scenario)) throw new Error(`Invalid SQL scenario name "${scenario}"`);
    this.close();
    this.scenarioDir = path.join(SQL_ROOT, scenario);
    const { DatabaseSync } = loadSqlite();
    this.db = new DatabaseSync(':memory:');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(this.readFile('schema.sql'));
    this.db.exec(this.readFile('seed.sql'));
  }

  get scenario(): string {
    return path.basename(this.requireScenarioDir());
  }

  /** Runs a query file from the scenario folder and keeps its result. */
  runQueryFile(fileName: string): QueryResult {
    const sql = this.readFile(fileName);
    this.lastQueryFile = fileName;
    const statement = this.database.prepare(sql);
    const rows = statement.all() as Record<string, SqlValue>[];
    this.result = { sql: sql.trim(), columns: statement.columns().map((column) => column.name), rows };
    return this.result;
  }

  /** Runs a single statement and returns the error message, or null if it succeeded. */
  tryExecute(sql: string): string | null {
    try {
      this.database.exec(sql);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  /** The query file behind lastResult, e.g. "query.sql". */
  get lastQuery(): string {
    if (!this.lastQueryFile) throw new Error('No query has been run yet.');
    return this.lastQueryFile;
  }

  get lastResult(): QueryResult {
    if (!this.result) throw new Error('No query has been run yet.');
    return this.result;
  }

  tables(): string[] {
    const rows = this.database
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid",
      )
      .all() as { name: string }[];
    return rows.map((row) => row.name);
  }

  columnsOf(table: string): ColumnInfo[] {
    if (!this.tables().includes(table)) throw new Error(`Unknown table "${table}"`);
    const rows = this.database.prepare(`PRAGMA table_info(${table})`).all() as {
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }[];
    return rows.map((row) => ({
      name: row.name,
      type: row.type,
      notNull: row.notnull === 1,
      primaryKey: row.pk > 0,
    }));
  }

  sqliteVersion(): string {
    return (this.database.prepare('SELECT sqlite_version() AS version').get() as { version: string }).version;
  }

  close(): void {
    this.db?.close();
    this.db = undefined;
    this.result = undefined;
    this.lastQueryFile = undefined;
  }

  private get database(): DatabaseSync {
    if (!this.db) throw new Error('No database open: a "Given the ... database" step must run first.');
    return this.db;
  }

  private requireScenarioDir(): string {
    if (!this.scenarioDir) throw new Error('No SQL scenario opened yet.');
    return this.scenarioDir;
  }

  private readFile(fileName: string): string {
    if (!/^[a-z0-9-]+\.sql$/.test(fileName)) throw new Error(`Invalid SQL file name "${fileName}"`);
    return readFileSync(path.join(this.requireScenarioDir(), fileName), 'utf8');
  }
}
