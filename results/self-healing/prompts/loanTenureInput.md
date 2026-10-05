You are repairing a broken locator in a Playwright UI test suite.

## The locator that broke

- Key: `loanTenureInput`
- What it must find (intent): **The Loan Tenure number box (in years) in the loan details form**
- Broken locator: `locator('xpath=/html/body/div/div/main/section[2]/div[2]/form/div[3]/div[1]/div/input')`
- Problem: it matched 0 element(s); it must match exactly 1.
- Page: http://localhost:5173/?type=home&amount=2500000&rate=10&tenure=5&start=2026-10 (title "EMI Calculator · Loan Planner")
- Failing scenario: "Type the loan tenure with the legacy page object"

## The page right now

### Accessibility tree (Playwright ARIA snapshot)

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - text: Loan Planner
  - navigation "Main":
    - list:
      - listitem:
        - link "EMI Calculator":
          - /url: /?type=home&amount=2500000&rate=10&tenure=5&start=2026-10
      - listitem:
        - link "Payment Schedule":
          - /url: /schedule?type=home&amount=2500000&rate=10&tenure=5&start=2026-10
- main:
  - heading "EMI Calculator" [level=1]
  - paragraph: Work out your monthly instalment, total interest and total payment for a home, personal or car loan.
  - region "EMI calculator":
    - tablist "Loan type":
      - tab "Home Loan" [selected]
      - tab "Personal Loan"
      - tab "Car Loan"
    - tabpanel "Home Loan":
      - form "Loan details":
        - text: Home Loan Amount ₹
        - spinbutton "Home Loan Amount": "2500000"
        - slider "Home Loan Amount slider": "2500000"
        - paragraph: ₹25,00,000 (25 Lakh)
        - text: Interest Rate
        - spinbutton "Interest Rate": "10"
        - text: "%"
        - slider "Interest Rate slider": "10"
        - paragraph: 10%
        - text: Loan Tenure
        - spinbutton "Loan Tenure": "5"
        - text: Yr
        - slider "Loan Tenure slider": "5"
        - paragraph: 5 Years
      - term: Monthly EMI
      - definition: ₹53,118
      - definition: Equated monthly instalment
      - term: Total Interest Payable
      - definition: ₹6,87,057
      - definition: Over the full tenure
      - term: Total Payment
      - definition: ₹31,87,057
      - definition: Principal + Interest
      - figure "Break-up of Total Payment":
        - text: Break-up of Total Payment
        - 'img "Pie chart: Principal Loan Amount ₹25,00,000 (78.4%), Total Interest ₹6,87,057 (21.6%)"':
          - application: 78.4% 21.6%
        - list:
          - listitem:
            - text: Principal Loan Amount
            - strong: ₹25,00,000
            - text: 78.4%
          - listitem:
            - text: Total Interest
            - strong: ₹6,87,057
            - text: 21.6%
  - region "Loan at a Glance":
    - heading "Loan at a Glance" [level=2]
    - term: Loan Type
    - definition: Home Loan
    - term: Number of EMIs
    - definition: "60"
    - term: Interest as % of Principal
    - definition: 27.5%
    - term: First EMI
    - definition: Oct 2026
    - term: Last EMI
    - definition: Sep 2031
    - link "View payment schedule":
      - /url: /schedule?type=home&amount=2500000&rate=10&tenure=5&start=2026-10
- contentinfo: Figures are estimates for planning only. Built for the Streamhub QA automation assessment.
```

### Elements with a data-testid

| data-testid | tag | text |
| --- | --- | --- |
| `summary-emi` | div | Monthly EMI₹53,118Equated monthly instalment |
| `emi-value` | dd | ₹53,118 |
| `summary-total-interest` | div | Total Interest Payable₹6,87,057Over the full tenure |
| `total-interest-value` | dd | ₹6,87,057 |
| `summary-total-payment` | div | Total Payment₹31,87,057Principal + Interest |
| `total-payment-value` | dd | ₹31,87,057 |
| `breakup-pie-chart` | figure | Break-up of Total Payment78.4%21.6%Principal Loan Amount₹25,00,00078.4%Total Int |
| `pie-slice-principal` | path | (empty) |
| `pie-slice-interest` | path | (empty) |
| `pie-legend-principal` | li | Principal Loan Amount₹25,00,00078.4% |
| `pie-value-principal` | strong | ₹25,00,000 |
| `pie-share-principal` | span | 78.4% |
| `pie-legend-interest` | li | Total Interest₹6,87,05721.6% |
| `pie-value-interest` | strong | ₹6,87,057 |
| `pie-share-interest` | span | 21.6% |
| `glance-loan-type` | dd | Home Loan |
| `glance-emi-count` | dd | 60 |
| `glance-interest-ratio` | dd | 27.5% |
| `glance-first-emi` | dd | Oct 2026 |
| `glance-last-emi` | dd | Sep 2031 |

## Rules

1. Suggest up to 3 replacement locators for the element described by the intent, best first.
2. Allowed strategies, in order of preference:
   - "role": an ARIA role plus the element's accessible name exactly as shown in the tree, e.g. role "spinbutton", name "Loan Tenure".
   - "label": the text of the element's label.
   - "testId": a data-testid from the table above, exactly as written.
   - "text": exact visible text (only for elements with no role, label or test id).
3. NEVER suggest CSS selectors, XPath, nth()/positions or class names. They are what broke.
4. Each candidate must match exactly ONE element, and it must be the element the intent describes, not a container around it or a similar-looking neighbour. For example, a value shown in a card is the value element, not the whole card.
5. Only use roles, names and test ids that appear above. Do not invent any.
6. If NOTHING on the page matches the intent, return an empty list. The element may really be missing (an application bug), and a forced match would hide that bug.

For each candidate give: strategy, value (the role, label, testId or text), name (only for "role"), confidence from 0 to 1, and a one-sentence reason.