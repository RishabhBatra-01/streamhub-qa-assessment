import type { ColumnInfo, QueryResult, SqlValue } from './SqlSession';

/**
 * Builds small, self-contained HTML pages that show SQL results (and the schema) as a
 * readable table. The tests open them in the browser and save screenshots as evidence.
 * Nothing here is dynamic (no dates), so re-running the tests gives identical images.
 */

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const cell = (value: SqlValue) =>
  value === null ? '<td class="null">NULL</td>' : `<td>${escapeHtml(String(value))}</td>`;

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; font: 14px/1.45 -apple-system, "Segoe UI", Roboto, sans-serif;
         color: #1b2333; background: #f4f6fb; }
  .card { background: #fff; border: 1px solid #dfe4ee; border-radius: 12px; padding: 22px 24px; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .meta { margin: 0 0 18px; color: #5b667a; }
  h2 { margin: 22px 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #5b667a; }
  pre { margin: 0; padding: 14px 16px; background: #0f172a; color: #e2e8f0; border-radius: 8px;
        font: 12.5px/1.5 "SF Mono", Menlo, Consolas, monospace; white-space: pre-wrap; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { padding: 7px 10px; border: 1px solid #dfe4ee; text-align: left; white-space: nowrap; }
  th { background: #eef2fb; font-weight: 600; }
  tr:nth-child(even) td { background: #fafbfe; }
  td.null { color: #98a2b3; font-style: italic; }
  .count { margin-top: 10px; color: #5b667a; }
  .tables { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
  .yes { color: #0f766e; font-weight: 600; }
`;

function page(title: string, meta: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>${STYLES}</style></head><body><div class="card">
<h1>${escapeHtml(title)}</h1><p class="meta">${escapeHtml(meta)}</p>${body}</div></body></html>`;
}

export function renderQueryResult(title: string, meta: string, result: QueryResult): string {
  const header = result.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = result.rows
    .map((row) => `<tr>${result.columns.map((column) => cell(row[column] ?? null)).join('')}</tr>`)
    .join('');
  const count = `${result.rows.length} row${result.rows.length === 1 ? '' : 's'}`;
  return page(
    title,
    meta,
    `<h2>Query</h2><pre>${escapeHtml(result.sql)}</pre>
     <h2>Output</h2><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
     <p class="count">${count}</p>`,
  );
}

export function renderSchema(
  title: string,
  meta: string,
  tables: { name: string; columns: ColumnInfo[] }[],
): string {
  const sections = tables
    .map(
      (table) => `<div><h2>${escapeHtml(table.name)}</h2><table>
        <thead><tr><th>column</th><th>type</th><th>not null</th><th>primary key</th></tr></thead>
        <tbody>${table.columns
          .map(
            (column) =>
              `<tr><td>${escapeHtml(column.name)}</td><td>${escapeHtml(column.type)}</td>` +
              `<td class="${column.notNull ? 'yes' : ''}">${column.notNull ? 'yes' : ''}</td>` +
              `<td class="${column.primaryKey ? 'yes' : ''}">${column.primaryKey ? 'yes' : ''}</td></tr>`,
          )
          .join('')}</tbody></table></div>`,
    )
    .join('');
  return page(title, meta, `<div class="tables">${sections}</div>`);
}
