import type { LoanSummary } from '../lib/emi';
import { formatRupees } from '../lib/format';

interface SummaryCardsProps {
  summary: LoanSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { id: 'emi', label: 'Monthly EMI', value: summary.emi, note: 'Equated monthly instalment' },
    {
      id: 'total-interest',
      label: 'Total Interest Payable',
      value: summary.totalInterest,
      note: 'Over the full tenure',
    },
    {
      id: 'total-payment',
      label: 'Total Payment',
      value: summary.totalPayment,
      note: 'Principal + Interest',
    },
  ];

  return (
    <dl className="summary" aria-label="Loan summary">
      {cards.map((card) => (
        <div key={card.id} className="summary__card" data-testid={`summary-${card.id}`}>
          <dt className="summary__label">{card.label}</dt>
          <dd className="summary__value" data-testid={`${card.id}-value`}>
            {formatRupees(card.value)}
          </dd>
          <dd className="summary__note">{card.note}</dd>
        </div>
      ))}
    </dl>
  );
}
