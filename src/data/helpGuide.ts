export interface HelpGuideSection {
  id: string;
  title: string;
  body: string[];
  adminOnly?: boolean;
}

export const HELP_GUIDE_SECTIONS: HelpGuideSection[] = [
  {
    id: 'ask',
    title: 'Ask about your spending',
    body: [
      'Use the search box at the top of the dashboard to ask questions in plain English, like "where can I save" or "what\'s going out this week" — or how-to questions like "how do I import a statement".',
      'Once you have a few entries, quick-question buttons appear under the search box for common questions.',
    ],
  },
  {
    id: 'expenses',
    title: 'Adding expenses & income',
    body: [
      'Click "Add expense" in the top bar to record a bill, subscription or one-off cost. Set the amount, billing cycle, category and payment method.',
      'Use "Catalog" to add common household bills (Netflix, electricity, broadband, etc.) in one click instead of typing them from scratch.',
      'Use the Spending ledger toolbar to search, choose a category, filter by status, or change the sort order. The spending-mix legend is a summary only, so it never changes your filters.',
      'Paid/Unpaid tracks this payment cycle; Active/Paused controls whether the expense is ongoing. Edit stays visible, while occasional actions such as update amount, contact vendor, duplicate and delete are under the three-dot More menu.',
      'Big one-off costs like a mortgage, loan repayment or large purchase have their own "Mortgage, Loans & Big Purchases" category, kept separate from everyday bills.',
      'Don\'t see a category that fits (e.g. road tolls)? Pick "+ Create new category…" at the bottom of the category dropdown, give it a name, and it\'s ready to use everywhere — for everyone in the household.',
      'Switch to the "Income" tab to record salary, freelance or rental income and see your money in vs money out.',
      'Expecting money back on something — a health insurance claim on a doctor visit, for example? Set "Reimbursement/claim expected" when adding the expense. The full amount still counts as spend until you mark what was actually received, since it\'s genuinely out of pocket until then; once received, only the net cost counts toward Spending, Budgets and category totals — including for a one-off cost, in the month it\'s actually dated.',
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
      'When adding or editing an expense, use the "Assigned Household Member" dropdown to pick who it belongs to instead of leaving it as "Household (Shared)".',
      'Add more household members first from the avatar menu → "Admin & users" → Household Users → "Add household user".',
    ],
  },
  {
    id: 'scan',
    title: 'Scanning a bill or receipt',
    body: [
      'Click the scan icon in the top bar, then paste, drag-and-drop, or upload a screenshot or photo of a bill or receipt.',
      'Tally reads the vendor, amount, date and currency and either pre-fills a new bill for you to review, or matches it to an existing one.',
      'If the bill is in a foreign currency, Tally offers a one-click live conversion to your household currency.',
      'If you use that conversion, the original amount, currency, and the exact rate and date used are kept alongside the converted figure — shown as a small "Originally..." note wherever the bill appears, so you can always see what was actually paid.',
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    body: [
      'Add your bank accounts, cards and loans in the "Accounts" tab. Sensitive details like account numbers and logins are encrypted and only shown when you click "reveal".',
      'Link your expenses and income to the account they\'re paid from or deposited into — this powers Money Map, statement matching, and the AI money-flow analysis.',
      'Set a "Current balance" (and an "as of" date) on any account — it\'s entered manually since there\'s no live bank sync, and it\'s what powers the "Net worth" figure on Overview (assets minus credit cards and loans).',
    ],
  },
  {
    id: 'statements',
    title: 'Importing a bank/card statement',
    body: [
      'Open "Flow" → "Statement imports" → "Import statement", then upload a CSV export, a PDF statement, or a photo/screenshot of a paper statement — Tally reads PDFs and photos with AI, so there\'s no need to convert them to CSV first.',
      'For CSV, tell Tally which column is the date, description and amount. Pick which Account the statement is from either way — this keeps matching accurate once you have more than one account. No accounts yet? Use "Add your first account" right there on the import screen — no need to leave and come back.',
      'From a PDF or photo, Tally also pulls out the account number, sort code, IBAN, account holder and statement period if they\'re printed on it, and checks the account number/sort code against what\'s saved for the account you picked — flagging a mismatch, or offering to save it in one click if that account has nothing on file yet. If the statement is from an account you haven\'t added, click "Add a new account" and Tally carries the extracted account number and sort code straight over, encrypted.',
      'If Tally also read the opening and closing balance off a PDF or photo statement, the review screen shows whether the rows it logged actually add up to that balance change — a quick sanity check that nothing was missed. CSV imports skip this, since a CSV export has no balance to read.',
      'Tally suggests matches against your existing bills and transfers, but only ever auto-confirms a merchant it\'s seen you personally confirm before — everything else sits in "Needs review" until you click "Confirm match".',
      'For rows that aren\'t a bill you\'ve tracked, use "Add as expense" to log them with a proper spending category (Tally remembers the category per merchant for next time), or "Log as transfer" for a quick, uncategorized entry. Either one has an optional note field — good for something worth remembering the context of, like a car service, without needing to log it manually beforehand.',
      'Routine small spending (coffee, weekly shopping) doesn\'t need to be logged as you go at all — let it collect on the statement and clear it in a batch when you next reconcile, using "Add all as expense" on repeat merchants (see below).',
      'Rows that match one you\'ve already imported (same date, amount, direction and merchant) are automatically flagged "Duplicate" and kept out of "Needs review", instead of risking being logged twice — this is what catches two statements overlapping by a few days. Check the "Duplicates" tab to review them, and click "Not a duplicate" if Tally got one wrong.',
      'Click the pencil next to any row\'s description to give that merchant a nickname (e.g. "IEPROS" → "Smyths Toy Shop") — it updates every past and future row from that merchant, not just the one you renamed.',
      'If a row from the same merchant doesn\'t group or get renamed along with the others (some bank statement formats aren\'t recognized as cleanly), click "Recheck matches" next to Sort to re-run matching on everything still unresolved — it catches up rows that couldn\'t be recognized as the same merchant before, instead of you having to fix each one by hand.',
      'A large statement with several repeat merchants starts with those groups already collapsed to keep the list manageable — click "Collapse all" / "Expand all" next to Recheck matches to toggle every group in the current tab at once, or a single group\'s arrow to open just that one.',
      'For a merchant with several rows in the same statement (e.g. five Starbucks visits), use "Add all as expense" on that group to pick a category once and log all of them in one go, instead of one at a time.',
      'If a statement covers several months and a genuine recurring bill (a subscription, a loan repayment) shows up more than once — same amount, evenly spaced — a checkbox appears offering to treat the whole group as one recurring bill instead of separate one-off expenses. Each real occurrence still gets logged at its actual historical date, so trend charts see the real spending history.',
      'Use the Sort dropdown next to the filter tabs to reorder rows by newest/oldest, highest/lowest amount, merchant A–Z, or needs-review-first — useful once a statement covers a long period. Merchant grouping stays either way; sort just controls what comes first.',
      'A suggested match is just a guess — the "Yes, that\'s right" and "No, link a different bill" buttons are equally easy to click, so don\'t worry about picking the wrong one. Correcting a match also improves future suggestions for that merchant.',
      'Rename an imported statement any time from the pencil icon next to its name in the Statements list, or from inside the review screen.',
      'Clicking outside the import dialog never discards anything — only the visible buttons (Back, Import, Done, the X) can close or navigate it.',
      'A statement-import banner shows right at the top of the home page whenever you\'ve never imported one, or it\'s been 30+ days since your last one — click it to open the import dialog directly, no need to go via Flow first. Dismissing it snoozes for two weeks.',
    ],
  },
  {
    id: 'flow',
    title: 'Flow — log every money movement',
    body: [
      'Use "Flow" to log real transfers: income landing in an account, money moving between accounts, or payments going out.',
      'One-off spending (a car repair, a doctor\'s visit) works here too — set "From" to the account that paid, leave "To" as External, and add a note.',
      'Money moving between your own accounts (e.g. topping up Revolut from BOI) is never counted as spend, however you log it — only a transfer whose "To" is External represents money actually leaving the household. If you import both accounts\' statements, log the outgoing side as a transfer, and confirm the matching suggestion on the incoming side rather than creating a second entry — only the real spend that eventually leaves the destination account should become an expense.',
      'Logging a one-off transfer or expense that looks like something already on record (same account, same amount, within a couple of days) shows a dismissible heads-up — it never blocks the entry. Recurring bills and their "marked paid" transfers are never checked this way, since they\'re expected to repeat the same amount every cycle.',
    ],
  },
  {
    id: 'goals',
    title: 'Goals',
    body: [
      'Track savings targets like an emergency fund or a holiday. Link a goal to the account the money is actually sitting in and watch the progress bar fill up.',
      'You can also link a goal from a Planned expense, or from any regular bill — handy for something cheaper paid annually that you can\'t afford in one go, like a subscription. Link a mini goal, top it up monthly, and its progress shows right on that ledger row.',
      'When adding or editing a goal, use "Split into equal payments" to see what the remaining amount works out to per instalment (2, 4, 12, 20, or any custom number) — it\'s just a quick calculator, nothing is saved.',
    ],
  },
  {
    id: 'planned',
    title: 'Planned expenses',
    body: [
      'Got a cost coming up that isn\'t required yet — like college fees? Tick "Planned — not required yet" when adding it, or use "Add planned expense" from the "Planned" tab.',
      'Planned items sit in their own stand-alone list and never count towards totals, bills or insights until you hit "Activate".',
      'Optionally link a planned item to a Goal to track savings progress, and watch for the "consider activating" badge once its date is within 30 days.',
    ],
  },
  {
    id: 'moneymap',
    title: 'Money Map & AI insights',
    body: [
      'The "Money Map" tab has two views: "Auto map" visualizes the real journey your money takes, built from your logged Flow entries — or a projected monthly view if you haven\'t logged transfers yet.',
      '"My map" is your own freeform, editable canvas — add any object (an account, a loan, anything not yet tracked), connect objects with a directional arrow, and drag them around to sketch out exactly how your money moves.',
      'In "Insights", click "Analyze my money flow" for an on-demand AI review of idle cash, direct-debit timing risk, account consolidation, and savings opportunities.',
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
    id: 'sharing',
    title: 'Sharing your workspace',
    body: [
      'Click "Share" and enter their email to invite a partner or family member — Tally is invite-only, so this is the only way to add someone; there\'s no shareable link or code. They can sign in with that email as soon as you\'ve added them.',
      'Everyone in the same household sees the same shared ledger.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy blur',
    body: [
      'The whole screen blurs automatically after 90 seconds of inactivity or when the tab loses focus — click "Reveal Tally" to return, or toggle it manually with the eye icon in the top bar.',
      'A few of the most sensitive figures — "Left after bills" on Overview, and every income amount on the Income tab — carry a second, independent blur on top of that. It stays blurred even when the screen-wide blur above is switched off, and each one only unblurs on its own click — revealing one doesn\'t reveal the others, and it stays revealed for the rest of your session.',
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
      'For a real, restorable backup, ask an admin to use "Admin → Database Snapshots" — it covers every account, goal, bill, income record and transfer, and can genuinely restore your household back to that point in time.',
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
      '"Database Snapshots" takes a full point-in-time backup of the household\'s accounts, goals, bills, income and transfers, stored in the cloud. "Restore" replaces all of the household\'s current data with what\'s in that snapshot — a real undo, not a preview — so the confirmation shows the snapshot\'s age and record count before you commit to it.',
      'One snapshot happens automatically every day, tagged "Automatic" in the list, with the most recent 14 kept. A manual snapshot is only worth creating right before doing something risky, like a restore.',
      '"Recent activity" is a plain log of deletions, backup restores, member removal, and role changes — who did it and when. It\'s not a full edit history, just the actions worth being able to look back on.',
    ],
  },
];
