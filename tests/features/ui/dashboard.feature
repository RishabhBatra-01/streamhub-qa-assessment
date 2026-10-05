@ui
Feature: EMI calculator dashboard
  As a borrower
  I want the EMI calculator to load with all its sections
  So that I can start planning a loan straight away

  Background:
    Given I open the EMI calculator

  @smoke
  Scenario: The dashboard loads with its main sections
    Then I see the "EMI Calculator" page
    And I see the loan type tabs
    And I see the loan summary
    And I see the payment break-up chart
    And I see the loan at a glance

  Scenario Outline: The <loan type> tab opens with its own default values
    When I select the "<loan type>" tab
    Then the form shows a loan of <amount> at <rate>% for <tenure> years
    And the monthly EMI matches my own calculation

    Examples:
      | loan type     | amount  | rate | tenure |
      | Home Loan     | 5000000 | 9    | 20     |
      | Personal Loan | 500000  | 12   | 3      |
      | Car Loan      | 800000  | 9.5  | 5      |

  Scenario: The loan is kept when moving between the calculator and the schedule
    When I select the "Personal Loan" tab
    And I enter a loan of 1000000 at 12% for 5 years
    And I go to "Payment Schedule" using the main menu
    Then I see the "Payment Schedule" page
    And the schedule describes the loan I entered
    When I go to "EMI Calculator" using the main menu
    Then I see the "EMI Calculator" page
    And the form shows a loan of 1000000 at 12% for 5 years
