-- Scenario 1: round-trip transfers
-- Dialect: SQLite 3.25+ (also standard SQL apart from the date functions in query.sql).

CREATE TABLE accounts (
  -- NOT NULL is needed: SQLite (unlike most databases) allows NULL in a non-INTEGER primary key.
  account_id  TEXT NOT NULL PRIMARY KEY,
  holder_name TEXT NOT NULL
);

CREATE TABLE transactions (
  txn_id       INTEGER PRIMARY KEY,
  from_account TEXT    NOT NULL REFERENCES accounts (account_id),
  to_account   TEXT    NOT NULL REFERENCES accounts (account_id),
  -- Money is stored in paise (1 rupee = 100 paise) as an INTEGER, never as a float,
  -- so the "within 10%" comparison is exact.
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  -- UTC timestamp, always written as 'YYYY-MM-DD HH:MM:SS' so text order = time order.
  txn_time     TEXT    NOT NULL CHECK (txn_time GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]'),
  CHECK (from_account <> to_account)
);

-- Supports the self-join in query.sql: find B -> A transfers in a time range.
CREATE INDEX idx_transactions_pair_time ON transactions (from_account, to_account, txn_time);
