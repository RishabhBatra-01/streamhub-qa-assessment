@ui
Feature: Charts
  As a borrower
  I want charts that show where my money goes
  So that I can understand the loan at a glance

  Scenario Outline: The pie chart shows the principal and interest split for <amount> at <rate>% for <tenure> years
    Given I open the EMI calculator
    When I enter a loan of <amount> at <rate>% for <tenure> years
    Then I see the payment break-up chart
    And the pie chart has 2 drawn slices, each with a value greater than zero
    And the principal slice equals the loan amount
    And the interest slice equals my own total interest
    And the slice shares add up to 100%

    Examples:
      | amount  | rate | tenure |
      | 2500000 | 10   | 10     |
      | 5000000 | 7.5  | 15     |

  Scenario Outline: The bar chart shows one bar per calendar year when the first EMI is in <month> <year>
    A 5-year loan covers 5 calendar years if the first EMI is in January,
    but 6 if it starts mid-year, so the number of bars depends on the start month.

    Given I open the EMI calculator
    And I enter a loan of 1000000 at 12% for 5 years
    When I open the payment schedule
    And I set the first EMI to "<month>" <year>
    Then I see the year-wise bar chart
    And the bar chart shows <bars> bars, one for each calendar year of the loan
    And every bar has a value greater than zero and is drawn on screen
    And every bar matches my own calculation for its year

    Examples:
      | month | year | bars |
      | Jan   | 2026 | 5    |
      | Jun   | 2026 | 6    |

  Scenario: The tooltip of a bar shows that year's figures
    Given I open the EMI calculator
    And I enter a loan of 1000000 at 12% for 5 years
    When I open the payment schedule
    And I set the first EMI to "Jun" 2026
    And I hover over the bar for 2027
    Then the tooltip shows the figures for 2027 from my own calculation
