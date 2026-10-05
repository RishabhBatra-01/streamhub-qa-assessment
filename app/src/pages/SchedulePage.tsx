import { useId, useMemo } from 'react';
import { Link } from 'react-router';
import { ScheduleTable } from '../components/ScheduleTable';
import { YearlyBarChart } from '../components/YearlyBarChart';
import { useLoanParams } from '../hooks/useLoanParams';
import { buildMonthlySchedule, groupScheduleByYear, summarizeLoan } from '../lib/emi';
import { MONTH_NAMES, formatNumber, formatRupees } from '../lib/format';
import { getLoanType } from '../lib/loanTypes';

const YEARS_AROUND_TODAY = 10;

export function SchedulePage() {
  const { loan, updateLoan, updateParams, loanSearch, searchParams } = useLoanParams();
  const config = getLoanType(loan.type);
  const months = loan.tenure * 12;
  const ids = { month: useId(), year: useId(), breakdown: useId() };

  const { summary, monthly, yearly } = useMemo(() => {
    const input = { principal: loan.amount, annualRatePercent: loan.rate, months };
    const monthlyRows = buildMonthlySchedule(input, loan.start);
    return {
      summary: summarizeLoan(input),
      monthly: monthlyRows,
      yearly: groupScheduleByYear(monthlyRows, loan.amount),
    };
  }, [loan.amount, loan.rate, months, loan.start]);

  const startYearOptions = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const years = new Set<number>([loan.start.year]);
    for (let year = thisYear - YEARS_AROUND_TODAY; year <= thisYear + YEARS_AROUND_TODAY; year++)
      years.add(year);
    return [...years].sort((a, b) => a - b);
  }, [loan.start.year]);

  // Ignore a breakdown year that is not part of this schedule (e.g. after the start month changed).
  const requestedYear = Number(searchParams.get('breakdown'));
  const breakdownYear = yearly.some((row) => row.year === requestedYear) ? requestedYear : null;

  const setBreakdown = (value: string) => {
    updateParams((current) => {
      if (value === 'all') current.delete('breakdown');
      else current.set('breakdown', value);
      return current;
    });
  };

  return (
    <>
      <title>Payment Schedule · Loan Planner</title>
      <div className="page-heading">
        <h1>Payment Schedule</h1>
        <p className="page-heading__lead" data-testid="loan-description">
          {config.label} of <strong>{formatRupees(loan.amount)}</strong> at{' '}
          <strong>{formatNumber(loan.rate)}%</strong> for{' '}
          <strong>
            {loan.tenure} {loan.tenure === 1 ? 'year' : 'years'}
          </strong>{' '}
          · EMI <strong data-testid="schedule-emi">{formatRupees(summary.emi)}</strong>
        </p>
        <Link className="link" to={{ pathname: '/', search: loanSearch }}>
          Change loan details
        </Link>
      </div>

      <section className="card" aria-label="Schedule options">
        <form className="filters" onSubmit={(event) => event.preventDefault()}>
          <fieldset className="filters__group">
            <legend>Schedule showing EMI payments starting from</legend>
            <div className="filters__row">
              <label htmlFor={ids.month}>Start month</label>
              <select
                id={ids.month}
                value={loan.start.month}
                onChange={(event) =>
                  updateLoan({ start: { ...loan.start, month: Number(event.target.value) } })
                }
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <label htmlFor={ids.year}>Start year</label>
              <select
                id={ids.year}
                value={loan.start.year}
                onChange={(event) =>
                  updateLoan({ start: { ...loan.start, year: Number(event.target.value) } })
                }
              >
                {startYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <div className="filters__group">
            <label htmlFor={ids.breakdown} className="filters__label">
              Breakdown
            </label>
            <select
              id={ids.breakdown}
              value={breakdownYear ?? 'all'}
              onChange={(event) => setBreakdown(event.target.value)}
            >
              <option value="all">All years (year-wise)</option>
              {yearly.map((row) => (
                <option key={row.year} value={row.year}>
                  {row.year} (month-wise)
                </option>
              ))}
            </select>
          </div>
        </form>
      </section>

      <section className="card" aria-label="Year-wise chart">
        <YearlyBarChart rows={yearly} />
      </section>

      <section className="card" aria-label="Payment schedule table">
        {breakdownYear === null ? (
          <ScheduleTable mode="yearly" rows={yearly} />
        ) : (
          <ScheduleTable
            mode="monthly"
            year={breakdownYear}
            rows={monthly.filter((row) => row.year === breakdownYear)}
            principal={loan.amount}
          />
        )}
      </section>
    </>
  );
}
