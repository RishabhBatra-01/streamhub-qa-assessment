You are repairing a broken locator in a Playwright UI test suite.

## The locator that broke

- Key: `monthlyEmi`
- What it must find (intent): **The Monthly EMI amount shown in the loan summary cards**
- Broken locator: `getByTestId('monthly-emi')`
- Problem: it matched 0 element(s); it must match exactly 1.
- Page: http://localhost:5173/?type=home&amount=2500000&rate=10&tenure=10&start=2026-10 (title "EMI Calculator · Loan Planner")
- Failing scenario: "Read the monthly EMI with the legacy page object"

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
          - /url: /?type=home&amount=2500000&rate=10&tenure=10&start=2026-10
      - listitem:
        - link "Payment Schedule":
          - /url: /schedule?type=home&amount=2500000&rate=10&tenure=10&start=2026-10
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
        - spinbutton "Loan Tenure": "10"
        - text: Yr
        - slider "Loan Tenure slider": "10"
        - paragraph: 10 Years
      - term: Monthly EMI
      - definition: ₹33,038
      - definition: Equated monthly instalment
      - term: Total Interest Payable
      - definition: ₹14,64,522
      - definition: Over the full tenure
      - term: Total Payment
      - definition: ₹39,64,522
      - definition: Principal + Interest
      - figure "Break-up of Total Payment":
        - text: Break-up of Total Payment
        - 'img "Pie chart: Principal Loan Amount ₹25,00,000 (63.1%), Total Interest ₹14,64,522 (36.9%)"':
          - application: 63.1% 36.9%
        - list:
          - listitem:
            - text: Principal Loan Amount
            - strong: ₹25,00,000
            - text: 63.1%
          - listitem:
            - text: Total Interest
            - strong: ₹14,64,522
            - text: 36.9%
  - region "Loan at a Glance":
    - heading "Loan at a Glance" [level=2]
    - term: Loan Type
    - definition: Home Loan
    - term: Number of EMIs
    - definition: "120"
    - term: Interest as % of Principal
    - definition: 58.6%
    - term: First EMI
    - definition: Oct 2026
    - term: Last EMI
    - definition: Sep 2036
    - link "View payment schedule":
      - /url: /schedule?type=home&amount=2500000&rate=10&tenure=10&start=2026-10
- contentinfo: Figures are estimates for planning only. Built for the Streamhub QA automation assessment.
```

### Elements with a data-testid

| data-testid | tag | text |
| --- | --- | --- |
| `summary-emi` | div | Monthly EMI₹33,038Equated monthly instalment |
| `emi-value` | dd | ₹33,038 |
| `summary-total-interest` | div | Total Interest Payable₹14,64,522Over the full tenure |
| `total-interest-value` | dd | ₹14,64,522 |
| `summary-total-payment` | div | Total Payment₹39,64,522Principal + Interest |
| `total-payment-value` | dd | ₹39,64,522 |
| `breakup-pie-chart` | figure | Break-up of Total Payment63.1%36.9%Principal Loan Amount₹25,00,00063.1%Total Int |
| `pie-slice-principal` | path | (empty) |
| `pie-slice-interest` | path | (empty) |
| `pie-legend-principal` | li | Principal Loan Amount₹25,00,00063.1% |
| `pie-value-principal` | strong | ₹25,00,000 |
| `pie-share-principal` | span | 63.1% |
| `pie-legend-interest` | li | Total Interest₹14,64,52236.9% |
| `pie-value-interest` | strong | ₹14,64,522 |
| `pie-share-interest` | span | 36.9% |
| `glance-loan-type` | dd | Home Loan |
| `glance-emi-count` | dd | 120 |
| `glance-interest-ratio` | dd | 58.6% |
| `glance-first-emi` | dd | Oct 2026 |
| `glance-last-emi` | dd | Sep 2036 |

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