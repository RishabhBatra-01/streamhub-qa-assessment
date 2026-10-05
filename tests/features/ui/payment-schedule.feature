@ui
Feature: Payment schedule report
  As a borrower
  I want a year-by-year and month-by-month repayment schedule
  So that I can see how my loan balance goes down over time

  Background:
    Given I open the EMI calculator
    And I enter a loan of 2500000 at 10% for 10 years
    When I open the payment schedule
    And I set the first EMI to "Apr" 2026

  @smoke
  Scenario: The report loads for the loan entered on the calculator
    Then I see the "Payment Schedule" page
    And the schedule describes the loan I entered
    And the schedule EMI matches my own calculation

  Scenario: The year-wise table matches an independent calculation
    Then the table has a row for each calendar year of the loan
    And every row of the table matches my own calculation
    And the last row shows the loan fully paid

  Scenario: Choosing a year shows its month-wise breakdown
    When I choose the month-wise breakdown for 2026
    Then the table shows 9 monthly rows from "Apr 2026" to "Dec 2026"
    And every monthly payment equals the EMI
    When I choose the month-wise breakdown for 2027
    Then the table shows 12 monthly rows from "Jan 2027" to "Dec 2027"
    When I choose the year-wise breakdown
    Then the table has a row for each calendar year of the loan

  Scenario: The schedule survives a page reload, so it can be shared as a link
    When I choose the month-wise breakdown for 2027
    And I reload the page
    Then the schedule describes the loan I entered
    And the first EMI is still "Apr" 2026
    And the table shows 12 monthly rows from "Jan 2027" to "Dec 2027"
