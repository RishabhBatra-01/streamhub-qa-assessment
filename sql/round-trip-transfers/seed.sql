-- Sample data for scenario 1 (fictional people and accounts).
-- Each block is one case; the comment says whether query.sql should report it.

INSERT INTO accounts (account_id, holder_name) VALUES
  ('ACC-1001', 'Asha Verma'),
  ('ACC-1002', 'Bilal Shaikh'),
  ('ACC-1003', 'Chitra Rao'),
  ('ACC-1004', 'Daniel Dsouza'),
  ('ACC-1005', 'Esha Kapoor'),
  ('ACC-1006', 'Farhan Ali'),
  ('ACC-1007', 'Gauri Joshi'),
  ('ACC-1008', 'Harsh Patel');

INSERT INTO transactions (txn_id, from_account, to_account, amount_paise, txn_time) VALUES
  -- A. Exact reversal 5.5 hours later                                 -> REPORTED
  ( 1, 'ACC-1001', 'ACC-1002', 1000000, '2024-03-01 09:00:00'),
  ( 2, 'ACC-1002', 'ACC-1001', 1000000, '2024-03-01 14:30:00'),

  -- B. Return exactly 10% LOWER (lower boundary), 23 hours later      -> REPORTED
  ( 3, 'ACC-1003', 'ACC-1004', 5000000, '2024-03-02 10:00:00'),
  ( 4, 'ACC-1004', 'ACC-1003', 4500000, '2024-03-03 09:00:00'),

  -- C. Return 10.5% lower (outside the 10% band)                      -> not reported
  ( 5, 'ACC-1005', 'ACC-1006', 2000000, '2024-03-04 08:00:00'),
  ( 6, 'ACC-1006', 'ACC-1005', 1790000, '2024-03-04 12:00:00'),

  -- D. Return exactly 24 hours later (time boundary)                  -> REPORTED
  ( 7, 'ACC-1007', 'ACC-1008', 3000000, '2024-03-05 12:00:00'),
  ( 8, 'ACC-1008', 'ACC-1007', 3150000, '2024-03-06 12:00:00'),

  -- E. Return 24 hours and 1 minute later                             -> not reported
  ( 9, 'ACC-1001', 'ACC-1003', 1500000, '2024-03-07 10:00:00'),
  (10, 'ACC-1003', 'ACC-1001', 1500000, '2024-03-08 10:01:00'),

  -- F. Same direction twice: not a return                             -> not reported
  (11, 'ACC-1002', 'ACC-1004',  800000, '2024-03-09 09:00:00'),
  (12, 'ACC-1002', 'ACC-1004',  800000, '2024-03-09 11:00:00'),

  -- G. Money moves on to a THIRD account, not back                    -> not reported
  (13, 'ACC-1005', 'ACC-1007', 1200000, '2024-03-10 10:00:00'),
  (14, 'ACC-1007', 'ACC-1008', 1200000, '2024-03-10 12:00:00'),

  -- H. One transfer, two returns that both qualify                    -> REPORTED twice
  (15, 'ACC-1006', 'ACC-1008', 4000000, '2024-03-11 10:00:00'),
  (16, 'ACC-1008', 'ACC-1006', 3900000, '2024-03-11 18:00:00'),
  (17, 'ACC-1008', 'ACC-1006', 4100000, '2024-03-12 06:00:00'),

  -- I. Return exactly 10% HIGHER (upper boundary)                     -> REPORTED
  (18, 'ACC-1003', 'ACC-1005', 2500000, '2024-03-13 10:00:00'),
  (19, 'ACC-1005', 'ACC-1003', 2750000, '2024-03-13 20:00:00'),

  -- J. Return 10.01% higher (just outside the band)                   -> not reported
  (20, 'ACC-1004', 'ACC-1002', 1000000, '2024-03-14 10:00:00'),
  (21, 'ACC-1002', 'ACC-1004', 1100100, '2024-03-14 11:00:00'),

  -- K. Whoever sends FIRST is "Account A": here ACC-1008 starts it    -> REPORTED (A = ACC-1008)
  (22, 'ACC-1008', 'ACC-1001',  500000, '2024-03-15 09:00:00'),
  (23, 'ACC-1001', 'ACC-1008',  520000, '2024-03-15 10:00:00'),

  -- L. Unrelated everyday transfers (noise)                           -> not reported
  (24, 'ACC-1004', 'ACC-1006',  250000, '2024-03-16 10:00:00'),
  (25, 'ACC-1006', 'ACC-1001',  770000, '2024-03-16 15:00:00'),
  (26, 'ACC-1007', 'ACC-1003', 6000000, '2024-03-17 11:00:00');
