import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from 'recharts';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { formatPercent, formatRupees } from '../lib/format';

interface BreakupPieChartProps {
  principal: number;
  totalInterest: number;
}

const RADIAN = Math.PI / 180;

function renderSliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) {
  const inner = Number(innerRadius);
  const radius = inner + (Number(outerRadius) - inner) / 2;
  const angle = -Number(midAngle) * RADIAN;
  const x = Number(cx) + radius * Math.cos(angle);
  const y = Number(cy) + radius * Math.sin(angle);
  return (
    <text x={x} y={y} className="chart__slice-label" textAnchor="middle" dominantBaseline="central">
      {formatPercent(Number(percent) * 100)}
    </text>
  );
}

export function BreakupPieChart({ principal, totalInterest }: BreakupPieChartProps) {
  const reducedMotion = usePrefersReducedMotion();
  const total = principal + totalInterest;
  const slices = [
    { key: 'principal', name: 'Principal Loan Amount', value: principal, color: 'var(--color-principal)' },
    { key: 'interest', name: 'Total Interest', value: totalInterest, color: 'var(--color-interest)' },
  ];
  const description = slices
    .map(
      (slice) => `${slice.name} ${formatRupees(slice.value)} (${formatPercent((slice.value / total) * 100)})`,
    )
    .join(', ');

  return (
    <figure className="chart" data-testid="breakup-pie-chart" aria-labelledby="pie-chart-title">
      <figcaption id="pie-chart-title" className="chart__title">
        Break-up of Total Payment
      </figcaption>
      <div className="chart__canvas chart__canvas--pie" role="img" aria-label={`Pie chart: ${description}`}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="90%"
              stroke="var(--color-surface)"
              strokeWidth={2}
              label={renderSliceLabel}
              labelLine={false}
              isAnimationActive={!reducedMotion}
            >
              {slices.map((slice) => (
                <Cell
                  key={slice.key}
                  fill={slice.color}
                  data-testid={`pie-slice-${slice.key}`}
                  data-value={Math.round(slice.value)}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatRupees(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend">
        {slices.map((slice) => (
          <li key={slice.key} className="chart-legend__item" data-testid={`pie-legend-${slice.key}`}>
            <span className="chart-legend__swatch" style={{ background: slice.color }} aria-hidden="true" />
            <span className="chart-legend__name">{slice.name}</span>
            <strong className="chart-legend__value" data-testid={`pie-value-${slice.key}`}>
              {formatRupees(slice.value)}
            </strong>
            <span className="chart-legend__share" data-testid={`pie-share-${slice.key}`}>
              {formatPercent((slice.value / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
