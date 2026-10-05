@sql
Feature: SQL scenario 1: round-trip transfers
  Find instances where Account A sends money to Account B, and Account B sends a similar
  amount (within 10%) back to Account A, both within a 24-hour window.

  Files: sql/round-trip-transfers/schema.sql, seed.sql and query.sql.
  Each scenario runs against a fresh in-memory SQLite database loaded with the sample data.

  Background:
    Given the "round-trip-transfers" database with its sample data

  Scenario: The tables are created as designed
    Then the database has the tables "accounts, transactions"
    And I save a screenshot of the schema as "round-trip-transfers-schema"

  @smoke
  Scenario: The query reports exactly the expected round trips
    When I run "query.sql"
    Then the result has exactly these rows:
      | original_txn | return_txn | account_a | account_b | sent_amount | returned_amount | sent_at             | returned_at         | hours_apart | difference_pct |
      | 1            | 2          | ACC-1001  | ACC-1002  | 10000.00    | 10000.00        | 2024-03-01 09:00:00 | 2024-03-01 14:30:00 | 5.50        | 0.00           |
      | 3            | 4          | ACC-1003  | ACC-1004  | 50000.00    | 45000.00        | 2024-03-02 10:00:00 | 2024-03-03 09:00:00 | 23.00       | 10.00          |
      | 7            | 8          | ACC-1007  | ACC-1008  | 30000.00    | 31500.00        | 2024-03-05 12:00:00 | 2024-03-06 12:00:00 | 24.00       | 5.00           |
      | 15           | 16         | ACC-1006  | ACC-1008  | 40000.00    | 39000.00        | 2024-03-11 10:00:00 | 2024-03-11 18:00:00 | 8.00        | 2.50           |
      | 15           | 17         | ACC-1006  | ACC-1008  | 40000.00    | 41000.00        | 2024-03-11 10:00:00 | 2024-03-12 06:00:00 | 20.00       | 2.50           |
      | 18           | 19         | ACC-1003  | ACC-1005  | 25000.00    | 27500.00        | 2024-03-13 10:00:00 | 2024-03-13 20:00:00 | 10.00       | 10.00          |
      | 22           | 23         | ACC-1008  | ACC-1001  | 5000.00     | 5200.00         | 2024-03-15 09:00:00 | 2024-03-15 10:00:00 | 1.00        | 4.00           |
    And I save a screenshot of the result as "round-trip-transfers"

  Scenario Outline: Rule check: <rule> (transactions <original> then <return>)
    When I run "query.sql"
    Then transactions <original> and <return> are <outcome> as a round trip

    Examples:
      | rule                                  | original | return | outcome      |
      | an exact reversal                     | 1        | 2      | reported     |
      | a return exactly 10% lower            | 3        | 4      | reported     |
      | a return 10.5% lower                  | 5        | 6      | not reported |
      | a return exactly 24 hours later       | 7        | 8      | reported     |
      | a return 24 hours and 1 minute later  | 9        | 10     | not reported |
      | the same direction twice              | 11       | 12     | not reported |
      | money moved on to a third account     | 13       | 14     | not reported |
      | the first of two qualifying returns   | 15       | 16     | reported     |
      | the second of two qualifying returns  | 15       | 17     | reported     |
      | a return exactly 10% higher           | 18       | 19     | reported     |
      | a return 10.01% higher                | 20       | 21     | not reported |
      | whoever sends first is account A      | 22       | 23     | reported     |
      | the return is never the original      | 23       | 22     | not reported |

  Scenario Outline: The table design rejects invalid data: <problem>
    When I try to run "<statement>"
    Then the database rejects it with an error containing "<error>"

    Examples:
      | problem                   | statement                                                                                                        | error                   |
      | a zero amount             | INSERT INTO transactions VALUES (900, 'ACC-1001', 'ACC-1002', 0, '2024-04-01 10:00:00')                          | CHECK constraint failed |
      | sending to the same account | INSERT INTO transactions VALUES (901, 'ACC-1001', 'ACC-1001', 100, '2024-04-01 10:00:00')                      | CHECK constraint failed |
      | an unknown account        | INSERT INTO transactions VALUES (902, 'ACC-1001', 'ACC-9999', 100, '2024-04-01 10:00:00')                        | FOREIGN KEY constraint failed |
      | an account with no id     | INSERT INTO accounts VALUES (NULL, 'Nobody')                                                                     | NOT NULL constraint failed |
      | a badly formatted time    | INSERT INTO transactions VALUES (903, 'ACC-1001', 'ACC-1002', 100, '01/04/2024 10:00')                           | CHECK constraint failed |
