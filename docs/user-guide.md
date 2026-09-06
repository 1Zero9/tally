# Tally User Guide

*Simple records. Clearer days.*

Tally is a shared household ledger for expenses, income, accounts, and the real journey your money takes — plus AI-assisted insights to help you save. This guide walks through every part of the app, section by section, so you can jump straight to what you need.

---

## Why Tally?

Most budgeting apps show you category totals and ask you to trust them. Tally is built around a different idea: the household's shared, checkable source of truth for where money actually comes from, where it actually goes, and what's coming up next.

- **One shared ledger, not five spreadsheets.** Everyone in the household sees the same accounts, bills, income, and goals — no copy-pasting numbers between people.
- **Real money movements, not guesses.** Log actual transfers and reconcile them against real bank statements (CSV, PDF, or just a photo) so your numbers match what actually happened.
- **AI that works for you, on demand.** Ask a plain-English question, scan a receipt, or run a money-flow analysis whenever you want — always using only your own household's data, and only when you ask for it.
- **Every number is traceable.** Nothing is a black-box estimate — every figure ties back to a real bill, transfer, or statement row you can click into and check.

---

## Contents

1. [Signing in](#1-signing-in)
2. [Overview](#2-overview)
3. [Spending](#3-spending)
4. [Bills (calendar)](#4-bills-calendar)
5. [Income](#5-income)
6. [Accounts](#6-accounts)
7. [Flow (the money journey ledger)](#7-flow-the-money-journey-ledger)
8. [Goals](#8-goals)
9. [Planned expenses](#9-planned-expenses)
10. [Money Map](#10-money-map)
11. [Insights](#11-insights)
12. [Reports](#12-reports)
13. [Asking Tally a question](#13-asking-tally-a-question)
14. [Settings & preferences](#14-settings--preferences)
15. [Sharing your household workspace](#15-sharing-your-household-workspace)
16. [Admin & users](#16-admin--users)
17. [Data export & backup](#17-data-export--backup)
18. [Privacy & security](#18-privacy--security)
19. [Frequently asked questions](#19-frequently-asked-questions)

---

## 1. Signing in

Tally uses **passwordless sign-in**: enter your email address and you'll receive a 6-digit code valid for 15 minutes. Enter the code to sign in — there's no password to remember or leak.

- New to a household? Tally is invite-only — there's no self-service sign-up. An admin invites you by email first (see [Sharing your household workspace](#14-sharing-your-household-workspace)); once invited, just enter that email at sign-in like anyone else.
- Sessions last up to 30 days and are stored in a secure, httpOnly cookie — nothing you can access from other browser scripts — so you're not asked to log back in every visit.
- For security, you're automatically signed out after **30 minutes of inactivity** in an open tab (no mouse, keyboard, scroll, or touch activity) — you'll see a note on the login screen explaining why next time you sign back in. Actively using the app resets this timer, so it never interrupts you mid-task.
- A copy of your basic profile is cached in your browser's local storage purely so the app can greet you instantly on return visits; it is not used for authentication.

## 2. Overview

The landing dashboard once you sign in. It shows your household's current-period totals at a glance: money in, money out, and how your budget is tracking. Use this as your starting point before drilling into a specific area.

- A **statement import** banner shows here whenever you've never imported one, or it's been 30+ days since your last one — even before you've added anything else, so importing a statement is a one-click primary action, not something buried in Flow. Dismissing it snoozes it for two weeks rather than turning it off for good; it naturally stops showing once you've imported something recently.
- A **Net worth** figure appears once at least one [Account](#6-accounts) has a balance set — assets (checking, savings, PayPal, investments, etc.) minus credit cards and loans. It's blurred the same way as "Left after bills" until you click to reveal it.

## 3. Spending

The **Spending** tab (and its sub-views: **All**, **AI & Tech**, **Utilities**, **Education**, **Mortgage, Loans & Big Purchases**) is your recurring-bill ledger — subscriptions, utilities, household costs, and big-ticket items like mortgage or loan repayments and one-off large purchases.

- **Add expense**: set the amount, currency, billing cycle (`weekly`, `monthly`, `quarterly`, `termly`, `annual`, `once`), category, payment method, and optional contract end date.
- **Custom categories**: don't see a fit among the built-in categories (e.g. road/bridge tolls)? Pick **+ Create new category…** at the bottom of the category dropdown, name it, and it's instantly available on every category picker in the app — shared across the household, with an automatically assigned colour.
- **One-off costs**: use billing cycle `once` for a single payment (e.g. a large purchase). It won't recur or roll forward once its date passes — mark it paid or delete it when done. Its date doubles as its payment date: "This month spent", Budgets, and the category charts count it in full in the calendar month it's dated, same as any actual payment — but, unlike a recurring bill's steady-state rate, it only counts in that one month, not every month after.
- **Catalog**: add common household bills (Netflix, electricity, broadband, etc.) in one click instead of typing them from scratch.
- **Usage rating**: mark a subscription as low/medium/high usage — low-usage items are flagged as cancellation candidates in Insights.
- **Pause / resume**: pause a subscription instead of deleting it, so you keep the history and see it counted in your "already saving" total.
- **Find and filter**: use the ledger toolbar to search by name, choose one category, filter by payment/activity status, or change the sort order. The spending-mix legend above it is a quick visual summary and does not change the ledger.
- **Row controls**: **Paid/Unpaid** tracks the current payment cycle; the separately labelled **Active/Paused** switch controls whether the expense is ongoing. **Edit** stays visible, while less common actions—including update amount, contact vendor, duplicate, and delete—are under **More** (•••).
- **Contract renewal reminders**: once an expense's contract end date is within 60 days, a badge appears on it, and the household is emailed automatically at 30, 14 and 7 days before it ends.
- **Contact a vendor**: if an expense has a vendor email saved, open **More** (•••) and choose **Contact vendor** to have Tally draft a polite email (negotiate a better rate, cancel, or ask about renewal terms). You always review and send it yourself — nothing is emailed automatically.
- **Reimbursements & claims**: set "Reimbursement/claim expected" on any expense (e.g. a health insurance claim on a doctor visit) — the full amount still counts until you mark it received, since the money is genuinely out of pocket until then. Once you enter what was actually received, only the net cost counts toward Spending, Budgets, and category totals from then on — including for a one-off cost, in the month it's actually dated. Once the claim actually lands in an account, log it as a real transfer in Flow too, the same way as the BOI/Revolut money mentioned above, so your account balances and history stay accurate.
- **Budgets**: on the **All spending** view, set a monthly limit for any category (built-in or custom) under **Set a budget**. Each budgeted category shows a progress bar comparing its current monthly-equivalent spend (the same run-rate figure used everywhere else in Tally) against your limit — turning amber near the limit and red once it's exceeded. Edit or remove a limit any time; categories with no limit set just don't show a bar. This is a simple monthly check, not a full budgeting system — there's no rollover of unused amounts, no spending history, and no per-person split.

## 4. Bills (calendar)

A 31-day renewal calendar showing what's due and when, with urgency indicators for anything renewing within 7 days. Use it to plan cash flow around due dates.

## 5. Income

Record salary, freelance, rental, or other recurring income with an amount, currency, and frequency. Link each income source to the account it lands in (see [Accounts](#6-accounts)) so Money Map and money-flow analysis can use it.

## 6. Accounts

Your household's bank accounts, cards, and loans, stored with sensitive fields (account/routing numbers, online banking logins, security notes) **encrypted at rest** — never sent to the browser in plain text, only revealed on demand.

Supported account types: **Checking, Savings, Credit Union, Credit Card, Debit Card, PayPal, Loan, Investment, Other**.

- **Current balance**: optionally set a balance and an "as of" date on any account. This is entered manually — Tally has no live bank sync, so it's only as current as you keep it — but it's what powers the **Net worth** figure on Overview (assets minus credit cards and loans).

- Link expenses to the account they're paid from, and income to the account it's deposited into — this powers Money Map and the Insights AI analysis.
- For a **Loan**, you can track the original amount, interest rate, term, and payoff date.
- Don't have any accounts yet? You don't need to start here — [Statement imports](#7-flow-the-money-journey-ledger) let you add your first account inline, right from the import screen.
- Sensitive fields are masked in list views (`hasAccountNumber`, `hasLoginPassword`, etc.) and only decrypted when you explicitly click "reveal."

## 7. Flow (the money journey ledger)

**Flow** is where you log every real movement of money — the household's transfer ledger. Each entry has a **From** and a **To**:

- **Income landing**: From = *External (income source)*, To = one of your accounts.
- **Moving money between accounts**: From = one account, To = another account (e.g. sweeping savings into current, or topping up a card like Revolut from your main account). This never counts as spending anywhere in Tally — only a transfer whose "To" is External represents money actually leaving the household.
- **Payments and one-off spending**: From = the account paying, To = *External (payment / one-off spend)*. This covers recurring direct debits **and** one-off costs like a car repair, a doctor's visit, or a heating repair — just pick which account paid for it and add a note (e.g. "Car repair", "Netflix DD", "Doctor visit").

You can optionally link a transfer to an existing recurring Expense or Income record, or just use a free-text label for anything ad hoc. Every transfer is dated, so Flow becomes a real, searchable history of where your money actually went — not just a projection.

**Possible-duplicate check**: logging a one-off transfer or expense that looks like something already on record (same account, same amount, within a couple of days) shows a dismissible heads-up — it never blocks the entry, since a genuine repeat payment does happen. Recurring bills and their "marked paid" transfers are never checked this way, since those are expected to repeat the same amount every cycle.

### Statement imports

Under Flow, **Statement imports** lets you cross-check a real bank or credit-card statement against what you've already logged.

**Money that passes through more than one of your own accounts** (e.g. you top up Revolut from BOI, then spend from Revolut) should be logged as a transfer on both ends, never as an expense — an internal transfer is never counted as spend. If you import both statements, add both accounts under [Accounts](#6-accounts) first, then: resolve the outgoing row on the source account (BOI) as **Log as transfer** (From: BOI, To: Revolut); when you later import the destination account's statement, the matching incoming row should come up as a **suggested match** against that same transfer — confirm it rather than creating a second entry. Only the money that actually leaves Revolut for something real (a shop, a bill, cash sent to someone outside the household) should be logged as an expense — the top-up itself never should be, so it can't double-count against the account it came from.

**Uploading**
- Upload a CSV, PDF, or photo/screenshot — CSV works best, but Tally reads PDFs and photos with AI, so there's no need to convert a bank PDF to CSV first.
- For CSV, tell Tally which column is the date, description, and amount. Either way, pick which **Account** the statement is from — this keeps matching accurate once you have more than one account.
- From a PDF or photo, Tally also extracts account details printed on it — bank name, account holder, account number, sort code, IBAN, BIC/SWIFT, statement period, opening/closing balance — and **cross-checks them against every account you've already saved**, not just the one you've picked. A clear single match is selected for you automatically ("Matched to..."); if it looks like more than one saved account could be it, you're shown the short list to pick from instead of a guess. Once you've picked (or confirmed) an account, any mismatched field is flagged; if nothing's saved yet for a field, save the extracted value to that account in one click.
- **Balance reconciliation**: when both the opening and closing balance were found on a PDF or photo statement, the review screen shows whether the rows Tally logged actually add up to that balance change — a quick check that nothing from the statement was missed. CSV imports don't show this (a CSV export has no such header to read).
- **No account for this statement yet?** Click **Add a new account** (or **Add your first account**) right on the import screen. Any account number, sort code, IBAN, and BIC Tally found are carried over and encrypted automatically — this works for CSV too, even without extracted details.

**Reviewing matches**
- Tally suggests matches against your existing bills and transfers, and flags recurring-but-untracked charges worth checking — but only auto-confirms a merchant you've personally confirmed before. Everything else waits in **Needs review**.
- A suggested match is only ever a guess: the confirm and correct buttons are equally weighted, and a low-confidence guess shows a reassurance note. Correcting a match also improves future suggestions for that merchant.
- Not a bill you've tracked? **Add as expense** logs it with a proper spending category (remembered per merchant next time) — or use **Log as transfer** for a quick, uncategorized entry. Either one has an optional note field, so something worth remembering the context of (e.g. a car service, or a large one-off repair) can get proper detail right there — no need to log it manually beforehand just to have somewhere to put a note. Routine small spending (a coffee, weekly shopping) doesn't need this at all — just let it show up here and clear it in a batch when you next reconcile.
- **Duplicates are caught automatically**: a row that matches one you've already imported (same date, amount, direction and merchant) is flagged **Duplicate** and kept out of Needs review, instead of risking being logged twice — this is what catches the common case of two statements overlapping by a few days. Check the **Duplicates** tab if you want to double-check them; **Not a duplicate** puts a row back in Needs review if Tally got it wrong.
- **Sort the list**: use the Sort dropdown next to the filter tabs to order rows by newest/oldest, highest/lowest amount, merchant A–Z, or needs-review-first — handy once a single statement covers several months' worth of rows. Merchant grouping stays in place either way; the sort just controls which group/row comes first.

**Tidying up**
- **Rename a merchant**: click the pencil next to any row's description to turn a cryptic bank description (e.g. "IEPROS") into a friendly nickname (e.g. "Smyths Toy Shop"). It updates every past and future row that already reads as the exact same merchant, and groups rows under the nickname.
- **Recheck matches**: some bank statement formats aren't recognized as cleanly as others, so an occasional row won't group with the rest of that same merchant even after you've renamed one of them. Click **Recheck matches** (next to Sort) to re-run matching on everything still unresolved — it picks up rows that couldn't be grouped before, so a rename or a newly added bill catches up across the whole import in one go, instead of you having to fix each row by hand.
- **Collapse/Expand all**: a large statement with several repeat merchants starts with those groups already collapsed to keep the list manageable — click **Collapse all** / **Expand all** next to Recheck matches to toggle every group in the current tab at once, on top of clicking any single group's arrow to open just that one.
- **Add all as expense**: for a merchant with several rows in the same statement, pick a category once on that group and log them all in one go — this is the fastest way to clear routine repeat spending (coffee, groceries) without touching each row individually.
- **Recognize a recurring bill picked up across months**: if a statement covers a long enough period that a real recurring bill (a subscription, a loan repayment, a standing order) shows up several times — same amount, evenly spaced — Tally offers to treat the whole group as **one recurring bill** instead of several one-off expenses. Tick the checkbox that appears, pick a category, and it creates a single recurring Expense while still logging each real occurrence at its actual historical date (so trend charts and Insights see the real spending history, not just today).
- **Rename an import**: click the pencil next to a statement's name in the list, or inside the review screen, to give it a friendlier label than the uploaded filename.
- Clicking outside the dialog never discards anything — only the visible buttons (Back, Import, Done, the X) close or navigate it.
- **Deleting an import**: any bill or one-off payment you already logged from it stays in your ledger. But every row still sitting in Needs review, Ignored, or flagged Duplicate is permanently deleted along with the import — the delete confirmation tells you exactly how many rows are at risk before you confirm.
- **Undo this import**: a separate, stronger action next to Delete — this removes everything the import produced, including bills and transfers you already logged from it, not just the unresolved rows. The confirmation states exactly how many of each will be removed before you commit, since this can't be undone either.

## 8. Goals

Track savings targets — an emergency fund, a holiday, a deposit. Each goal has a name, target amount, current amount, optional target date, and can be linked to the account the money is actually sitting in. Progress bars show percentage complete and days remaining until the target date.

Use **Split into equal payments** when adding or editing a goal to see what the remaining amount works out to per instalment (2, 4, 12, 20, or a custom number) — it's a quick on-screen calculator only, nothing is saved.

A goal can also be linked from a [Planned expense](#9-planned-expenses), or from any regular bill in the ledger — handy for something cheaper paid annually that you can't afford in one go, like a subscription. Link a mini goal, top it up monthly, and its progress bar shows right on that ledger row (or planned item).

## 9. Planned expenses

For costs you know are coming but aren't required yet — like college fees, a future big purchase, or anything you want to prepare for ahead of time. Tick **"Planned — not required yet"** when adding an expense (or use **"Add planned expense"** from the **Planned** tab) and it sits in its own stand-alone list.

- **Zero impact until activated**: planned items never count towards totals, bills, insights, or the money-flow analysis — they're purely a heads-up list.
- **Link a goal**: optionally link a planned item to a [Goal](#8-goals) to track savings progress towards it right there on the list.
- **Due-soon badge**: once a planned item's expected date is within 30 days, it gets a "consider activating" badge as a gentle reminder.
- **Overview nudge**: when you have planned costs coming up, a quiet banner appears on the Overview dashboard — click it to jump straight to the Planned list. It's informational only and never changes any figures.
- **Activate**: when a planned cost becomes real, click **Activate** to move it into your normal ledger — it will start counting towards totals, bills and insights from that point on.

## 10. Money Map

A visual diagram of your money's journey, with two modes:

- **Actual journey** (default once you've logged transfers in Flow): built from your real dated Transfer records. Three columns — money in (external sources) → your accounts → money out (external destinations) — plus a distinct violet path for direct account-to-account transfers. Filter by **All time / 90 days / 30 days**.
- **Projected**: the original monthly-equivalent view, built from your recurring Expenses/Income linked to accounts — useful before you've logged any real transfers, or to see a "typical month" projection alongside the real history.

Hover any connection to see the exact amount. Account circles are colored blue when net-positive and red when net-negative or a loan.

## 11. Insights

Two sections, side by side:

- **Money flow analysis (AI)**: click **Analyze my money flow** for an on-demand AI review of your accounts, transfers, and goals — flagging idle cash sitting in low-interest accounts, direct-debit **timing risk** (bills landing before income arrives), account **consolidation** opportunities, and concrete **savings** suggestions. This is opt-in per click, not automatic, and only ever uses your own household's data.
- **What could we save?**: a rule-based (non-AI) breakdown of savings opportunities — switching monthly subscriptions to annual billing, rarely-used subscriptions worth cancelling, and a running total of what you're already saving from paused subscriptions. Toggle the horizon between 1 month, 1 year, 3 years, and 5 years.

## 12. Reports

A dedicated reporting tab, built from the household's full real transfer ledger — every transfer in or out, including ad-hoc ones not tied to a tracked bill or income, so nothing real is missed. Pick a report and a period (1/3/6/12 months, or all time), then download any table as CSV:

- **Trends**: monthly spending vs. income bars over the selected period.
- **Category & Vendor**: two ranked tables — spend by category, and spend by vendor/merchant — each with a percentage of the period total. Spend with no linked bill shows up under "Uncategorized" rather than being dropped.
- **Timeline**: every transaction in the period, in date order, with its label, category, direction, and amount — a plain, exportable view of the Flow ledger.
- **Insights**: the same money-flow AI analysis and rule-based savings breakdown from the Insights tab, surfaced here alongside the other reports.

A transfer between two of the household's own accounts never counts as spend or income in any report — only real money moving in or out of the household does, the same rule Flow and Spending already use.

To get a clean PDF, use your browser's Print (Save as PDF) from the Reports tab — it prints just the report, without the navigation or buttons.

## 13. Asking Tally a question

Click the search icon in the top bar to ask a plain-English question about your own household data — e.g. *"where can I save"* or *"what's going out this week"*. Tally answers using only your household's expense and income records; it never sees or uses data from any other household.

## 14. Settings & preferences

Open via the gear icon in the top bar. Set your preferred display currency (EUR, GBP, USD, CAD, AUD, JPY — amounts convert automatically), and manage other household-wide preferences.

## 15. Sharing your household workspace

Click **Share** to send a direct email invite to a partner or family member — enter their email (and optionally a name and role) and Tally adds them to your household right away. If email sending is configured, they'll also get an email with a link to the app; either way, they can sign in with that email as soon as you've added them. There's no shareable link or code — Tally is invite-only, and only an admin can add someone.

Everyone in the same household sees the same shared ledger — accounts, expenses, income, transfers, and goals are all shared, not per-person.

## 16. Admin & users

Available to **Admin** and **Backup Admin** roles via the avatar menu. Manage household member accounts, change roles, and remove accounts that no longer belong. A household must always keep at least one Admin — Tally won't let you remove the last one. Admins can also trigger a full database backup export.

**Recent activity** shows a plain, reverse-chronological log of the actions worth being able to look back on — deletions, backup restores, member removal, and role changes — with who did it and when. It's not a full edit history (routine edits aren't logged), just the destructive and access-affecting ones.

Roles:
- **Admin** — full control: users, workspace sharing, backups.
- **Member** — day-to-day use: log, categorize, and edit household expenses, income, accounts, transfers, and goals.
- **Backup Admin** — a disaster-recovery role for emergency failover if the primary Admin is unavailable. Carries identical permissions to Admin today (same access to users, sharing, and backups) — it's a separate role only so it's clear who the "usual" admin is, not a restricted tier.

## 17. Data export & backup

Click **Export** at any time to download your bills as a CSV spreadsheet or a JSON file — a portable copy to keep or move elsewhere.

For a real, restorable backup, admins use **Admin → Database Snapshots**: it captures every account, goal, bill, income record and transfer in one snapshot, stored directly in the cloud, and **Restore** replaces the household's current data with what's in that snapshot — a genuine point-in-time undo, not just a file download. The restore confirmation shows exactly how old the snapshot is and how many records it holds before you confirm, since it can't be undone once you do.

A snapshot is also taken **automatically every day**, tagged "Automatic" in the list — the most recent 14 are always kept, so there's a real backup even if nobody remembers to click "Create Snapshot." Manual snapshots you create yourself are never automatically deleted.

## 18. Privacy & security

- Passwordless sign-in via one-time 6-digit codes — no passwords stored anywhere.
- Session tokens live in a secure, httpOnly cookie, valid up to 30 days — but an idle tab automatically signs out after 30 minutes of no activity, independent of that 30-day window.
- The screen blurs automatically for privacy after 90 seconds of inactivity (or when the tab loses focus) — select **Reveal Tally** to return. Toggle it manually anytime with the eye icon in the top bar.
- A handful of the most sensitive figures — **Left after bills** on Overview, and every income amount (monthly total and each source) on the Income tab — carry a second, independent blur on top of that. It stays blurred even when the screen-wide privacy blur above is switched off, and each figure only unblurs on its own click (revealing one doesn't reveal the others). Once you click to reveal one, it stays visible for the rest of your session.
- Sensitive account fields (account numbers, online banking logins, security notes) are encrypted at rest and only decrypted on an explicit "reveal" action — or, for statement imports, an on-the-fly admin-only comparison that returns a match/mismatch signal but never the decrypted value itself.
- AI features (the Ask box and Money flow analysis) only ever send your own household's data, and only when you actively trigger them — nothing runs automatically in the background.
- Full details: see the in-app **Privacy** page (footer link) and the **AI transparency** page.

## 19. Frequently asked questions

The same questions are also answerable directly from the **Ask Tally** box (see [§12](#12-asking-tally-a-question)) — click one under "Frequently asked," or type your own.

- **What happens if you delete a statement import?** Any bill or one-off payment you already logged from it stays in your ledger untouched. But every row still sitting in Needs review, Ignored, or flagged as a Duplicate is permanently deleted along with the import — there's no undo, so resolve or double-check those first.
- **What happens if you delete an account?** Expenses, income, transfers and savings goals linked to it are not deleted — they just lose that account link (e.g. "paid from" becomes unset). The one exception is a custom Money Map: any node you placed for that account is removed along with it.
- **What happens if you delete a custom category?** Expenses already using it are not deleted or reassigned — they just show a generic fallback label until you edit them with a different category.
- **What happens if you delete an expense that a statement row was matched to?** That statement row keeps showing "Matched" but with no name — click "Undo" on it to send it back to Needs review, where you can resolve it again.
- **What happens if you remove a household member?** Nothing they created — bills, income, transfers, goals — is deleted. Those records stay exactly as they are, they just lose the "added by" attribution.

---

*Still stuck? Use the in-app Help guide (avatar menu → Help guide) for a quick tour, or reach out to whoever set up your household workspace.*
