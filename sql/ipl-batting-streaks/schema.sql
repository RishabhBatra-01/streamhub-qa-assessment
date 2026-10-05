-- Scenario 2: IPL-style batting streaks
-- Dialect: SQLite 3.25+ (window functions). The queries are standard SQL.

CREATE TABLE teams (
  -- NOT NULL is needed: SQLite (unlike most databases) allows NULL in a non-INTEGER primary key.
  team_code TEXT NOT NULL PRIMARY KEY,
  team_name TEXT NOT NULL
);

-- Assumption: a player stays with one team for the season.
CREATE TABLE players (
  player_id   INTEGER PRIMARY KEY,
  player_name TEXT NOT NULL,
  team_code   TEXT NOT NULL REFERENCES teams (team_code)
);

CREATE TABLE matches (
  match_id   INTEGER PRIMARY KEY,
  season     INTEGER NOT NULL,
  match_date TEXT    NOT NULL CHECK (match_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  home_team  TEXT    NOT NULL REFERENCES teams (team_code),
  away_team  TEXT    NOT NULL REFERENCES teams (team_code),
  CHECK (home_team <> away_team)
);

-- One row per player per match in which the player batted.
CREATE TABLE batting_scores (
  match_id  INTEGER NOT NULL REFERENCES matches (match_id),
  player_id INTEGER NOT NULL REFERENCES players (player_id),
  runs      INTEGER NOT NULL CHECK (runs >= 0),
  PRIMARY KEY (match_id, player_id)
);

CREATE INDEX idx_matches_season_date ON matches (season, match_date);
CREATE INDEX idx_batting_scores_player ON batting_scores (player_id);
