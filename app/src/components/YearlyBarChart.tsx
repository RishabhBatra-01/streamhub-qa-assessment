import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type { YearlyRow } from '../lib/emi';
import { formatIndianWords, formatPercent, formatRupees } from '../lib/format';

interface YearlyBarChartProps {
  rows: YearlyRow[];
}

function shortRupees(value: number): string {
  return value === 0
    ? '₹0'
    : `₹${formatIndianWords(value).replace(' Thousand', 'K').replace(' Lakh', 'L').replace(' Crore', 'Cr')}`;
}

function YearTooltip({ active, payload }: TooltipContentProps) {
  const row = payload?.[0]?.payload as YearlyRow | undefined;
  if (!active || !row) return null;
  return (
    <div className="chart-tooltip" data-testid="bar-chart-tooltip">
      <p className="chart-tooltip__title" data-testid="tooltip-year">
        Year: {row.year}
      </p>
      <dl className="chart-tooltip__list">
        <dt>Principal</dt>
        <dd data-testid="tooltip-principal">{formatRupees(row.principalPaid)}</dd>
        <dt>Interest</dt>
        <dd data-testid="tooltip-interest">{formatRupees(row.interestPaid)}</dd>
        <dt>Total Payment</dt>
        <dd data-testid="tooltip-total">{formatRupees(row.payment)}</dd>
        <dt>Balance</dt>
        <dd data-testid="tooltip-balance">{formatRupees(row.balance)}</dd>
        <dt>Loan Paid</dt>
        <dd data-testid="tooltip-loan-paid">{formatPercent(row.loanPaidPercent, 2)}</dd>
      </dl>
    </div>
  );
}

/** Stacked principal/interest bars per calendar year, with the outstanding balance as a line. */
export function YearlyBarChart({ rows }: YearlyBarChartProps) {
  const reducedMotion = usePrefersReducedMotion();
  const firstYear = rows[0]?.year;
  const lastYear = rows.at(-1)?.year;

  return (
    <figure className="chart" data-testid="yearly-bar-chart" aria-labelledby="bar-chart-title">
      <figcaption id="bar-chart-title" className="chart__title">
        Year-wise Principal, Interest and Balance
      </figcaption>
      <div
        className="chart__canvas chart__canvas--bar"
        role="img"
        aria-label={`Bar chart of ${rows.length} years from ${firstYear} to ${lastYear}. Year-by-year figures are in the payment schedule table.`}
      >
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={rows} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" />
            <YAxis yAxisId="amount" tickFormatter={shortRupees} width={60} />
            <YAxis yAxisId="balance" orientation="right" tickFormatter={shortRupees} width={60} />
            <Tooltip content={YearTooltip} cursor={{ fillOpacity: 0.08 }} />
            <Legend />
            <Bar
              yAxisId="amount"
              dataKey="principalPaid"
              name="Principal"
              stackId="payment"
              fill="var(--color-principal)"
              isAnimationActive={!reducedMotion}
            >
              {rows.map((row) => (
                <Cell
                  key={row.year}
                  data-testid={`bar-principal-${row.year}`}
                  data-value={Math.round(row.principalPaid)}
                />
              ))}
            </Bar>
            <Bar
              yAxisId="amount"
              dataKey="interestPaid"
              name="Interest"
              stackId="payment"
              fill="var(--color-interest)"
              isAnimationActive={!reducedMotion}
            >
              {rows.map((row) => (
                <Cell
                  key={row.year}
                  data-testid={`bar-interest-${row.year}`}
                  data-value={Math.round(row.interestPaid)}
                />
              ))}
            </Bar>
            <Line
              yAxisId="balance"
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="var(--color-balance)"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={!reducedMotion}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
