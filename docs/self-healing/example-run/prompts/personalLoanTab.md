You are repairing a broken locator in a Playwright UI test suite.

## The locator that broke

- Key: `personalLoanTab`
- What it must find (intent): **The tab that switches the calculator to a personal loan**
- Broken locator: `getByRole('tab', { name: 'Personal Loans' })`
- Problem: it matched 0 element(s); it must match exactly 1.
- Page: http://localhost:5173/ (title "EMI Calculator · Loan Planner")
- Failing scenario: "Switch to a personal loan with the legacy page object"

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
          - /url: /?type=home&amount=5000000&rate=9&tenure=20&start=2026-10
      - listitem:
        - link "Payment Schedule":
          - /url: /schedule?type=home&amount=5000000&rate=9&tenure=20&start=2026-10
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
        - spinbutton "Home Loan Amount": "5000000"
        - slider "Home Loan Amount slider": "5000000"
        - paragraph: ₹50,00,000 (50 Lakh)
        - text: Interest Rate
        - spinbutton "Interest Rate": "9"
        - text: "%"
        - slider "Interest Rate slider": "9"
        - paragraph: 9%
        - text: Loan Tenure
        - spinbutton "Loan Tenure": "20"
        - text: Yr
        - slider "Loan Tenure slider": "20"
        - paragraph: 20 Years
      - term: Monthly EMI
      - definition: ₹44,986
      - definition: Equated monthly instalment
      - term: Total Interest Payable
      - definition: ₹57,96,711
      - definition: Over the full tenure
      - term: Total Payment
      - definition: ₹1,07,96,711
      - definition: Principal + Interest
      - figure "Break-up of Total Payment":
        - text: Break-up of Total Payment
        - 'img "Pie chart: Principal Loan Amount ₹50,00,000 (46.3%), Total Interest ₹57,96,711 (53.7%)"':
          - application: 46.3% 53.7%
        - list:
          - listitem:
            - text: Principal Loan Amount
            - strong: ₹50,00,000
            - text: 46.3%
          - listitem:
            - text: Total Interest
            - strong: ₹57,96,711
            - text: 53.7%
  - region "Loan at a Glance":
    - heading "Loan at a Glance" [level=2]
    - term: Loan Type
    - definition: Home Loan
    - term: Number of EMIs
    - definition: "240"
    - term: Interest as % of Principal
    - definition: 115.9%
    - term: First EMI
    - definition: Oct 2026
    - term: Last EMI
    - definition: Sep 2046
    - link "View payment schedule":
      - /url: /schedule?type=home&amount=5000000&rate=9&tenure=20&start=2026-10
- contentinfo: Figures are estimates for planning only. Built for the Streamhub QA automation assessment.
```

### Elements with a data-testid

| data-testid | tag | text |
| --- | --- | --- |
| `summary-emi` | div | Monthly EMI₹44,986Equated monthly instalment |
| `emi-value` | dd | ₹44,986 |
| `summary-total-interest` | div | Total Interest Payable₹57,96,711Over the full tenure |
| `total-interest-value` | dd | ₹57,96,711 |
| `summary-total-payment` | div | Total Payment₹1,07,96,711Principal + Interest |
| `total-payment-value` | dd | ₹1,07,96,711 |
| `breakup-pie-chart` | figure | Break-up of Total Payment46.3%53.7%Principal Loan Amount₹50,00,00046.3%Total Int |
| `pie-slice-principal` | path | (empty) |
| `pie-slice-interest` | path | (empty) |
| `pie-legend-principal` | li | Principal Loan Amount₹50,00,00046.3% |
| `pie-value-principal` | strong | ₹50,00,000 |
| `pie-share-principal` | span | 46.3% |
| `pie-legend-interest` | li | Total Interest₹57,96,71153.7% |
| `pie-value-interest` | strong | ₹57,96,711 |
| `pie-share-interest` | span | 53.7% |
| `glance-loan-type` | dd | Home Loan |
| `glance-emi-count` | dd | 240 |
| `glance-interest-ratio` | dd | 115.9% |
| `glance-first-emi` | dd | Oct 2026 |
| `glance-last-emi` | dd | Sep 2046 |

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