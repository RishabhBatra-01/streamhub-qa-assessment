import type { MonthlyRow, YearlyRow } from '../lib/emi';
import { formatMonthYear, formatPercent, formatRupees } from '../lib/format';

type ScheduleTableProps =
  | { mode: 'yearly'; rows: YearlyRow[] }
  | { mode: 'monthly'; year: number; rows: MonthlyRow[]; principal: number };

export function ScheduleTable(props: ScheduleTableProps) {
  const caption =
    props.mode === 'yearly' ? 'Year-wise payment schedule' : `Month-wise payment schedule for ${props.year}`;

  return (
    <div className="table-wrap">
      <table className="schedule-table" data-testid="schedule-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{props.mode === 'yearly' ? 'Year' : 'Month'}</th>
            <th scope="col">Principal (A)</th>
            <th scope="col">Interest (B)</th>
            <th scope="col">Total Payment (A + B)</th>
            <th scope="col">Balance</th>
            <th scope="col">Loan Paid To Date</th>
          </tr>
        </thead>
        <tbody>
          {props.mode === 'yearly'
            ? props.rows.map((row) => (
                <tr key={row.year} data-testid={`schedule-row-${row.year}`}>
                  <th scope="row">{row.year}</th>
                  <td>{formatRupees(row.principalPaid)}</td>
                  <td>{formatRupees(row.interestPaid)}</td>
                  <td>{formatRupees(row.payment)}</td>
                  <td>{formatRupees(row.balance)}</td>
                  <td>{formatPercent(row.loanPaidPercent, 2)}</td>
                </tr>
              ))
            : props.rows.map((row) => (
                <tr key={row.instalment} data-testid={`schedule-row-${row.year}-${row.month + 1}`}>
                  <th scope="row">{formatMonthYear(row.year, row.month)}</th>
                  <td>{formatRupees(row.principalPaid)}</td>
                  <td>{formatRupees(row.interestPaid)}</td>
                  <td>{formatRupees(row.payment)}</td>
                  <td>{formatRupees(row.balance)}</td>
                  <td>{formatPercent(((props.principal - row.balance) / props.principal) * 100, 2)}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
