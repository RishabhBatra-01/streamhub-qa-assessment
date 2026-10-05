@ui
Feature: EMI calculation
  As a borrower
  I want to see the EMI, total interest and total payment for the loan I enter
  So that I know exactly what I will pay

  The expected values are computed by the tests' own code (tests/utils/loanMath.ts),
  never by the app's code, so a bug in the app's maths cannot hide itself.

  Background:
    Given I open the EMI calculator

  @smoke
  Scenario Outline: Results match an independent calculation: <loan type>, <amount> at <rate>% for <tenure> years
    When I select the "<loan type>" tab
    And I enter a loan of <amount> at <rate>% for <tenure> years
    Then the monthly EMI matches my own calculation
    And the total interest matches my own calculation
    And the total payment matches my own calculation
    And the total payment is the loan amount plus the total interest

    Examples:
      | loan type     | amount   | rate | tenure |
      | Home Loan     | 2500000  | 10   | 10     |
      | Home Loan     | 5000000  | 7.5  | 15     |
      | Personal Loan | 1000000  | 12   | 5      |
      | Car Loan      | 800000   | 9.25 | 7      |
      | Home Loan     | 100000   | 5    | 1      |
      | Home Loan     | 20000000 | 20   | 30     |

  Scenario Outline: Results match known reference values: <amount> at <rate>% for <tenure> years
    The figures in this table were worked out separately with the standard EMI formula,
    so they also guard against a mistake shared by the app and the tests' own maths.

    When I enter a loan of <amount> at <rate>% for <tenure> years
    Then the summary shows an EMI of "<emi>", total interest of "<interest>" and total payment of "<total>"

    Examples:
      | amount  | rate | tenure | emi     | interest   | total      |
      | 2500000 | 10   | 10     | ₹33,038 | ₹14,64,522 | ₹39,64,522 |
      | 5000000 | 7.5  | 15     | ₹46,351 | ₹33,43,111 | ₹83,43,111 |

  Scenario: The loan at a glance matches the loan entered
    When I enter a loan of 2500000 at 10% for 10 years
    Then the loan at a glance shows the "Home Loan" with 120 EMIs
    And the interest as a share of the principal matches my own calculation

  Scenario: Moving a slider with the keyboard updates the number box and the results
    When I enter a loan of 2500000 at 10% for 10 years
    And I press the right arrow key 4 times on the "Interest Rate" slider
    Then the interest rate is now 10.2%
    And the monthly EMI matches my own calculation
    And the total interest matches my own calculation
