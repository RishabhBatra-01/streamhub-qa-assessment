@ui
Feature: EMI calculator dashboard
  As a borrower
  I want the EMI calculator to load with all its sections
  So that I can start planning a loan straight away

  @smoke
  Scenario: The dashboard loads with its main sections
    Given I open the EMI calculator
    Then I see the "EMI Calculator" page
    And I see the loan type tabs
    And I see the loan summary
    And I see the payment break-up chart
