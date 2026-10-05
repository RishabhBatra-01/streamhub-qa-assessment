@sql
Feature: SQL scenario 2: IPL player performance streaks
  Using an IPL-style dataset for the 2024 season, identify players who scored 30+ runs
  in at least 3 consecutive matches. Return the player's name and the date the scoring
  streak commenced.

  Files: sql/ipl-batting-streaks/schema.sql, seed.sql, query.sql and
  query-team-schedule.sql. Each scenario runs against a fresh in-memory SQLite database.

  Background:
    Given the "ipl-batting-streaks" database with its sample data

  Scenario: The tables are created as designed
    Then the database has the tables "teams, players, matches, batting_scores"
    And I save a screenshot of the schema as "ipl-batting-streaks-schema"

  Scenario: A team must have a code
    When I try to run "INSERT INTO teams VALUES (NULL, 'Nameless XI')"
    Then the database rejects it with an error containing "NOT NULL constraint failed"

  @smoke
  Scenario: Players with 30+ runs in at least 3 consecutive matches, and when each streak started
    When I run "query.sql"
    Then the first columns are "player_name, streak_start_date"
    And the result has exactly these rows:
      | player_name | streak_start_date | streak_end_date | matches_in_streak | runs_in_streak |
      | Aditya Nair | 2024-03-22        | 2024-03-31      | 3                 | 90             |
      | Arjun Mehta | 2024-03-22        | 2024-03-30      | 3                 | 137            |
      | Rohan Iyer  | 2024-03-22        | 2024-04-11      | 6                 | 327            |
      | Ishaan Bose | 2024-03-23        | 2024-03-30      | 3                 | 123            |
      | Vikram Rao  | 2024-03-23        | 2024-04-04      | 3                 | 132            |
      | Sameer Khan | 2024-04-03        | 2024-04-15      | 4                 | 138            |
      | Kabir Desai | 2024-04-04        | 2024-04-12      | 3                 | 125            |
      | Ishaan Bose | 2024-04-08        | 2024-04-15      | 3                 | 153            |
    And I save a screenshot of the result as "ipl-batting-streaks"

  Scenario Outline: Rule check: <rule>
    When I run "query.sql"
    Then the number of streaks for "<player>" is <streaks>

    Examples:
      | rule                                                         | player       | streaks |
      | exactly 30 runs counts; a later run of 2 matches does not    | Arjun Mehta  | 1       |
      | six 30+ scores in a row are one streak, not four overlapping | Rohan Iyer   | 1       |
      | a score of 29 breaks the streak                              | Kabir Desai  | 1       |
      | exactly 30, 30, 30 is a streak                               | Aditya Nair  | 1       |
      | two separate streaks are both reported                       | Ishaan Bose  | 2       |
      | 2023 matches are ignored                                     | Dev Malhotra | 0       |
      | a match the player did not bat in is skipped                 | Vikram Rao   | 1       |

  Scenario: Stricter variant: a team match the player missed breaks the streak
    When I run "query-team-schedule.sql"
    Then the result has exactly these rows:
      | player_name | streak_start_date | streak_end_date | matches_in_streak | runs_in_streak |
      | Aditya Nair | 2024-03-22        | 2024-03-31      | 3                 | 90             |
      | Arjun Mehta | 2024-03-22        | 2024-03-30      | 3                 | 137            |
      | Rohan Iyer  | 2024-03-22        | 2024-04-11      | 6                 | 327            |
      | Ishaan Bose | 2024-03-23        | 2024-03-30      | 3                 | 123            |
      | Sameer Khan | 2024-04-03        | 2024-04-15      | 4                 | 138            |
      | Kabir Desai | 2024-04-04        | 2024-04-12      | 3                 | 125            |
      | Ishaan Bose | 2024-04-08        | 2024-04-15      | 3                 | 153            |
    And the number of streaks for "Vikram Rao" is 0
    And I save a screenshot of the result as "ipl-batting-streaks-team-schedule"
