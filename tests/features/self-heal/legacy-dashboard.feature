@self-heal
Feature: Legacy page object with deliberately broken locators
  The brief asks for 3–5 incorrect or brittle locators, left broken, plus an AI self-healing
  approach. These scenarios use LegacyDashboardPage, whose 5 locators
  (tests/self-heal/legacyLocators.ts) were "written for an older version of the UI".

  They FAIL ON PURPOSE and are kept out of the main run (npm test).
    npm run test:self-heal    shows the failures and records a healing incident for each
    npm run self-heal         asks AI for fixes, validates them, and writes a report and a patch

  Each scenario uses exactly one broken locator, and its assertions are strict, so a
  "fix" that points at the wrong element cannot make the scenario pass.

  Background:
    Given I open the EMI calculator

  Scenario: Read the monthly EMI with the legacy page object
    When I enter a loan of 2500000 at 10% for 10 years
    Then the legacy "monthly EMI" shows "₹33,038"

  Scenario: Type the interest rate with the legacy page object
    When I enter a loan of 5000000 at 9% for 15 years
    And I type "7.5" into the legacy interest rate box
    Then the summary shows an EMI of "₹46,351", total interest of "₹33,43,111" and total payment of "₹83,43,111"

  Scenario: Switch to a personal loan with the legacy page object
    When I click the legacy personal loan tab
    Then the "Personal Loan" tab is selected
    And the form shows a loan of 500000 at 12% for 3 years

  Scenario: Type the loan tenure with the legacy page object
    When I enter a loan of 2500000 at 10% for 5 years
    And I type "10" into the legacy loan tenure box
    Then the summary shows an EMI of "₹33,038", total interest of "₹14,64,522" and total payment of "₹39,64,522"

  Scenario: Read the total interest with the legacy page object
    When I enter a loan of 2500000 at 10% for 10 years
    Then the legacy "total interest" shows "₹14,64,522"
