export interface HelpGuideScreenshot {
  src: string;
  alt: string;
  caption: string;
}

export interface HelpGuideSection {
  id: string;
  title: string;
  body: string[];
  adminOnly?: boolean;
  /** Optional real screenshots shown inline under this section's body on
   * the public /guide page only — the in-app Help modal stays text-only. */
  screenshots?: HelpGuideScreenshot[];
}

export const HELP_GUIDE_SECTIONS: HelpGuideSection[] = [
  {
    id: 'signin',
    title: 'Signing in',
    body: [
      'Tally uses passwordless sign-in: enter your email address and you\'ll receive a 6-digit code valid for 15 minutes. Enter the code to sign in — there\'s no password to remember or leak.',
      'Tally is invite-only — there\'s no self-service sign-up. An admin invites you by email first; once invited, just enter that email at sign-in like anyone else.',
      'Sessions last up to 30 days in a secure, httpOnly cookie, so you\'re not asked to log back in every visit. For security, you\'re automatically signed out after 30 minutes of inactivity in an open tab — actively using the app resets this timer, so it never interrupts you mid-task.',
    ],
  },
  {
    id: 'overview',
    title: 'Overview',
    body: [
      'The landing dashboard once you sign in — your household\'s current-period totals at a glance: money in, money out, and how your budget is tracking. Use it as your starting point before drilling into a specific area.',
      'A statement-import banner shows here whenever you\'ve never imported one, or it\'s been 30+ days since your last one, so importing is a one-click action from the moment you land, not something buried in Flow. Dismissing it snoozes for two weeks rather than turning it off for good.',
      'A "Net worth" figure appears once at least one account has a balance set — assets (checking, savings, PayPal, investments, etc.) minus credit cards and loans. It\'s blurred the same way as "Left after bills" until you click to reveal it.',
    ],
    screenshots: [
      { src: '/guide/overview.png', alt: 'Tally Overview dashboard showing this month\'s committed spend, coming-up bills, and account totals', caption: 'The Overview dashboard — your starting point, with this month\'s totals and a net-worth figure once you\'ve set account balances.' },
    ],
  },
  {
    id: 'ask',
    title: 'Ask about your spending',
    body: [
      'Use the search box at the top of the dashboard to ask questions in plain English, like "where can I save" or "what\'s going out this week" — or how-to questions like "how do I import a statement".',
      'Tally answers using only your own household\'s data, and only when you actively ask — nothing runs automatically in the background. Once you have a few entries, quick-question buttons appear under the search box for common questions.',
    ],
  },
  {
    id: 'expenses',
    title: 'Adding expenses & income',
    body: [
      'Click "Add expense" in the top bar to record a bill, subscription or one-off cost. Set the amount, currency, billing cycle (weekly, monthly, quarterly, termly, annual, once), category, and payment method — everything else (contract end date, reimbursement, vendor contact, notes) is tucked behind "Add optional details" and only needs opening when it actually applies.',
      'Use billing cycle "once" for a single payment like a large purchase — it won\'t recur or roll forward once its date passes. Its date doubles as its payment date: this month\'s spend, Budgets, and the category charts count it in full in the calendar month it\'s dated, but only that one month, not every month after.',
      'Use "Catalog" to add common household bills (Netflix, electricity, broadband, etc.) in one click instead of typing them from scratch.',
      'Use the Spending ledger toolbar to search, choose a category, filter by status, or change the sort order. The spending-mix legend above it is a summary only, so it never changes your filters.',
      'Paid/Unpaid tracks the current payment cycle; the separately labelled Active/Paused switch controls whether the expense is ongoing. Edit stays visible, while less common actions — update amount, contact vendor, duplicate, delete — are under the three-dot More menu.',
      'Mark a subscription\'s usage as low/medium/high — low-usage items are flagged as cancellation candidates in Insights. Pause a subscription instead of deleting it to keep its history and see it counted in your "already saving" total.',
      'Big one-off costs like a mortgage, loan repayment or large purchase have their own "Mortgage, Loans & Big Purchases" category, kept separate from everyday bills.',
      'Don\'t see a category that fits (e.g. road tolls)? Pick "+ Create new category…" at the bottom of the category dropdown, give it a name, and it\'s ready to use everywhere — for everyone in the household, with an automatically assigned colour.',
      'Switch to the "Income" tab to record salary, freelance or rental income and see your money in vs money out. Link each income source to the account it lands in so Money Map and money-flow analysis can use it.',
      'Click "Not yet" on an income to confirm it\'s actually landed — a small form asks for the actual amount and date received, pre-filled with the usual figures but editable. This is for anything that fluctuates (a salary that isn\'t identical every month): once confirmed, "This month\'s income" everywhere in Tally uses the real amount, not the estimate. Click "Received" again to undo a mistake — that also removes what was logged for the month, so re-confirming with the right figure doesn\'t double it up.',
      'Expecting money back on something — a health insurance claim on a doctor visit, for example? Set "Reimbursement/claim expected" when adding the expense. The full amount still counts as spend until you mark what was actually received, since it\'s genuinely out of pocket until then; once received, only the net cost counts toward Spending, Budgets and category totals — including for a one-off cost, in the month it\'s actually dated. Once the claim actually lands in an account, log it as a real transfer in Flow too, so your account balances stay accurate.',
    ],
    screenshots: [
      { src: '/guide/add-expense.png', alt: 'Add expense form with amount, description, billing cycle and category fields', caption: 'Add expense — essentials up front, optional details (assignment, contract, reimbursement, vendor contact, notes) behind one toggle.' },
      { src: '/guide/income.png', alt: 'Income tab listing salary and other income sources with amounts and next pay dates', caption: 'The Income tab — record salary, freelance or rental income and mark it received with the real amount once it lands.' },
    ],
  },
  {
    id: 'budgets',
    title: 'Setting a category budget',
    body: [
      'On the Spending tab\'s "All spending" view, click "Set a budget" to give any category (built-in or custom) a monthly limit.',
      'Each budgeted category shows a progress bar comparing its current monthly-equivalent spend — the same run-rate figure used everywhere else in Tally — against your limit, turning amber near the limit and red once it\'s exceeded.',
      'Edit or remove a limit any time from its row. Categories with no limit set just don\'t show a bar — nothing forces you to budget every category.',
      'This is a simple monthly check, not a full budgeting system: there\'s no rollover of unused amounts, no spending history over time, and no per-person split.',
    ],
  },
  {
    id: 'assign',
    title: 'Assigning a bill to a household member',
    body: [
      'When adding or editing an expense, open "Add optional details" and use the "Assigned Household Member" dropdown to pick who it belongs to instead of leaving it as "Household (Shared)".',
      'Add more household members first from the avatar menu → "Admin & users" → Household Users → "Add household user".',
    ],
  },
  {
    id: 'scan',
    title: 'Scanning a bill or receipt',
    body: [
      'Click the scan icon in the top bar, then paste, drag-and-drop, or upload a screenshot or photo of a bill or receipt.',
      'Tally reads the vendor, amount, date and currency and either pre-fills a new bill for you to review, or matches it to an existing one.',
      'If the bill is in a foreign currency, Tally offers a one-click live conversion to your household currency — the original amount, currency, and the exact rate and date used are kept alongside the converted figure, shown as a small "Originally..." note wherever the bill appears.',
    ],
  },
  {
    id: 'billscalendar',
    title: 'Bills',
    body: [
      'The "Bills" tab is a payment-schedule view of your recurring bills and contracts only — one-off spending doesn\'t show here, just in Spending.',
      'A chart shows bills actually paid over each of the last several months (1/3/6/12mo or all time), so you can see whether your recurring costs are trending up or down.',
      '"Upcoming renewals & debits" totals what\'s due in the next 7 and 30 days, then lists them chronologically — a quick way to plan cash flow around due dates without scanning the full Spending ledger.',
    ],
    screenshots: [
      { src: '/guide/bills-calendar.png', alt: 'Bills tab showing a paid-over-time chart and an upcoming renewals schedule', caption: 'Bills — recurring costs trending over time, plus what\'s due in the next 7 and 30 days.' },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    body: [
      'Add your bank accounts, cards and loans in the "Accounts" tab. Sensitive details like account numbers and logins are encrypted at rest — never sent to the browser in plain text, only revealed on demand.',
      'Supported types: Checking, Savings, Credit Union, Credit Card, Debit Card, PayPal, Loan, Investment, Other.',
      'Link your expenses and income to the account they\'re paid from or deposited into — this powers Money Map, statement matching, and the AI money-flow analysis.',
      'Set a "Current balance" (and an "as of" date) on any account — it\'s entered manually since there\'s no live bank sync, and it\'s what powers the "Net worth" figure on Overview (assets minus credit cards and loans).',
      'For a Loan, you can also track the original amount, interest rate, term, and payoff date.',
      'Don\'t have any accounts yet? You don\'t need to start here — Statement imports let you add your first account inline, right from the import screen.',
    ],
    screenshots: [
      { src: '/guide/accounts.png', alt: 'Accounts tab listing bank accounts, credit cards and loans with balances', caption: 'Accounts — checking, savings, cards and loans, with sensitive fields encrypted and only revealed on demand.' },
    ],
  },
  {
    id: 'statements',
    title: 'Importing a bank/card statement',
    body: [
      'Open "Flow" → "Statement imports" → "Import statement", then upload a CSV export, a PDF statement, or a photo/screenshot of a paper statement — Tally reads PDFs and photos with AI, so there\'s no need to convert them to CSV first.',
      'For CSV, tell Tally which column is the date, description and amount. Pick which Account the statement is from either way — this keeps matching accurate once you have more than one account. No accounts yet? Use "Add your first account" right there on the import screen.',
      'From a PDF or photo, Tally also pulls out the account number, sort code, IBAN, BIC/SWIFT, account holder and statement period if they\'re printed on it, and cross-checks them against every account you\'ve already saved — not just the one you\'ve picked. A clear single match is selected automatically; if it could be more than one saved account, you\'re shown that short list to pick from instead of a guess. Once an account is picked, any mismatched field is flagged, or you can save it in one click if that account has nothing on file yet for it.',
      'If Tally also read the opening and closing balance off a PDF or photo statement, the review screen shows whether the rows it logged actually add up to that balance change — a quick sanity check that nothing was missed. CSV imports skip this, since a CSV export has no balance to read.',
      'Tally suggests matches against your existing bills and transfers, but only ever auto-confirms a merchant it\'s seen you personally confirm before — everything else sits in "Needs review" until you click "Confirm match".',
      'For rows that aren\'t a bill you\'ve tracked, use "Add as expense" to log them with a proper spending category (Tally remembers the category per merchant for next time), or "Log as transfer" for a quick, uncategorized entry.',
      'Money coming in shows different buttons: "Link to income" ties it to one of your recorded income sources at its real amount and date — this is how a fluctuating salary reconciles, and marks that income "Received" automatically. Use "Log as transfer" instead for a one-off credit that isn\'t tracked income, like a refund or a gift.',
      'Routine small spending (coffee, weekly shopping) doesn\'t need to be logged as you go at all — let it collect on the statement and clear it in a batch when you next reconcile, using "Add all as expense" on repeat merchants.',
      'Rows that match one you\'ve already imported (same date, amount, direction and merchant) are automatically flagged "Duplicate" and kept out of "Needs review" — this is what catches two statements overlapping by a few days. Check the "Duplicates" tab to review them.',
      'Click the pencil next to any row\'s description to give that merchant a nickname (e.g. "IEPROS" → "Smyths Toy Shop") — it updates every past and future row from that merchant.',
      'If a statement covers several months and a genuine recurring bill shows up more than once — same amount, evenly spaced — a checkbox appears offering to treat the whole group as one recurring bill instead of separate one-off expenses, while still logging each real occurrence at its actual historical date.',
      'Deleting an import keeps anything you\'ve already logged from it in your ledger — but any row still sitting in Needs review, Ignored, or flagged Duplicate is permanently deleted along with it. "Undo this import" (next to Delete) is a stronger action: it removes everything the import produced, bills and transfers included, not just the unresolved rows. Neither can be undone once confirmed.',
      'Clicking outside the import dialog never discards anything — only the visible buttons (Back, Import, Done, the X) can close or navigate it.',
    ],
    screenshots: [
      { src: '/guide/statement-review.png', alt: 'Statement import review screen showing matched and unmatched transaction rows', caption: 'Reviewing an imported statement — matched bills, needs-review rows, and duplicates flagged automatically.' },
    ],
  },
  {
    id: 'flow',
    title: 'Flow — log every money movement',
    body: [
      'Use "Flow" to log real transfers: income landing in an account, money moving between accounts, or payments going out.',
      'One-off spending (a car repair, a doctor\'s visit) works here too — set "From" to the account that paid, leave "To" as External, and add a note.',
      'Money moving between your own accounts (e.g. topping up Revolut from BOI) is never counted as spend, however you log it — only a transfer whose "To" is External represents money actually leaving the household. If you import both accounts\' statements, log the outgoing side as a transfer, and confirm the matching suggestion on the incoming side rather than creating a second entry.',
      'Logging a one-off transfer or expense that looks like something already on record (same account, same amount, within a couple of days) shows a dismissible heads-up — it never blocks the entry. Recurring bills and their "marked paid" transfers are never checked this way, since they\'re expected to repeat the same amount every cycle.',
    ],
  },
  {
    id: 'goals',
    title: 'Progress',
    body: [
      'The Progress tab is one place for the things you\'re slowly moving a needle on: loans and credit cards being paid down, and savings goals being built up. A strip at the top shows total owed, total saved toward goals, and how many goals are on track.',
      'Loans & cards: every Loan or Credit Card account with a balance shows here. For a loan with an original amount set (in Accounts), you get a payoff bar — how much is cleared, how much is left — plus any payments logged toward it from Flow, and its rate, term and target payoff date. Credit cards just show the amount owed and payments logged.',
      'Goals: track savings targets like an emergency fund or a holiday. Each goal has a name, target amount, current amount, optional target date, and can be linked to the account the money is actually sitting in. Link a recurring top-up (a regular bill or Planned expense pointing at the goal) and Tally projects when you\'ll reach it — "~€150/mo → on track for Mar 2027 (2 mo ahead of target)".',
      'You can also link a goal from a Planned expense, or from any regular bill — handy for something cheaper paid annually that you can\'t afford in one go, like a subscription. When adding or editing a goal, use "Split into equal payments" to see what the remaining amount works out to per instalment (2, 4, 12, 20, or any custom number) — it\'s just a quick calculator, nothing is saved.',
    ],
  },
  {
    id: 'planned',
    title: 'Planned expenses',
    body: [
      'Got a cost coming up that isn\'t required yet — like college fees? Tick "Planned — not required yet" when adding it, or use "Add planned expense" from the "Planned" tab.',
      'Planned items sit in their own stand-alone list and never count towards totals, bills, insights, or money-flow analysis until you hit "Activate".',
      'Optionally link a planned item to a Goal to track savings progress, and watch for the "consider activating" badge once its date is within 30 days. A quiet banner on Overview nudges you toward the Planned list whenever you have upcoming planned costs — informational only, never changes any figures.',
    ],
  },
  {
    id: 'moneymap',
    title: 'Money Map',
    body: [
      'A visual diagram of your money\'s journey, with two modes. "Actual journey" (default once you\'ve logged transfers in Flow) is built from your real dated Transfer records — three columns (money in → your accounts → money out) plus a distinct path for direct account-to-account transfers. Filter by All time / 90 days / 30 days.',
      '"Projected" is the original monthly-equivalent view, built from your recurring Expenses/Income linked to accounts — useful before you\'ve logged any real transfers, or to see a "typical month" projection alongside the real history.',
      '"My map" is your own freeform, editable canvas — add any object (an account, a loan, anything not yet tracked), connect objects with a directional arrow, and drag them around to sketch out exactly how your money moves.',
      'Hover any connection to see the exact amount. Account circles are colored blue when net-positive and red when net-negative or a loan.',
    ],
    screenshots: [
      { src: '/guide/money-map.png', alt: 'Money Map diagram showing accounts connected by flows of money in and out', caption: 'Money Map\'s Actual journey view — built from your real logged transfers, not a projection.' },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    body: [
      'Money flow analysis (AI): click "Analyze my money flow" for an on-demand AI review of your accounts, transfers, and goals — flagging idle cash sitting in low-interest accounts, direct-debit timing risk (bills landing before income arrives), account consolidation opportunities, and concrete savings suggestions. This is opt-in per click, not automatic, and only ever uses your own household\'s data.',
      'What could we save? — a rule-based (non-AI) breakdown of savings opportunities: switching monthly subscriptions to annual billing, rarely-used subscriptions worth cancelling, and a running total of what you\'re already saving from paused subscriptions. Toggle the horizon between 1 month, 1 year, 3 years, and 5 years.',
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    body: [
      'The "Reports" tab has four views — Trends, Category & Vendor, Timeline, and Insights — each covering a period you choose (1/3/6/12 months, or all time).',
      'Every report is built from the household\'s full real transfer ledger, including ad-hoc transfers not tied to a tracked bill or income, so nothing real gets missed. A transfer between two of your own accounts never counts as spend or income, the same rule Flow and Spending use. Spend with no linked bill shows up under "Uncategorized" rather than being dropped.',
      'Every table has an "Export CSV" button. For a clean PDF, use your browser\'s Print (Save as PDF) from the Reports tab — it prints just the report, without navigation or buttons.',
    ],
    screenshots: [
      { src: '/guide/reports.png', alt: 'Reports tab showing a Trends chart of monthly spending versus income', caption: 'Reports — Trends, Category & Vendor, Timeline, and Insights, all built from your real transfer ledger.' },
    ],
  },
  {
    id: 'renewals',
    title: 'Contract renewals & reminders',
    body: [
      'If an expense has a contract end date, a badge appears on it once that date is within 60 days.',
      'The household is emailed automatically 30, 14 and 7 days before a contract ends, so nothing renews without you noticing.',
    ],
  },
  {
    id: 'vendor',
    title: 'Contacting a vendor',
    body: [
      'If an expense has a vendor email saved, open its three-dot More menu in the ledger and choose "Contact vendor".',
      'Tally prepares a draft email for you (ask for a better rate, cancel, or ask about renewal terms) — review and edit it, then send it yourself. Nothing is ever emailed automatically without you clicking send.',
    ],
  },
  {
    id: 'settings',
    title: 'Settings & preferences',
    body: [
      'Open Settings via the gear icon in the top bar. Set your preferred display currency (EUR, GBP, USD, CAD, AUD, JPY — amounts convert automatically), and manage other household-wide preferences from the same place, including shortcuts to the 1-Click Catalog, Export, and Share Workspace.',
    ],
  },
  {
    id: 'sharing',
    title: 'Sharing your workspace',
    body: [
      'Click "Share" and enter their email to invite a partner or family member — Tally is invite-only, so this is the only way to add someone; there\'s no shareable link or code. If email sending is configured, they\'ll also get an email with a link to the app; either way, they can sign in with that email as soon as you\'ve added them.',
      'Everyone in the same household sees the same shared ledger — accounts, expenses, income, transfers, and goals are all shared, not per-person.',
    ],
    screenshots: [
      { src: '/guide/sharing.png', alt: 'Share workspace modal with an email invite field', caption: 'Sharing your workspace — invite a partner or family member by email; they can sign in as soon as they\'re added.' },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & security',
    body: [
      'Passwordless sign-in via one-time 6-digit codes — no passwords stored anywhere. Session tokens live in a secure, httpOnly cookie, valid up to 30 days — but an idle tab automatically signs out after 30 minutes of no activity, independent of that 30-day window.',
      'The whole screen blurs automatically for privacy after 90 seconds of inactivity (or when the tab loses focus) — click "Reveal Tally" to return, or toggle it manually anytime with the eye icon in the top bar.',
      'A handful of the most sensitive figures — "Left after bills" on Overview, and every income amount on the Income tab — carry a second, independent blur on top of that. It stays blurred even when the screen-wide blur is switched off, and each figure only unblurs on its own click (revealing one doesn\'t reveal the others); once revealed, it stays visible for the rest of your session.',
      'Sensitive account fields (account numbers, online banking logins, security notes) are encrypted at rest and only decrypted on an explicit "reveal" action — or, for statement imports, an on-the-fly admin-only comparison that returns a match/mismatch signal but never the decrypted value itself.',
      'AI features (the Ask box and Money flow analysis) only ever send your own household\'s data, and only when you actively trigger them — nothing runs automatically in the background.',
      'Full details: see the in-app Privacy page (footer link) and the AI transparency page.',
    ],
  },
  {
    id: 'faq',
    title: 'Frequently asked questions',
    body: [
      'What happens if you delete a statement import? Any bill or one-off payment you already logged from it stays in your ledger untouched. But every row still sitting in Needs review, Ignored, or flagged as a Duplicate is permanently deleted along with the import — so resolve or double-check those first.',
      'For a stronger reset, "Undo this import" (next to Delete) removes everything the import produced, including bills and transfers you already logged from it — not just the unresolved rows. The confirmation states exactly how many of each will be removed. Neither action can be undone once confirmed.',
      'What happens if you delete an account? Expenses, income, transfers and savings goals linked to it are not deleted — they just lose that account link (e.g. "paid from" becomes unset). The one exception is a custom Money Map: any node you placed for that account is removed along with it.',
      'What happens if you delete a custom category? Expenses already using it are not deleted or reassigned — they just show a generic fallback label until you edit them with a different category.',
      'What happens if you delete an expense that a statement row was matched to? That statement row keeps showing "Matched" but with no name — click "Undo" on it to send it back to Needs review, where you can resolve it again.',
      'What happens if you remove a household member? Nothing they created — bills, income, transfers, goals — is deleted. Those records stay exactly as they are, they just lose the "added by" attribution.',
    ],
  },
  {
    id: 'export',
    title: 'Export & backup',
    body: [
      'Click "Export" to download your bills as a CSV spreadsheet or a JSON file at any time — a portable copy, not a restorable backup.',
      'For a real, restorable backup, ask an admin to use "Admin → Database Snapshots" — it covers your entire household (accounts, goals, bills, income, transfers, statement imports and their matches, custom categories, budgets and your custom Money Map), and can genuinely restore it all back to that point in time.',
      'A snapshot is also taken automatically every day (the most recent 14 are kept), so a real backup exists even if nobody remembers to make one manually.',
    ],
  },
  {
    id: 'admin',
    title: 'Admin & users',
    adminOnly: true,
    body: [
      'As an admin, the "Admin & users" tab lets you manage household member accounts, change roles, and remove accounts that no longer belong.',
      'There must always be at least one Admin in a household — the app won\'t let you remove the last one. "Backup Admin" has identical permissions to "Admin" today — it\'s a separate role only so it\'s clear who the usual admin is, not a lesser one.',
      '"Database Snapshots" takes a full point-in-time backup of the entire household — accounts, goals, bills, income, transfers, statement imports and their matches, custom categories, budgets and your custom Money Map — stored in the cloud. "Restore" replaces all of the household\'s current data with what\'s in that snapshot — a real undo, not a preview — so the confirmation shows the snapshot\'s age and record count before you commit to it.',
      'One snapshot happens automatically every day, tagged "Automatic" in the list, with the most recent 14 kept. A manual snapshot is only worth creating right before doing something risky, like a restore.',
      '"Recent activity" is a plain log of deletions, backup restores, member removal, and role changes — who did it and when. It\'s not a full edit history, just the actions worth being able to look back on.',
    ],
  },
];
