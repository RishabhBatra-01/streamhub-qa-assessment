import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { defaultLoanState, parseLoanState, writeLoanState, type LoanState } from '../lib/loanParams';
import type { LoanTypeId } from '../lib/loanTypes';

export function useLoanParams() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loan = useMemo(() => parseLoanState(searchParams), [searchParams]);

  /**
   * Updates the query string, starting from the browser's *current* URL.
   *
   * React Router's own functional setSearchParams starts from the params of the
   * last render. If two changes arrive before a render (e.g. an automated test
   * picking two dropdowns quickly), the second would overwrite the first. The
   * browser URL is updated synchronously, so it is always the latest.
   * (main.tsx also turns off router transitions so renders happen immediately.)
   */
  const updateParams = useCallback(
    (update: (current: URLSearchParams) => URLSearchParams) => {
      const next = update(new URLSearchParams(window.location.search));
      navigate({ search: `?${next}` }, { replace: true });
    },
    [navigate],
  );

  const updateLoan = useCallback(
    (patch: Partial<LoanState>) => {
      updateParams((current) => writeLoanState(current, { ...parseLoanState(current), ...patch }));
    },
    [updateParams],
  );

  const switchLoanType = useCallback(
    (type: LoanTypeId) => {
      updateParams((current) => {
        const next = writeLoanState(current, defaultLoanState(type, parseLoanState(current).start));
        next.delete('breakdown');
        return next;
      });
    },
    [updateParams],
  );

  /** Query string that carries the current loan to another page. */
  const loanSearch = useMemo(() => `?${writeLoanState(new URLSearchParams(), loan)}`, [loan]);

  return { loan, updateLoan, switchLoanType, updateParams, loanSearch, searchParams };
}
