import { useRef, type KeyboardEvent } from 'react';
import { LOAN_TYPES, type LoanTypeId } from '../lib/loanTypes';

interface LoanTypeTabsProps {
  selected: LoanTypeId;
  panelId: string;
  onSelect: (type: LoanTypeId) => void;
}

/** Accessible tab list (WAI-ARIA tabs pattern with arrow-key support). */
export function LoanTypeTabs({ selected, panelId, onSelect }: LoanTypeTabsProps) {
  const tabRefs = useRef<Map<LoanTypeId, HTMLButtonElement>>(new Map());

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = LOAN_TYPES.findIndex((type) => type.id === selected);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % LOAN_TYPES.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + LOAN_TYPES.length) % LOAN_TYPES.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = LOAN_TYPES.length - 1;
    const next = nextIndex === null ? undefined : LOAN_TYPES[nextIndex];
    if (!next) return;
    event.preventDefault();
    onSelect(next.id);
    tabRefs.current.get(next.id)?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label="Loan type" onKeyDown={handleKeyDown}>
      {LOAN_TYPES.map((type) => {
        const isSelected = type.id === selected;
        return (
          <button
            key={type.id}
            ref={(node) => {
              if (node) tabRefs.current.set(type.id, node);
              else tabRefs.current.delete(type.id);
            }}
            type="button"
            role="tab"
            id={`tab-${type.id}`}
            className="tabs__tab"
            aria-selected={isSelected}
            aria-controls={panelId}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(type.id)}
          >
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
