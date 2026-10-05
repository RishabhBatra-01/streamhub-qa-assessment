-- Scenario 2 (stricter variant): "consecutive" = consecutive matches of the player's TEAM.
-- A team match where the player did not bat (dropped, injured, did not bat) breaks the
-- streak, just like a score under 30.
--
-- Same gaps-and-islands technique as query.sql; the only difference is that each player
-- is matched against every one of their team's matches (LEFT JOIN), so a missing innings
-- appears as runs = NULL and is filtered out by "runs >= 30".

WITH team_matches AS (
  SELECT
    p.player_id,
    p.player_name,
    m.match_date,
    b.runs,
    ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date, m.match_id) AS team_match_no
  FROM players      AS p
  JOIN matches      AS m ON p.team_code IN (m.home_team, m.away_team)
  LEFT JOIN batting_scores AS b ON b.match_id = m.match_id AND b.player_id = p.player_id
  WHERE m.season = 2024
),
hot_matches AS (
  SELECT
    *,
    team_match_no - ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY team_match_no) AS streak_key
  FROM team_matches
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
  FROM hot_matches
  GROUP BY player_id, player_name, streak_key
)
SELECT player_name, streak_start_date, streak_end_date, matches_in_streak, runs_in_streak
FROM streaks
WHERE matches_in_streak >= 3
ORDER BY streak_start_date, player_name;
