-- Scenario 1: round-trip transfers
-- Find every case where Account A sends money to Account B and Account B sends a
-- similar amount back to Account A within 24 hours.
--
-- Rules (see sql/README.md for why):
--   * "Back" means the return goes from B to A and happens AFTER the original transfer.
--   * Time window: 0 < (return time - original time) <= 24 hours (exactly 24h counts).
--   * Similar amount: |return - original| <= 10% of the ORIGINAL amount (both ends count).
--     Integer paise are compared as  |r - o| * 10 <= o, so there is no floating-point error.
--   * If a transfer has several qualifying returns, each pair is listed.

SELECT
  o.txn_id                                                        AS original_txn,
  r.txn_id                                                        AS return_txn,
  o.from_account                                                  AS account_a,
  o.to_account                                                    AS account_b,
  printf('%.2f', o.amount_paise / 100.0)                          AS sent_amount,
  printf('%.2f', r.amount_paise / 100.0)                          AS returned_amount,
  o.txn_time                                                      AS sent_at,
  r.txn_time                                                      AS returned_at,
  printf('%.2f', (julianday(r.txn_time) - julianday(o.txn_time)) * 24)           AS hours_apart,
  printf('%.2f', abs(r.amount_paise - o.amount_paise) * 100.0 / o.amount_paise)  AS difference_pct
FROM transactions AS o
JOIN transactions AS r
  ON  r.from_account = o.to_account
  AND r.to_account   = o.from_account
  AND r.txn_time     >  o.txn_time
  AND r.txn_time     <= datetime(o.txn_time, '+24 hours')
  AND abs(r.amount_paise - o.amount_paise) * 10 <= o.amount_paise
ORDER BY o.txn_time, r.txn_time;
