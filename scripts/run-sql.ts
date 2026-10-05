/**
 * Prints the output of every SQL scenario query in the terminal.
 *   npm run sql
 * Each query runs against a fresh in-memory SQLite database built from the scenario's
 * schema.sql and seed.sql. (The automated checks are in tests/features/sql.)
 */
import { SqlSession } from '../tests/sql/SqlSession.ts';

const QUERIES: [scenario: string, file: string][] = [
  ['round-trip-transfers', 'query.sql'],
  ['ipl-batting-streaks', 'query.sql'],
  ['ipl-batting-streaks', 'query-team-schedule.sql'],
];

const session = new SqlSession();
try {
  for (const [scenario, file] of QUERIES) {
    session.open(scenario);
    const { rows } = session.runQueryFile(file);
    console.log(`\n=== sql/${scenario}/${file} (${rows.length} rows, SQLite ${session.sqliteVersion()})`);
    console.table(rows);
  }
} finally {
  session.close();
}
