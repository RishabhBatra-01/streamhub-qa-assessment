-- Sample data for scenario 2. IPL-style, but the teams, players and scores are fictional.

INSERT INTO teams (team_code, team_name) VALUES
  ('CHE', 'Chennai Chargers'),
  ('MUM', 'Mumbai Mariners'),
  ('BLR', 'Bengaluru Blasters'),
  ('KOL', 'Kolkata Knights');

INSERT INTO players (player_id, player_name, team_code) VALUES
  (1, 'Arjun Mehta',   'CHE'),
  (2, 'Rohan Iyer',    'CHE'),
  (3, 'Kabir Desai',   'MUM'),
  (4, 'Vikram Rao',    'MUM'),
  (5, 'Aditya Nair',   'BLR'),
  (6, 'Sameer Khan',   'BLR'),
  (7, 'Dev Malhotra',  'KOL'),
  (8, 'Ishaan Bose',   'KOL');

INSERT INTO matches (match_id, season, match_date, home_team, away_team) VALUES
  -- Last games of the 2023 season (must be ignored: the question is about 2024)
  (101, 2023, '2023-05-20', 'CHE', 'MUM'),
  (102, 2023, '2023-05-24', 'BLR', 'KOL'),
  -- 2024 season
  ( 1, 2024, '2024-03-22', 'CHE', 'BLR'),
  ( 2, 2024, '2024-03-23', 'MUM', 'KOL'),
  ( 3, 2024, '2024-03-26', 'CHE', 'MUM'),
  ( 4, 2024, '2024-03-27', 'BLR', 'KOL'),
  ( 5, 2024, '2024-03-30', 'CHE', 'KOL'),
  ( 6, 2024, '2024-03-31', 'MUM', 'BLR'),
  ( 7, 2024, '2024-04-03', 'BLR', 'CHE'),
  ( 8, 2024, '2024-04-04', 'KOL', 'MUM'),
  ( 9, 2024, '2024-04-07', 'MUM', 'CHE'),
  (10, 2024, '2024-04-08', 'KOL', 'BLR'),
  (11, 2024, '2024-04-11', 'KOL', 'CHE'),
  (12, 2024, '2024-04-12', 'BLR', 'MUM'),
  (13, 2024, '2024-04-15', 'KOL', 'BLR'),
  (14, 2024, '2024-04-18', 'MUM', 'KOL');

INSERT INTO batting_scores (match_id, player_id, runs) VALUES
  -- Arjun Mehta (CHE): 45, 30, 62 is a 3-match streak; exactly 30 counts       -> streak from 2024-03-22
  --                    then 12 breaks it; 30, 31 at the end is only 2 matches
  (101, 1, 80),
  (  1, 1, 45), (3, 1, 30), (5, 1, 62), (7, 1, 12), (9, 1, 30), (11, 1, 31),

  -- Rohan Iyer (CHE): 30+ in all 6 matches: ONE 6-match streak, not 4 overlapping ones -> from 2024-03-22
  (  1, 2, 55), (3, 2, 41), (5, 2, 38), (7, 2, 70), (9, 2, 33), (11, 2, 90),

  -- Kabir Desai (MUM): 35, 40, then 29 breaks it (one run short);
  --                    50, 44, 31 is a 3-match streak                            -> streak from 2024-04-04
  (  2, 3, 35), (3, 3, 40), (6, 3, 29), (8, 3, 50), (9, 3, 44), (12, 3, 31), (14, 3, 0),

  -- Vikram Rao (MUM): 33, 47, then MISSES match 6 (no row), then 52.
  --   Counted by HIS matches (query.sql): 3 in a row                             -> streak from 2024-03-23
  --   Counted by his TEAM's matches (query-team-schedule.sql): the missed match breaks it -> no streak
  (  2, 4, 33), (3, 4, 47), (8, 4, 52), (9, 4, 10), (12, 4, 5), (14, 4, 7),

  -- Aditya Nair (BLR): exactly 30, 30, 30 (boundary) is a streak; later 30, 30 is only 2 -> from 2024-03-22
  (102, 5, 15),
  (  1, 5, 30), (4, 5, 30), (6, 5, 30), (7, 5, 2), (10, 5, 30), (12, 5, 30), (13, 5, 5),

  -- Sameer Khan (BLR): 31, 32 (only 2), 8 breaks; then 33, 34, 35, 36 (4)      -> streak from 2024-04-03
  (  1, 6, 31), (4, 6, 32), (6, 6, 8), (7, 6, 33), (10, 6, 34), (12, 6, 35), (13, 6, 36),

  -- Dev Malhotra (KOL): 60 in the 2023 season, then 35, 38 in 2024.
  --   3 in a row only if 2023 is wrongly included; 2024 alone has no streak       -> not reported
  (102, 7, 60),
  (  2, 7, 35), (4, 7, 38), (5, 7, 12), (8, 7, 31), (10, 7, 20), (11, 7, 45), (13, 7, 15), (14, 7, 22),

  -- Ishaan Bose (KOL): TWO separate streaks: 40, 41, 42 then 0, then 50, 51, 52 -> from 2024-03-23 and 2024-04-08
  (  2, 8, 40), (4, 8, 41), (5, 8, 42), (8, 8, 0), (10, 8, 50), (11, 8, 51), (13, 8, 52), (14, 8, 10);
