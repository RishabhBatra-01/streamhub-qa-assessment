# Self-healing report

| | |
| --- | --- |
| **Run** | 2026-10-05T18:37:33.440Z → 2026-10-05T18:39:04.596Z |
| **Provider** | claude-code (auto: Claude Code is logged in) |
| **Detection run** | 5 failed |
| **Healed and validated** | **5 of 5** |
| **Regression run (all fixes together)** | ✅ 5 passed |

## Summary

| Locator | Broken | Fix | Validated |
| --- | --- | --- | --- |
| `interestRateInput` | `getByRole('textbox', { name: 'Interest Rate' })` | `getByRole('spinbutton', { name: 'Interest Rate' })` | ✅ |
| `loanTenureInput` | `locator('xpath=/html/body/div/div/main/section[2]/div[2]/form/div[3]/div[1]/div/input')` | `getByRole('spinbutton', { name: 'Loan Tenure' })` | ✅ |
| `monthlyEmi` | `getByTestId('monthly-emi')` | `getByTestId('emi-value')` | ✅ |
| `personalLoanTab` | `getByRole('tab', { name: 'Personal Loans' })` | `getByRole('tab', { name: 'Personal Loan' })` | ✅ |
| `totalInterestValue` | `locator('div.summary-card.interest > span.amount')` | `getByTestId('total-interest-value')` | ✅ |

## Proposed change

**Dry run: nothing was changed.** Review `locators.patch`, then apply it with `git apply reports/self-heal/locators.patch` or re-run with `--apply`.

```diff
diff --git a/tests/self-heal/legacyLocators.ts b/tests/self-heal/legacyLocators.ts
index 98fcee6..493ae64 100644
--- a/tests/self-heal/legacyLocators.ts
+++ b/tests/self-heal/legacyLocators.ts
@@ -21,27 +21,27 @@ export const LEGACY_LOCATORS = {
   // 1. Stale data-testid: the app renamed it to 'emi-value'.
   monthlyEmi: {
     intent: 'The Monthly EMI amount shown in the loan summary cards',
-    spec: { testId: 'monthly-emi' },
+    spec: { testId: 'emi-value' },
   },
   // 2. Wrong role: a number input has role "spinbutton", not "textbox".
   interestRateInput: {
     intent: 'The Interest Rate number box in the loan details form',
-    spec: { role: 'textbox', name: 'Interest Rate' },
+    spec: { role: 'spinbutton', name: 'Interest Rate' },
   },
   // 3. Renamed text: the tab is labelled "Personal Loan" (singular).
   personalLoanTab: {
     intent: 'The tab that switches the calculator to a personal loan',
-    spec: { role: 'tab', name: 'Personal Loans' },
+    spec: { role: 'tab', name: 'Personal Loan' },
   },
   // 4. Brittle absolute XPath: breaks as soon as the page layout changes.
   loanTenureInput: {
     intent: 'The Loan Tenure number box (in years) in the loan details form',
-    spec: { xpath: '/html/body/div/div/main/section[2]/div[2]/form/div[3]/div[1]/div/input' },
+    spec: { role: 'spinbutton', name: 'Loan Tenure' },
   },
   // 5. Brittle CSS tied to old styling class names that no longer exist.
   totalInterestValue: {
     intent: 'The Total Interest Payable amount shown in the loan summary cards',
-    spec: { css: 'div.summary-card.interest > span.amount' },
+    spec: { testId: 'total-interest-value' },
   },
 } satisfies Record<string, LegacyLocator>;
```

## Details

A candidate is accepted only if (1) it is well formed and uses a preferred strategy (role, label, test id or
text; never CSS or XPath), and (2) the scenario that failed **passes** with the candidate swapped in, with
the locator matching exactly one element. Candidates are tried in the order the provider ranked them.

### `interestRateInput`: ✅ healed → `getByRole('spinbutton', { name: 'Interest Rate' })`

- **Intent:** The Interest Rate number box in the loan details form
- **Broken locator:** `getByRole('textbox', { name: 'Interest Rate' })`, matched 0 element(s) (not-found)
- **Scenario:** "Type the interest rate with the legacy page object"
- **Evidence:** [prompt](prompts/interestRateInput.md), [incident](incidents/interestrateinput.json), [screenshot at failure](screenshots/interestrateinput.png)

| # | Suggested locator | Confidence | Reason given | Validation |
| --- | --- | --- | --- | --- |
| 1 | `getByRole('spinbutton', { name: 'Interest Rate' })` | 0.97 | The tree shows exactly one spinbutton with the accessible name "Interest Rate" inside the "Loan details" form holding the value 9, and the sibling slider has the distinct name "Interest Rate slider" so there is no ambiguity. | ✅ scenario passes; matched `<input>` "" |

### `loanTenureInput`: ✅ healed → `getByRole('spinbutton', { name: 'Loan Tenure' })`

- **Intent:** The Loan Tenure number box (in years) in the loan details form
- **Broken locator:** `locator('xpath=/html/body/div/div/main/section[2]/div[2]/form/div[3]/div[1]/div/input')`, matched 0 element(s) (not-found)
- **Scenario:** "Type the loan tenure with the legacy page object"
- **Evidence:** [prompt](prompts/loanTenureInput.md), [incident](incidents/loantenureinput.json), [screenshot at failure](screenshots/loantenureinput.png)

| # | Suggested locator | Confidence | Reason given | Validation |
| --- | --- | --- | --- | --- |
| 1 | `getByRole('spinbutton', { name: 'Loan Tenure' })` | 0.97 | The accessibility tree shows exactly one spinbutton named "Loan Tenure" holding the value 5, which is the number box for tenure in years (the "Loan Tenure slider" is a separate slider role). | ✅ scenario passes; matched `<input>` "" |

### `monthlyEmi`: ✅ healed → `getByTestId('emi-value')`

- **Intent:** The Monthly EMI amount shown in the loan summary cards
- **Broken locator:** `getByTestId('monthly-emi')`, matched 0 element(s) (not-found)
- **Scenario:** "Read the monthly EMI with the legacy page object"
- **Evidence:** [prompt](prompts/monthlyEmi.md), [incident](incidents/monthlyemi.json), [screenshot at failure](screenshots/monthlyemi.png)

| # | Suggested locator | Confidence | Reason given | Validation |
| --- | --- | --- | --- | --- |
| 1 | `getByTestId('emi-value')` | 0.96 | The dd carrying data-testid="emi-value" holds exactly the Monthly EMI amount (₹33,038) and is unique on the page, replacing the renamed monthly-emi test id. | ✅ scenario passes; matched `<dd>` "₹33,038" |

### `personalLoanTab`: ✅ healed → `getByRole('tab', { name: 'Personal Loan' })`

- **Intent:** The tab that switches the calculator to a personal loan
- **Broken locator:** `getByRole('tab', { name: 'Personal Loans' })`, matched 0 element(s) (not-found)
- **Scenario:** "Switch to a personal loan with the legacy page object"
- **Evidence:** [prompt](prompts/personalLoanTab.md), [incident](incidents/personalloantab.json), [screenshot at failure](screenshots/personalloantab.png)

| # | Suggested locator | Confidence | Reason given | Validation |
| --- | --- | --- | --- | --- |
| 1 | `getByRole('tab', { name: 'Personal Loan' })` | 0.97 | The accessibility tree shows a single tab with the accessible name "Personal Loan" (singular) inside the "Loan type" tablist, so the original locator only failed because of the trailing "s". | ✅ scenario passes; matched `<button>` "Personal Loan" |

### `totalInterestValue`: ✅ healed → `getByTestId('total-interest-value')`

- **Intent:** The Total Interest Payable amount shown in the loan summary cards
- **Broken locator:** `locator('div.summary-card.interest > span.amount')`, matched 0 element(s) (not-found)
- **Scenario:** "Read the total interest with the legacy page object"
- **Evidence:** [prompt](prompts/totalInterestValue.md), [incident](incidents/totalinterestvalue.json), [screenshot at failure](screenshots/totalinterestvalue.png)

| # | Suggested locator | Confidence | Reason given | Validation |
| --- | --- | --- | --- | --- |
| 1 | `getByTestId('total-interest-value')` | 0.97 | The dd with data-testid="total-interest-value" is the single element holding the Total Interest Payable amount (₹14,64,522) inside the summary card, excluding both the surrounding card container and the pie-legend duplicate. | ✅ scenario passes; matched `<dd>` "₹14,64,522" |
