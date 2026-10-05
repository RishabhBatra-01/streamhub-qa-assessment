@ui
Feature: Input validation
  As a borrower
  I want clear messages when I type a value the calculator cannot use
  So that I never see results for a loan I did not mean to enter

  Background:
    Given I open the EMI calculator

  Scenario Outline: "<value>" is rejected in the <field> box
    When I type "<value>" into the "<field>" box
    Then the "<field>" box is marked invalid with the message "<message>"
    And the results are replaced by the message "Fix the highlighted field to see your EMI."

    Examples:
      | field            | value    | message                                                         |
      | Home Loan Amount | 99999    | Home Loan Amount must be between ₹1,00,000 and ₹2,00,00,000.    |
      | Home Loan Amount | 20000001 | Home Loan Amount must be between ₹1,00,000 and ₹2,00,00,000.    |
      | Home Loan Amount |          | Enter the home loan amount.                                     |
      | Interest Rate    | 4.99     | Interest Rate must be between 5% and 20%.                       |
      | Interest Rate    | 20.01    | Interest Rate must be between 5% and 20%.                       |
      | Interest Rate    | 7.555    | Interest Rate can have at most 2 decimal places.                |
      | Loan Tenure      | 0        | Loan Tenure must be between 1 Year and 30 Years.                |
      | Loan Tenure      | -5       | Loan Tenure must be between 1 Year and 30 Years.                |
      | Loan Tenure      | 2.5      | Loan Tenure must be a whole number of years.                    |

  Scenario Outline: The boundary value <value> is accepted in the <field> box
    When I type "<value>" into the "<field>" box
    Then the "<field>" box is valid
    And I see the loan summary

    Examples:
      | field            | value    |
      | Home Loan Amount | 100000   |
      | Home Loan Amount | 20000000 |
      | Interest Rate    | 5        |
      | Interest Rate    | 20       |
      | Loan Tenure      | 1        |
      | Loan Tenure      | 30       |

  Scenario: Two invalid boxes are both reported
    When I type "0" into the "Home Loan Amount" box
    And I type "99" into the "Interest Rate" box
    Then the "Home Loan Amount" box is marked invalid with the message "Home Loan Amount must be between ₹1,00,000 and ₹2,00,00,000."
    And the "Interest Rate" box is marked invalid with the message "Interest Rate must be between 5% and 20%."
    And the results are replaced by the message "Fix the highlighted fields to see your EMI."

  Scenario: Correcting an invalid value brings the results back
    When I type "50" into the "Loan Tenure" box
    Then the results are replaced by the message "Fix the highlighted field to see your EMI."
    When I enter a loan of 2500000 at 10% for 10 years
    Then the "Loan Tenure" box is valid
    And the monthly EMI matches my own calculation
