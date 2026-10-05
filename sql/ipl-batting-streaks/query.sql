-- Scenario 2: players who scored 30+ runs in at least 3 consecutive matches (2024 season).
-- Returns the player's name and the date the streak started (plus streak details).
--
-- "Consecutive" = consecutive matches THE PLAYER batted in. A match the player did not
-- bat in is skipped, not counted as a break. (query-team-schedule.sql has the stricter
-- version where any team match without a 30+ score breaks the streak.)
--
-- Technique: "gaps and islands" with window functions.
--   1. Number each player's innings in date order:             1, 2, 3, 4, 5, 6 ...
--   2. Keep only the 30+ innings and number those again:      1, 2,    3, 4, 5 ...
--   3. innings_no - hot_no is constant inside an unbroken run (an "island"), and changes
--      whenever an innings under 30 was skipped. Group by it to get each streak.

WITH innings AS (
  SELECT
    p.player_id,
    p.player_name,
    m.match_date,
    b.runs,
    ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date, m.match_id) AS innings_no
  FROM batting_scores AS b
  JOIN matches        AS m ON m.match_id  = b.match_id
  JOIN players        AS p ON p.player_id = b.player_id
  WHERE m.season = 2024
),
hot_innings AS (
  SELECT
    *,
    innings_no - ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY innings_no) AS streak_key
  FROM innings
  WHERE runs >= 30
),
streaks AS (
  SELECT
    player_id,
    player_name,
    MIN(match_date) AS streak_start_date,
    MAX(match_date) AS streak_end_date,
    COUNT(*)        AS matches_in_streak,
    SUM(runs)       AS runs_in_streak
  FROM hot_innings
  GROUP BY player_id, player_name, streak_key
)
SELECT player_name, streak_start_date, streak_end_date, matches_in_streak, runs_in_streak
FROM streaks
WHERE matches_in_streak >= 3
ORDER BY streak_start_date, player_name;
