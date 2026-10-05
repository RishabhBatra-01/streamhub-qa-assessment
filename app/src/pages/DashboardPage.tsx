import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BreakupPieChart } from '../components/BreakupPieChart';
import { LoanInputField } from '../components/LoanInputField';
import { LoanTypeTabs } from '../components/LoanTypeTabs';
import { SummaryCards } from '../components/SummaryCards';
import { useLoanParams } from '../hooks/useLoanParams';
import { summarizeLoan } from '../lib/emi';
import { formatMonthYear, formatPercent } from '../lib/format';
import { getLoanType, type LoanTypeId } from '../lib/loanTypes';

type FieldName = 'amount' | 'rate' | 'tenure';

const PANEL_ID = 'loan-panel';

export function DashboardPage() {
  const { loan, updateLoan, switchLoanType, loanSearch } = useLoanParams();
  const config = getLoanType(loan.type);
  const [invalidFields, setInvalidFields] = useState<ReadonlySet<FieldName>>(new Set());
  const months = loan.tenure * 12;

  const summary = useMemo(
    () => summarizeLoan({ principal: loan.amount, annualRatePercent: loan.rate, months }),
    [loan.amount, loan.rate, months],
  );

  const lastEmiIndex = loan.start.month + months - 1;
  const lastEmi = { year: loan.start.year + Math.floor(lastEmiIndex / 12), month: lastEmiIndex % 12 };
  const hasErrors = invalidFields.size > 0;

  const setFieldValidity = (field: FieldName) => (valid: boolean) => {
    setInvalidFields((current) => {
      if (valid === !current.has(field)) return current;
      const next = new Set(current);
      if (valid) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const handleSelectType = (type: LoanTypeId) => {
    setInvalidFields(new Set());
    switchLoanType(type);
  };

  return (
    <>
      <title>EMI Calculator · Loan Planner</title>
      <div className="page-heading">
        <h1>EMI Calculator</h1>
        <p className="page-heading__lead">
          Work out your monthly instalment, total interest and total payment for a home, personal or car loan.
        </p>
      </div>

      <section className="card calculator" aria-label="EMI calculator">
        <LoanTypeTabs selected={loan.type} panelId={PANEL_ID} onSelect={handleSelectType} />

        <div id={PANEL_ID} role="tabpanel" aria-labelledby={`tab-${loan.type}`} className="calculator__panel">
          <form
            className="calculator__inputs"
            aria-label="Loan details"
            onSubmit={(event) => event.preventDefault()}
          >
            <LoanInputField
              key={`${loan.type}-amount`}
              label={config.amountLabel}
              value={loan.amount}
              range={config.amount}
              unit="rupees"
              onChange={(amount) => updateLoan({ amount })}
              onValidityChange={setFieldValidity('amount')}
            />
            <LoanInputField
              key={`${loan.type}-rate`}
              label="Interest Rate"
              value={loan.rate}
              range={config.rate}
              unit="percent"
              onChange={(rate) => updateLoan({ rate })}
              onValidityChange={setFieldValidity('rate')}
            />
            <LoanInputField
              key={`${loan.type}-tenure`}
              label="Loan Tenure"
              value={loan.tenure}
              range={config.tenure}
              unit="years"
              onChange={(tenure) => updateLoan({ tenure })}
              onValidityChange={setFieldValidity('tenure')}
            />
          </form>

          <div className="calculator__results" aria-live="polite">
            {hasErrors ? (
              <p className="results-placeholder" role="status" data-testid="results-placeholder">
                Fix the highlighted {invalidFields.size === 1 ? 'field' : 'fields'} to see your EMI.
              </p>
            ) : (
              <>
                <SummaryCards summary={summary} />
                <BreakupPieChart principal={loan.amount} totalInterest={summary.totalInterest} />
              </>
            )}
          </div>
        </div>
      </section>

      {!hasErrors && (
        <section className="card glance" aria-labelledby="glance-title">
          <h2 id="glance-title">Loan at a Glance</h2>
          <dl className="glance__grid">
            <div>
              <dt>Loan Type</dt>
              <dd data-testid="glance-loan-type">{config.label}</dd>
            </div>
            <div>
              <dt>Number of EMIs</dt>
              <dd data-testid="glance-emi-count">{months}</dd>
            </div>
            <div>
              <dt>Interest as % of Principal</dt>
              <dd data-testid="glance-interest-ratio">
                {formatPercent((summary.totalInterest / loan.amount) * 100)}
              </dd>
            </div>
            <div>
              <dt>First EMI</dt>
              <dd data-testid="glance-first-emi">{formatMonthYear(loan.start.year, loan.start.month)}</dd>
            </div>
            <div>
              <dt>Last EMI</dt>
              <dd data-testid="glance-last-emi">{formatMonthYear(lastEmi.year, lastEmi.month)}</dd>
            </div>
          </dl>
          <Link className="button" to={{ pathname: '/schedule', search: loanSearch }}>
            View payment schedule
          </Link>
        </section>
      )}
    </>
  );
}
