export const APP_VERSION = '1.102.1';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.102.1',
    date: '2026-09-08',
    changes: [
      'Made the Tally Agent launcher easier to spot: the mascot now sits on a soft round cream disc with a hairline ring and a slightly stronger shadow, instead of floating semi-transparent against the page.',
    ],
  },
  {
    version: '1.102.0',
    date: '2026-09-08',
    changes: [
      'Added the Tally Agent — a floating assistant that lives in the bottom-right corner of every screen (the fifth tally mark, come alive). Click it for a side panel that answers questions about your money and about using Tally, with starter prompts that adapt to the tab you opened it from. The top-bar "Ask Tally" shortcut now opens this panel from anywhere.',
      'The assistant can log feedback for you: ask to raise a bug, feature or idea (or hit the shortcut in the panel) and it writes straight into your Feedback backlog, tagged with the area you were on.',
      'Repeated "how do I…" questions are now answered instantly from an internal, household-private knowledge base of previously-vetted answers, instead of a fresh model call each time. Questions about your actual figures are never cached — those always use live data.',
      'Moved the quick-hide privacy button to the bottom-left so it no longer overlaps the new assistant launcher.',
    ],
  },
  {
    version: '1.101.0',
    date: '2026-09-08',
    changes: [
      'New "Category trend" report: pick a spending category and see it broken down by shop, week by week (or monthly). Each bar stacks the shops that made up that week\'s spend, and a table underneath shows, per shop, the total, number of shops, average spend per shop, share of the category, and whether it\'s trending up or down. Messy statement labels like "TESCO STORES 3538 DUBLIN" and "SUPERVALU KILLARNEY" are folded into single shop names (Tesco, SuperValu, Lidl, Aldi, Dunnes and more) so, e.g., one €40 Lidl shop and ten SuperValu shops show as two clear lines rather than a dozen.',
    ],
  },
  {
    version: '1.100.0',
    date: '2026-09-08',
    changes: [
      'Improved the Money Map and Reports screenshots on the public website. Both are now shown as complete product windows with subtle browser framing instead of oversized background crops, so their navigation and feature context remain visible.',
    ],
  },
  {
    version: '1.99.0',
    date: '2026-09-08',
    changes: [
      'Refined the public website so it feels less like a stack of oversized presentation panels. The product stories now sit in contained, lighter frames with more space around them, the proof strip is slimmer, and the three core benefits read as individual editorial cards.',
    ],
  },
  {
    version: '1.98.0',
    date: '2026-09-08',
    changes: [
      'Statement import now stops you creating a second copy of a recurring bill you already track. "Add as bill" (and recognising a group as recurring) checks for an existing active bill with a matching name and amount; if it finds one it won\'t add a duplicate — you get a prompt to link the charge to the existing bill instead, or add anyway if it really is separate.',
    ],
  },
  {
    version: '1.97.0',
    date: '2026-09-08',
    changes: [
      'Rebuilt the public About page as a complete Tally website. It now leads with the shared, traceable household ledger, uses real product screens to explain statement reconciliation, Money Map, reporting and opt-in AI, and has a clearer trust story, responsive mobile layout and sign-in path.',
    ],
  },
  {
    version: '1.96.0',
    date: '2026-09-08',
    changes: [
      'Statement import now lets you set who new bills and expenses belong to. A "New bills & expenses assigned to" picker in the review step defaults to "Whole household"; pick a member to tag everything you add from that statement to them — no more editing each one afterwards. (Only shown when the household has more than one member.)',
    ],
  },
  {
    version: '1.95.0',
    date: '2026-09-08',
    changes: [
      'Four more built-in categories so scattered custom ones have a broad home to merge into: Personal Care & Clothing, Travel & Holidays, Banking & Fees, and Pets.',
      'Category auto-suggest: when adding an expense or categorising a statement row, a "Suggest: …" link now appears under the category picker if the name/description clearly points at one (e.g. "Circle K" → Transport & Motoring, "Netflix" → Streaming & Media) — one click applies it. It also matches your own custom category names.',
    ],
  },
  {
    version: '1.94.0',
    date: '2026-09-08',
    changes: [
      'Spending page tidied so the ledger isn\'t buried. The "Monthly spending mix" legend now lists only categories with spend this month instead of a wall of €0.00 rows, and "Spending over time" and "Category spending limits" are collapsed by default (they remember whether you\'ve opened them).',
    ],
  },
  {
    version: '1.93.0',
    date: '2026-09-08',
    changes: [
      'Two new account types — Shares and State Savings — so those aren\'t lumped under "Investment". The Savings section on the Progress tab now groups accounts by vehicle (Savings, Credit Union, Investment, Shares, State Savings) with a subtotal per group before the combined total.',
    ],
  },
  {
    version: '1.92.0',
    date: '2026-09-08',
    changes: [
      'Statement import — a small 🔍 next to each transaction opens a Google search for the raw bank reference in a new tab, so you can work out what a cryptic descriptor actually is before deciding what to rename it to and which category it belongs in.',
    ],
  },
  {
    version: '1.91.0',
    date: '2026-09-08',
    changes: [
      'Category Manager is now one combined list of built-in and custom categories with up/down arrows to reorder them — the order flows through to every category dropdown, the spending filter and the budgets picker, so your most-used ones can sit at the top.',
      'Also fixed: restoring a household backup was dropping any built-in category renames/recolours (and now the order too) — those are preserved again.',
    ],
  },
  {
    version: '1.90.0',
    date: '2026-09-08',
    changes: [
      'You can now rename the built-in categories too, not just recolour and re-icon them — the new name shows in every category dropdown, chart and report. Do it in Settings → Categories; "Reset" puts a built-in back to its default name and look. (The short Spending sub-tab labels stay as they are — those are navigation, not the category name.)',
    ],
  },
  {
    version: '1.89.0',
    date: '2026-09-08',
    changes: [
      'New "How Tally works" in the avatar menu — a one-screen cheat sheet of the handful of rules that make the rest click: the three record types, internal vs external transfers, bill vs one-off, recording a statement movement once, and that Trails / Projects / Progress / Reports are lenses that never change a total.',
    ],
  },
  {
    version: '1.88.0',
    date: '2026-09-08',
    changes: [
      'Three new built-in categories so there\'s less need to invent your own: Transport & Motoring (fuel, tolls, parking, servicing), Health & Medical, and Eating Out & Takeaway.',
      'Category Manager (Settings → Categories) can now merge a custom category into another — moves all its bills across and removes the original in one step. It also flags any custom category whose name looks close to an existing one (with a one-click "merge into it"), and marks categories not used by any bill as "Unused".',
    ],
  },
  {
    version: '1.87.0',
    date: '2026-09-08',
    changes: [
      'Fixed one-off expenses showing up in the Bills renewal schedule. "Add as expense" from a statement import was creating incidental one-offs with the "recurring bill" flag left on, so they appeared in Bills and counted as bills (not one-off spend) on the Overview. They\'re now created as one-off spending, the Bills schedule ignores any `once` expense regardless of the flag, and a one-time cleanup corrected the existing ones.',
    ],
  },
  {
    version: '1.86.0',
    date: '2026-09-08',
    changes: [
      'Home projects are much easier to work with when you have a few: each project is now a collapsible card showing name, status, spent/budget and item count in one line — expand only the one you\'re working on. Added status filter chips (All / Active / Planning / Done) and a project search, plus a "N projects · €X spent of €Y budgeted" summary at the top. Line items were re-laid-out so the figures sit next to the item name (Estimate / Spent / over-under) instead of stretched across the full width.',
    ],
  },
  {
    version: '1.85.0',
    date: '2026-09-08',
    changes: [
      'Fixed the alignment of the intro text and controls in the Home projects, Money trails and Statement activity panels — they were sitting flush to the card edge instead of lining up under the section heading.',
    ],
  },
  {
    version: '1.84.0',
    date: '2026-09-08',
    changes: [
      'New: Home projects (Planned tab) — a mini project manager for a refurb, a patio, anything discrete. Give a project line items with an estimated cost, then link the real spend as it lands on your statements: an item can link to several transactions, and you can set a partial amount to split one big payment across items. Each item shows actual vs estimate (over / left), and the project rolls up to total spent vs budget, with a status and target date. Projects are a lens only — deleting one never touches the linked expenses or transfers. Included in household backups.',
    ],
  },
  {
    version: '1.83.0',
    date: '2026-09-08',
    changes: [
      'Progress tab — added a Savings section: every Savings, Credit Union or Investment account with a balance, shown largest-first with each account\'s share of the total and a combined total. State Savings, shares and similar fit under an Investment-type account. The overview strip now leads with a "Savings balances" total.',
    ],
  },
  {
    version: '1.82.0',
    date: '2026-09-08',
    changes: [
      'The "Goals" tab is now "Progress" — one place for the things you move a needle on slowly. Loans & cards: every loan or credit card with a balance shows a payoff bar (for loans with an original amount set) plus any payments logged toward it from Flow, its rate, term and target payoff date. Savings goals: the same progress cards as before, now with a projected finish date when you\'ve linked a recurring top-up to the goal — e.g. "~€150/mo → on track for Mar 2027 (2 mo ahead of target)". A strip at the top shows total owed, total saved toward goals, and how many goals are on track.',
    ],
  },
  {
    version: '1.81.0',
    date: '2026-09-08',
    changes: [
      'New: Statement activity (Flow tab). A single newest-first list of everything you\'ve added, logged or ignored from a statement — across every import — so if you processed something by mistake and can\'t remember which statement it was on, you can find it here and Undo it in one click. Search by merchant, filter by Bills / Expenses / Transfers / Income / Ignored. Undo sends the row back to "needs review" and removes any bill/transfer/income it created.',
    ],
  },
  {
    version: '1.80.0',
    date: '2026-09-07',
    changes: [
      'Fixed "Some data failed to load…" when resolving a whole merchant group at once (e.g. "Log all as transfer" / "Add all as expense" on a big Revolut group). Each row was triggering a full reload of every section in parallel, so a large group fired dozens of simultaneous requests and overwhelmed the database connection. Group actions now resolve their rows a few at a time and refresh the app once, at the end.',
    ],
  },
  {
    version: '1.79.0',
    date: '2026-09-07',
    changes: [
      'Statement import — a money-out row now has "Add as bill" alongside "Add as expense". It creates a proper recurring bill from the charge (pick a category, a cycle — monthly/weekly/quarterly/annual — and confirm the typical amount), marks this charge as its latest payment, and sets the next renewal date one cycle on. Use it for subscriptions (ChatGPT, Netflix, …) instead of "Add as expense", which only ever makes a one-off. The merchant is also learned, so next month\'s statement auto-matches it.',
    ],
  },
  {
    version: '1.78.0',
    date: '2026-09-07',
    changes: [
      'The Flow transfers list can now be filtered and sorted: a search box (account, payee or note), an account picker, quick chips for Money in / Money out / Between accounts / Card & loan payments, and a sort by date or amount. The header count shows "N of M" while a filter is on.',
    ],
  },
  {
    version: '1.77.0',
    date: '2026-09-07',
    changes: [
      'A transfer from an ordinary account into a credit-card or loan account is now labelled "Card payment" / "Loan payment" — in the Flow ledger, in a money trail\'s hop list, and on the Money Map (hover the internal edge). It\'s still an ordinary transfer under the hood; the label just makes clear it\'s paying down a balance, not moving spare cash around. (Reminder: pay the card by logging a transfer From your current account → To the credit-card account — never as an expense, or the spend counts twice.)',
    ],
  },
  {
    version: '1.76.0',
    date: '2026-09-07',
    changes: [
      'New: Money trails (Flow tab). Chain a set of transfers into one named path — e.g. salary into BOI, swept to PTSB, moved back, then used to pay the credit card — and see it drawn as a route with a "€X sat in PTSB for 5 days" breakdown at each stop. Create a trail, then add the transfers that make it up (or remove them); deleting a trail just un-groups the transfers, it never deletes them. Trails are a lens only — they don\'t change any totals.',
      'Money trails are included in household backups (snapshot schema v3) and restored with their membership intact.',
    ],
  },
  {
    version: '1.75.0',
    date: '2026-09-07',
    changes: [
      'Statement import — "Log all as transfer" on a merchant group (e.g. a run of Revolut top-ups) now asks which account the money went to / came from before logging, instead of silently defaulting every row to an external payee. Pick one of your own accounts and the whole group is recorded as internal transfers.',
    ],
  },
  {
    version: '1.74.0',
    date: '2026-09-07',
    changes: [
      'Statement import — a money-in row now has "Add as income", which creates a brand-new income record straight from the row (name, frequency and typical amount, with the deposit account set) and links it, the same way "Add as expense" works for a payment out. Previously you could only link a credit to an income that already existed, so the very first import was a dead end if you hadn\'t set your income up yet. "Link to income" now only shows when you already have at least one.',
      '"Undo" on such a row — and "Undo this import" as a whole — removes an income it created, like it already does for bills and transfers.',
    ],
  },
  {
    version: '1.73.0',
    date: '2026-09-07',
    changes: [
      'Statement import — "Log as transfer" now lets you say which of your other accounts the money went to (for a payment out) or came from (for a credit), e.g. a BOI payment landing in your PTSB or Credit Union account. Picking one of your own accounts on both sides records it as an internal transfer, so it no longer counts as spend in Reports. Leave it on "External" for money genuinely leaving/entering the household, as before.',
      'A matched/logged transfer row now shows the account route (e.g. "BOI → PTSB") instead of just a label.',
      '"Undo" on a matched or ignored statement row now fully reverses it: any bill or transfer that row created when you resolved it is removed too (and a linked income is un-marked as received), instead of being left behind as an orphan.',
      'When you\'ve resolved every row, the review list now spells out that matched / logged / ignored rows aren\'t gone — they\'re under the tabs above, each with an Undo — rather than just saying "Nothing here."',
    ],
  },
  {
    version: '1.72.0',
    date: '2026-09-07',
    changes: [
      'New Category Manager (Settings → Categories). Add your own categories with a proper colour and icon picker instead of the name-only inline "+ Create" in the dropdown, and — new — edit existing ones: rename, recolour, change icon.',
      'Deleting a custom category that bills are still using now makes you pick another category to move those bills to first, so nothing is left showing a broken/blank category.',
      'You can also recolour and re-icon the built-in categories (their names stay fixed); a "Reset" button puts any built-in back to its default look. Overrides are per household.',
    ],
  },
  {
    version: '1.71.0',
    date: '2026-09-07',
    changes: [
      'Tightened the wording of the public Technical Overview (and the matching docs/technical-overview.md): the passwordless sign-in section no longer publishes the exact code-expiry window and wrong-guess limit — those brute-force parameters are now described qualitatively ("short expiry", "low per-IP rate limit") while the actual protections are unchanged. Also corrected the local-setup instructions to use Prisma Migrate rather than db:push.',
    ],
  },
  {
    version: '1.70.0',
    date: '2026-09-07',
    changes: [
      '"Bug log" is now "Feedback" (avatar menu) — the same in-app log now also captures ideas and feature requests, not just bugs. Each entry has a type (Idea / Feature / Bug), filter tabs to browse by type, and the Markdown export groups by type.',
    ],
  },
  {
    version: '1.69.0',
    date: '2026-09-07',
    changes: [
      'The User Guide is now a real multi-page site (/guide/topic-name) instead of one long scroll — a sidebar with search stays on screen no matter how far down the page you are, so you never lose your place or the navigation. Each topic page has Previous/Next links to read straight through.',
      'Added a new About page introducing Tally — a quick pitch with screenshots for anyone you\'d like to invite, linked from the sign-in screen and the guide.',
    ],
  },
  {
    version: '1.68.0',
    date: '2026-09-07',
    changes: [
      'The public User Guide (/guide) is now the real, full guide — search, a jump-to index, quick links for the most common tasks, and real screenshots inline, instead of the shorter summary it showed before.',
      'The in-app Help guide and the "Ask Tally" assistant\'s how-to answers now draw from that same complete content, so all three stay consistent with each other and with what the app actually does.',
    ],
  },
  {
    version: '1.67.0',
    date: '2026-09-07',
    changes: [
      'Fixed the "Ask Tally" shortcut in the top bar — clicking it from any page other than Overview silently did nothing, since the Ask box only exists there. It now switches to Overview and focuses the Ask box, from anywhere in the app, as intended.',
    ],
  },
  {
    version: '1.66.0',
    date: '2026-09-07',
    changes: [
      'Fixed a serious performance problem in the bills ledger: a household with a few thousand imported statement transactions could make the Spending tab take minutes to load, or never finish. It now shows the first 150 records instantly with a "Show more" button for the rest — search and filters still work across everything, not just what\'s currently shown.',
    ],
  },
  {
    version: '1.65.0',
    date: '2026-09-07',
    changes: [
      'Fixed a race where two quick edits to the same bill, income or account in close succession (e.g. a slow connection racing a fast retry) could let an old failed request silently undo a newer, already-successful change — only the most recent action for a given record can now affect it once it resolves.',
      'If one part of your data fails to load (e.g. a network hiccup on transfers), the rest of the app now loads normally instead of everything silently stopping — you\'ll see a clear message naming what failed to load.',
      'Statement imports and Reports now show a clear "failed to load, retry" message instead of silently appearing empty when their data can\'t be fetched.',
      'The bills ledger now shows a loading indicator on first load instead of a moment of "your ledger is clean" before your data actually arrives.',
    ],
  },
  {
    version: '1.64.0',
    date: '2026-09-06',
    changes: [
      'The Add/Edit expense form now shows just the essentials by default — amount, name, cycle, category, due date, payment method — with member assignment, contract end date, reimbursement, vendor contact and notes tucked behind an "Add optional details" toggle. Editing a bill that already has any of that set expands it automatically, so nothing already recorded is hidden.',
    ],
  },
  {
    version: '1.63.0',
    date: '2026-09-06',
    changes: [
      'Every dialog (Add/Edit forms, Settings, Help guide, Statement import, and more) now behaves like a proper dialog for keyboard and screen-reader use: opening one moves focus inside it, Tab stays contained within it instead of leaking out to the page behind, Escape closes it, and focus returns to whatever you clicked to open it.',
      'Fixed several unlabelled form fields on the sign-in screen and the expense form so screen readers announce them correctly and clicking a field\'s label focuses it.',
    ],
  },
  {
    version: '1.62.0',
    date: '2026-09-06',
    changes: [
      'A failed save now always looks different from a successful one: any bill, income, account, transfer or goal change that doesn\'t actually reach the database now shows a clear error message and reverses itself, instead of silently looking like it worked.',
      'The Add/Edit forms for bills, income, accounts, goals and transfers now show a spinner while saving and stay open with what you typed if the save fails, so nothing you entered is lost.',
    ],
  },
  {
    version: '1.61.1',
    date: '2026-09-06',
    changes: [
      'The greeting and "Ask Tally" box now only show on Overview, so Reports and other task pages start right at their own content — the Ask Tally shortcut in the top bar still works from anywhere.',
      'The navigation now visually separates your core sections from the money-journey group (Flow, Goals, Planned, Money Map).',
      'The expense form now uses a single column on narrow phone screens instead of cramming two, so field labels and values no longer get clipped.',
      'Renamed "This month spent" to "This month\'s committed spend" and added a short caption, since the figure is your recurring-bill rate for the month — not a running record of what\'s actually been paid.',
      'Added a subtle fade to the mobile home-screen stat cards to make it clearer there are more to swipe to.',
    ],
  },
  {
    version: '1.61.0',
    date: '2026-09-06',
    changes: [
      'Database Snapshots now backs up and restores your entire household, not just accounts/goals/bills/income/transfers — statement imports and their matched rows, custom categories, budgets, and your custom Money Map are all included now too.',
      'Fixed a real data-loss bug: restoring a snapshot used to silently drop a bill\'s reimbursement-claim and original-currency fields, and it could silently wipe your custom Money Map as an unintended side effect of restoring accounts. Both are fixed — restoring now brings everything back exactly as it was.',
      'Fixed the encryption-key-rotation maintenance script so a real rotation actually re-encrypts everything under the new key (including IBAN/BIC, which it was missing entirely) instead of silently skipping data that looked "already done" but wasn\'t — this only affects the admin key-rotation tooling, not everyday use.',
    ],
  },
  {
    version: '1.60.3',
    date: '2026-09-06',
    changes: [
      'Closed two small remaining gaps a second re-review of the sign-in fix caught: the guess-limit check now also re-confirms the code hasn\'t expired at the exact moment it\'s accepted or rejected, not just when first looked up; and a used-up code now gets the identical response whether the last guess happened to be right or wrong, so the wording itself can\'t hint which one it was.',
    ],
  },
  {
    version: '1.60.2',
    date: '2026-09-06',
    changes: [
      'Closed a remaining sign-in race a follow-up security re-review caught: a correct code arriving right as the 5-guess limit was reached could previously still succeed. The guess-limit check now happens atomically as part of accepting or rejecting each attempt, not as a separate step afterward.',
      'Sign-in code hashing no longer falls back to a secret built into the app itself when unconfigured — it now refuses to issue codes instead, since a secret readable in the source provides no real protection.',
      'Stopped logging the raw email-delivery error on a failed send, since a provider error could echo back the outbound message contents.',
    ],
  },
  {
    version: '1.60.1',
    date: '2026-09-06',
    changes: [
      'Hardened sign-in codes following a security review: codes are now generated with a cryptographic random source (not a weaker general-purpose one), are never written to server logs, and are stored only as a keyed digest rather than in plain text.',
      'Fixed a race condition where many simultaneous wrong-code guesses could bypass the 5-attempt limit; a correct code can also no longer be used twice by two requests arriving at the same moment.',
    ],
  },
  {
    version: '1.60.0',
    date: '2026-09-06',
    changes: [
      'Statement import can now link money-in rows to your Income records too — a credit shows "Link to income" instead of the bill-side buttons, logging the real amount and date so a fluctuating salary reconciles properly instead of only ever being logged as an unlinked transfer.',
      'Marking income "received" now asks for the actual amount and date, instead of always assuming the usual figure landed today — every monthly income total (Overview, Insights) uses the real amount for a month it exists, the usual estimate otherwise.',
      'Undoing a "received" mark now also removes the real entry it logged for that month, so fixing a wrong amount by unmarking and re-confirming no longer double-counts it.',
    ],
  },
  {
    version: '1.59.1',
    date: '2026-09-06',
    changes: [
      'Fixed the "Matched to..." account banner on statement import cramming into a narrow column and wrapping word-by-word — it now reads as a normal full-width sentence above the account picker.',
    ],
  },
  {
    version: '1.59.0',
    date: '2026-09-06',
    changes: [
      'Statement import now also reads the BIC/SWIFT code off a PDF or photo statement, alongside the account number, sort code, and IBAN it already extracted.',
      'Importing a statement now cross-checks those details against every account you\'ve already saved, not just the one you pick — a clear single match is selected for you automatically, or you\'re shown a short list to choose from if it could be more than one.',
      'Adding a new account straight from a statement import now saves all four extracted details (account number, sort code, IBAN, BIC), not just the first two.',
    ],
  },
  {
    version: '1.58.0',
    date: '2026-09-06',
    changes: [
      'Added a new Reports tab: Trends, Category & Vendor, Timeline, and Insights, each over a period you choose (1/3/6/12 months, or all time), with CSV export and browser-print-to-PDF on every report.',
      'Reports are built from your household\'s complete real transfer history — including ad-hoc transfers not tied to a tracked bill or income — so nothing real is left out of the totals.',
    ],
  },
  {
    version: '1.57.0',
    date: '2026-09-06',
    changes: [
      'One-off costs (a repair, a doctor visit, a large purchase) now count toward "This month spent", Budgets, and category totals in the calendar month they\'re actually dated — they used to be excluded from all of those figures entirely. A recurring bill\'s steady-state monthly rate is unaffected either way.',
    ],
  },
  {
    version: '1.56.0',
    date: '2026-09-06',
    changes: [
      'Added reimbursement/claim tracking to expenses — e.g. a health insurance claim on a doctor visit. The full amount counts as spend until you mark what was actually received; after that, only the net cost counts toward Spending, Budgets, and category totals.',
    ],
  },
  {
    version: '1.55.0',
    date: '2026-09-06',
    changes: [
      'The "import a statement" prompt is now always on the home page — even before you\'ve added anything else — and opens the import screen directly in one click, instead of only appearing after 30+ days and requiring a trip to Flow first.',
    ],
  },
  {
    version: '1.54.0',
    date: '2026-09-05',
    changes: [
      'Behind the scenes: added an automated test suite covering the billing-date and statement-matching logic — no visible change to the app itself.',
    ],
  },
  {
    version: '1.53.0',
    date: '2026-09-05',
    changes: [
      'Added "Undo this import" for statement imports — a stronger reset than Delete that removes everything the import produced, including bills and transfers you already logged from it, in one action.',
    ],
  },
  {
    version: '1.52.0',
    date: '2026-09-05',
    changes: [
      'Logging a one-off expense or a standalone transfer now shows a dismissible heads-up if it looks like something already on record (same account, same amount, within a couple of days) — never blocks the entry, just flags it in case it\'s a genuine duplicate.',
    ],
  },
  {
    version: '1.51.0',
    date: '2026-09-05',
    changes: [
      'Added "Recent activity" under Admin — a plain log of deletions, backup restores, member removal, and role changes, with who did it and when. Not a full edit history, just the actions worth being able to look back on.',
    ],
  },
  {
    version: '1.50.0',
    date: '2026-09-05',
    changes: [
      'If your session ever becomes invalid on another device or after being removed from a household, Tally now signs you out cleanly the next time it checks, instead of leaving the app looking signed-in until something confusing happens.',
      'Clarified in the help guide and docs: "Backup Admin" has identical permissions to "Admin" today.',
    ],
  },
  {
    version: '1.49.0',
    date: '2026-09-05',
    changes: [
      'Importing a PDF or photo statement now shows whether the rows Tally logged actually add up to the statement\'s own opening/closing balance — a quick check that nothing was missed, right on the review screen.',
    ],
  },
  {
    version: '1.48.0',
    date: '2026-09-05',
    changes: [
      'Foreign-currency figures across Overview, Spending, and Budgets now use a genuinely live, self-refreshing exchange rate instead of a fixed number that never updated — so converted totals stay accurate as real rates move.',
    ],
  },
  {
    version: '1.47.0',
    date: '2026-09-05',
    changes: [
      'Scanning a foreign-currency bill and using the live conversion now keeps the original amount, currency, and the exact rate and date used — shown as a small "Originally..." note wherever the bill appears, so you can always see what was actually paid.',
    ],
  },
  {
    version: '1.46.0',
    date: '2026-09-05',
    changes: [
      'A snapshot of your household\'s data (accounts, goals, bills, income, transfers) is now taken automatically every day, tagged "Automatic" in Admin → Database Snapshots — a real backup that no longer depends on someone remembering to click "Create Snapshot." The most recent 14 automatic snapshots are kept; snapshots you create manually are never auto-deleted.',
    ],
  },
  {
    version: '1.45.0',
    date: '2026-09-05',
    changes: [
      'Behind the scenes: schema changes now go through proper tracked migrations instead of a live schema diff, so every database change has real history and a safer, more predictable deploy path. No visible change to the app itself.',
    ],
  },
  {
    version: '1.44.0',
    date: '2026-09-05',
    changes: [
      'Added Budgets: set a monthly spending limit on any category from Spending → All spending, and see a progress bar against your current spend for that category — turns amber near the limit, red once you\'re over.',
      'Budgets are deliberately simple: one limit per category, no rollover of what you didn\'t spend, no history over time, and nothing forces you to set one for every category.',
    ],
  },
  {
    version: '1.43.0',
    date: '2026-09-05',
    changes: [
      'Adding a household member now works the same way whether you use Admin → Add household user or Settings → Share — both send a real invite email (when configured) and safely refuse to reassign an email that already belongs to a different household.',
      'Corrected user guide, in-app help/Ask Tally, technical overview and README copy that described a "Create Account" option and shareable invite links/codes — Tally has always been invite-only by email, with no self-service sign-up.',
    ],
  },
  {
    version: '1.42.0',
    date: '2026-09-05',
    changes: [
      'Accounts can now have a current balance (and an "as of" date) — entered manually since there\'s no live bank sync, but shown on the account card so you can see it at a glance.',
      'Added a "Net worth" figure to Overview once any account has a balance set — assets minus credit cards and loans, blurred by default the same way "Left after bills" is.',
    ],
  },
  {
    version: '1.41.0',
    date: '2026-09-05',
    changes: [
      'Fixed a real data-integrity bug: "Restore from JSON" and "Reset all expense records" in Settings looked like they worked but never actually reached the database — both have been removed.',
      'Admin → Database Snapshots now covers your whole household (accounts, goals, bills, income and transfers, not just bills) with a real, verified restore — the confirmation now shows the snapshot\'s age and exact record count before you commit.',
      'Settings\' Export/Import is now Export-only (CSV/JSON download of your bills) — for a full, restorable backup, use Admin → Database Snapshots.',
    ],
  },
  {
    version: '1.40.1',
    date: '2026-09-05',
    changes: [
      'Statement review: repeat-merchant groups now start collapsed automatically once a statement has several of them, so a large import doesn\'t dump dozens of rows on screen at once. A "Collapse all" / "Expand all" toggle next to Recheck matches lets you switch the whole list either way any time.',
    ],
  },
  {
    version: '1.40.0',
    date: '2026-09-05',
    changes: [
      'Fixed a bank statement format ("POS13MAY", day+month glued to POS with no space) that was silently breaking merchant grouping — renaming one occurrence of a repeat merchant like this didn\'t apply to the others, since each was being treated as a different merchant.',
      'Added a "Recheck matches" button to statement review — re-runs matching on everything still unresolved, so a rename or a newly added bill catches up across rows that couldn\'t be recognized as the same merchant when the statement was first imported, instead of having to fix each one by hand.',
    ],
  },
  {
    version: '1.39.0',
    date: '2026-09-05',
    changes: [
      'Statement review can now be sorted (newest/oldest, highest/lowest amount, merchant A–Z, or needs-review-first) — handy once one statement covers several months.',
      'A group of statement rows that share an identical amount and are evenly spaced (a subscription, a loan repayment, a standing order picked up more than once in a long statement) can now be resolved as ONE recurring bill instead of separate one-off expenses — each real occurrence still gets logged at its actual historical date, so trend charts and Insights see the real spending history.',
      'Fixed a bug in the recurring-bill renewal date calculation that could silently drift a bill\'s next due date by a day or more (in this deployment\'s timezone) every time it rolled over unattended across a renewal — affects Bills, Upcoming Renewals, and the 30/14/7-day contract reminder emails for any bill that had actually rolled over at least once. Newly created or edited bills are unaffected; found and fixed while building the recurring-bill detection above. See the technical review doc for details.',
    ],
  },
  {
    version: '1.38.2',
    date: '2026-09-05',
    changes: [
      'Deleting a statement import now warns you with real counts before confirming — how many bills/payments you\'ve already logged (which stay) versus how many unresolved rows would be permanently lost.',
      'Added a "Frequently asked" section to Ask Tally and the in-app Help guide, covering what actually happens when you delete a statement import, an account, a category, an expense, or remove a household member.',
    ],
  },
  {
    version: '1.38.1',
    date: '2026-09-05',
    changes: [
      'You can now add a note when logging a statement row as an expense or transfer — useful for one-offs worth remembering the context of (e.g. a car service), without needing to log it manually beforehand. Look for the note field next to the category picker under "Add as expense" / "Log as transfer" in statement review.',
    ],
  },
  {
    version: '1.38.0',
    date: '2026-09-05',
    changes: [
      'Statement import now auto-detects likely duplicates — a row matching one already imported (same date, amount, direction and merchant) is flagged and skipped from review automatically instead of being logged twice, with a one-click "Not a duplicate" undo if it gets it wrong. See the new "Duplicates" tab when reviewing an import.',
      'Added an in-app reminder on Overview nudging you to import your latest bank/card statement once it\'s been 30+ days since the last one (or none has ever been imported) — dismiss to snooze it for two weeks.',
    ],
  },
  {
    version: '1.37.0',
    date: '2026-09-04',
    changes: [
      'Added a second, per-figure privacy blur for the most sensitive amounts — "Left after bills" on Overview and every income figure (monthly total plus each salary/other income row) — that stays blurred even when the main screen privacy blur is off. Each one only unblurs when you click it, independently of the others, and stays revealed for the rest of your session.',
    ],
  },
  {
    version: '1.36.0',
    date: '2026-09-04',
    changes: [
      'Overview now leads with a bigger spending-by-category donut, plus a new "Bills vs one-off" split showing how much of this month\'s spend is recurring bills/contracts versus incidental one-off purchases.',
    ],
  },
  {
    version: '1.35.1',
    date: '2026-09-04',
    changes: [
      'Fixed the "Screen hidden for privacy" card appearing lower than expected on load — it now stays centered on screen regardless of page length or scroll position, instead of centering within the full (sometimes very tall) page content.',
    ],
  },
  {
    version: '1.35.0',
    date: '2026-09-04',
    changes: [
      'Security self-review: audited every API route for cross-household data access, reviewed encryption/session handling, and ran a dependency vulnerability scan — findings written up in the public technical review doc.',
      'Fixed a gap where database backups (Admin → Backups) had no household boundary — an admin could list or restore another household\'s backup. Backups are now scoped to your own household like every other record.',
      'Patched two dependency vulnerabilities (Prisma\'s config merging, PostCSS) via safe, non-breaking version pins — no functional changes.',
    ],
  },
  {
    version: '1.34.0',
    date: '2026-09-04',
    changes: [
      'Made most secondary panels collapsible across the app (ledgers, presets, paused items, insight results, admin backups) — click a section header to expand/collapse it, and your preference is remembered next time. Cuts down on scrolling and clutter while keeping every list a click away.',
      'Bug log: "Area / page" is now a dropdown of actual app sections (Overview, Spending, Bills, Income, Accounts, Insights, Flow, Goals, Planned, Money Map, Admin, Other) instead of free text, so reports are easier to scan and act on.',
    ],
  },
  {
    version: '1.33.0',
    date: '2026-09-04',
    changes: [
      'Added real spending & income history: marking a bill paid or income received now logs a dated record, so trends build up over time instead of only showing a current snapshot.',
      'Added Spending, Income and Bills trend charts with switchable Bar/Line/Pie views and a 1/3/6/12-month/All period filter.',
      'Added a "Recurring bill / contract" toggle when logging an expense — turn it off for one-off spending like a coffee so it only counts in Spending, not Bills. Bills now only shows genuine recurring bills/contracts, with vendor, contract end date and email surfaced directly on each row.',
      'Added a "mark received" control to Income, mirroring the existing "mark paid" control on expenses.',
    ],
  },
  {
    version: '1.32.0',
    date: '2026-09-04',
    changes: [
      'Added a Bug log (Menu → Bug log): jot down issues as you spot them — title, area, severity and steps to reproduce — then export the whole list to a Markdown file with one click to hand to an AI coding tool or paste into an issue tracker.',
    ],
  },
  {
    version: '1.31.3',
    date: '2026-09-04',
    changes: [
      'Fixed expense and income "Assigned Household Member" dropdowns silently ignoring the "Household (Shared)" option — picking Shared now actually saves as unassigned instead of falling back to whoever was signed in, and editing an existing expense/income now correctly saves a change of assignment (it was previously not persisted at all).',
    ],
  },
  {
    version: '1.31.2',
    date: '2026-09-04',
    changes: [
      'Fixed the privacy screen activating too eagerly — momentary focus loss (opening a dropdown, date picker, or browser autofill popup) no longer triggers it; the screen now only hides content if focus genuinely leaves the app for a moment.',
    ],
  },
  {
    version: '1.31.1',
    date: '2026-09-04',
    changes: [
      'Polished the privacy screen with stronger visual obscuring, reassuring Tally branding, and a clear keyboard-focused Reveal Tally button instead of an ambiguous click-anywhere prompt.',
    ],
  },
  {
    version: '1.31.0',
    date: '2026-09-04',
    changes: [
      'Simplified Spending so categories are no longer repeated across three rows: the spending mix is now a compact informational legend, while category, status, search and sort controls live together in one ledger toolbar.',
      'Clarified every ledger row by separating Paid/Unpaid from the labelled Active/Paused switch, keeping Edit visible, and moving occasional actions such as amount updates, vendor contact, duplicate and delete into a clearly labelled More menu.',
      'Improved the responsive ledger toolbar and spending legend so filters remain compact and readable on tablets and phones.',
    ],
  },
  {
    version: '1.30.1',
    date: '2026-09-04',
    changes: [
      'Redesigned the expanded Ask Tally shortcuts as one structured panel, separating household insights from help topics and replacing the loose rows of equal-weight buttons with calmer, easier-to-scan actions.',
      'Simplified the search field’s focus treatment and refined the assistant shortcuts for tablet and phone layouts.',
    ],
  },
  {
    version: '1.30.0',
    date: '2026-09-04',
    changes: [
      'Refreshed Tally’s full visual system with a warmer household-friendly palette, stronger type hierarchy, softer cards, clearer buttons and inputs, calmer filters, improved focus states, and more comfortable spacing throughout.',
      'Rebuilt the desktop header into two deliberate levels so household actions and page navigation no longer compete or wrap unpredictably, while keeping every existing destination directly accessible.',
      'Polished the responsive experience with larger touch targets, a cleaner mobile drawer, compact small-screen actions, and more consistent card and modal sizing.',
    ],
  },
  {
    version: '1.29.0',
    date: '2026-09-04',
    changes: [
      'Fixed accounts, transfers, goals, income, invites, contact-vendor and scan-receipt forms (and Money Map object/connection forms) closing and discarding whatever you had typed if you clicked the blurred background behind the popup — those now only close via the X or Cancel button, matching how the expense form already worked.',
    ],
  },
  {
    version: '1.28.0',
    date: '2026-09-04',
    changes: [
      'Added encrypted IBAN and BIC/SWIFT fields to accounts, alongside account number and routing/sort code.',
      'Fixed account and expense rows collapsing unexpectedly when finishing a text-selection drag (e.g. selecting an account number to copy) inside an expanded row.',
    ],
  },
  {
    version: '1.27.0',
    date: '2026-09-04',
    changes: [
      'Added "My map" — a freeform, editable canvas inside Money Map alongside the existing auto-generated view. Add any object (an account or a custom item like "Car Loan — Credit Union"), connect objects with a directional arrow, and drag them around to sketch out exactly how your money moves.',
    ],
  },
  {
    version: '1.26.0',
    date: '2026-09-04',
    changes: [
      'Fixed a bug across every modal in the app (accounts, expenses, goals, transfers, settings, sharing, and more) where selecting text inside the modal and releasing the mouse outside its edge would unexpectedly close it — clicking outside now only closes a modal when the click genuinely started and ended on the backdrop.',
    ],
  },
  {
    version: '1.25.0',
    date: '2026-09-04',
    changes: [
      'Security hardening from an external technical review: the contract-reminder cron can no longer send duplicate emails on a re-trigger, encrypted account fields now carry a key-version marker so a future key rotation is safely resumable, statement-derived text is sanitised at import time and AI prompts now explicitly treat statement/household data as untrusted input rather than instructions, sign-in requests are throttled per source, and there\'s a new "Sign out everywhere" option in Settings → Security to end every session at once.',
    ],
  },
  {
    version: '1.24.0',
    date: '2026-09-04',
    changes: [
      'Added an in-app Technical Overview page (/technical-overview) covering architecture, data model, API reference, and security model — linked from the User Guide and the legal-page footer nav.',
    ],
  },
  {
    version: '1.23.0',
    date: '2026-09-04',
    changes: [
      'Added a full technical overview doc (architecture, data model, API reference, security model, and complete feature inventory), linked publicly from the README.',
    ],
  },
  {
    version: '1.22.1',
    date: '2026-09-04',
    changes: [
      'Rewrote the User Guide intro with a "Why Tally?" section spelling out what makes it different, and broke the dense Statement imports walkthrough into shorter, grouped steps (Uploading, Reviewing matches, Tidying up) for easier reading.',
    ],
  },
  {
    version: '1.22.0',
    date: '2026-09-04',
    changes: [
      'You can now create your own categories (e.g. "Tolls") right from the category picker on any expense or statement row — pick "+ Create new category…", give it a name, and it\'s instantly available everywhere with its own colour, and shared across the household.',
      'Statement review: "Confirm match" no longer looks like the default/safe option — it\'s now equal-weight with the correction button and shows a reassurance note ("Just a guess — pick whichever button below is actually right") whenever the suggested match isn\'t highly confident, so a wrong guess is just as easy to fix as to confirm.',
      'Imported statements can now be renamed — click the pencil next to a statement\'s name in the Statements list, or from inside the review screen.',
      'Made a few icon-only buttons in the top nav clearer: "Ask Tally", "Scan" and the privacy blur toggle now show text labels, and the blur toggle now visibly highlights when it\'s active.',
    ],
  },
  {
    version: '1.21.0',
    date: '2026-09-04',
    changes: [
      'Added genuine auto sign-out after 30 minutes of inactivity — separate from the existing 30-day "stay signed in" session, which is unaffected. You\'ll see a note explaining why on your next sign-in.',
      'The privacy screen-blur was triggering after just 20 seconds idle — pushed out to 90 seconds so it no longer interrupts normal use.',
      'Flow, Goals, Planned and Money Map were previously tucked inside a "Money Journey" dropdown — they\'re now directly in the main nav bar alongside everything else.',
      'Added a full in-app User Guide page, linked from both the Help guide and the "Ask Tally" box — it\'s built from the same content that powers Ask Tally\'s how-to answers, so it\'s always in sync.',
      'Statement import now lets you add a brand new account right from the import screen — for CSV, PDF or photo statements, even if you have no accounts saved yet. When Tally reads an account number/sort code off a PDF or photo, it\'s carried straight over to the new account, encrypted.',
    ],
  },
  {
    version: '1.20.1',
    date: '2026-09-04',
    changes: [
      'Fixed "Add as expense" and other statement-import actions not showing up in the ledger or Overview until a manual page refresh — resolving a statement row now updates your live data straight away.',
      'Added "Add all as expense" for a merchant group in statement review — pick a category once and it\'s applied to every unmatched row from that merchant in the statement, instead of doing it one row at a time.',
    ],
  },
  {
    version: '1.20.0',
    date: '2026-09-04',
    changes: [
      'Statement import rows can now be given a merchant nickname — click the pencil next to any cryptic bank description (e.g. "IEPROS") and rename it to something recognisable (e.g. "Smyths Toy Shop"). It updates that row plus every past and future row for the same merchant, and groups rows under the nickname too.',
      'Savings goals can now be linked to any bill, not just Planned ones — handy for something cheaper paid annually that you can\'t afford in one go: link a goal, top it up monthly, and watch its progress right on that ledger row.',
    ],
  },
  {
    version: '1.19.0',
    date: '2026-09-03',
    changes: [
      'Statement import is smarter about what it decides on its own: a row only gets auto-marked "Matched" when it fits a merchant you\'ve personally confirmed before — every other suggested match (however confident) now waits in "Needs review" for you to hit "Confirm match" first.',
      'Possible matches against an existing transfer (not just a bill) now show up with their own "Confirm match" button, instead of only bills getting that treatment.',
      'Added "Add as expense" for statement rows that aren\'t linked to a bill — pick a spending category and it\'s logged as a proper one-off expense (not just an anonymous transfer), so it shows up correctly in Spending and category breakdowns.',
      'Tally remembers the category you picked for a merchant and suggests it automatically next time that description shows up on a statement.',
    ],
  },
  {
    version: '1.18.0',
    date: '2026-09-03',
    changes: [
      'PDF/photo statement imports now also read the account number, sort code, IBAN, account holder, statement period and opening/closing balance printed on the statement.',
      'When you pick which account a statement is for, Tally checks the extracted account number and sort code against what\'s saved for that account and flags a mismatch — handy for catching "wrong account" mix-ups before you import.',
      'If an account has no account number or sort code saved yet, you can save the one read off the statement with one click.',
    ],
  },
  {
    version: '1.17.2',
    date: '2026-09-03',
    changes: [
      'Clicking outside the statement import dialog no longer does anything — only the visible Close, Back and Import buttons can close or navigate it, so an accidental click can\'t lose your in-progress import.',
    ],
  },
  {
    version: '1.17.1',
    date: '2026-09-03',
    changes: [
      'Fixed the statement import dialog discarding everything it just read from a PDF/photo the instant you clicked outside it — it now asks first if you have unimported transactions on screen.',
    ],
  },
  {
    version: '1.17.0',
    date: '2026-09-03',
    changes: [
      'Add goal now lets you split the remaining amount into equal payments (2, 4, 12, 20, or any custom number) to quickly see how much to save per instalment.',
    ],
  },
  {
    version: '1.16.0',
    date: '2026-09-03',
    changes: [
      'Statement uploads now accept PDF exports and photos/screenshots as well as CSV — Tally reads the transactions straight off the page using AI, so there\'s no need to convert a bank PDF to CSV first.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-09-03',
    changes: [
      'Added a new "Insurance, Motor Tax & NCT" category with its own tab, so car/life/health insurance, motor tax and NCT renewals no longer have to be shoehorned into Housing or Big Purchases.',
      'Added quick-add presets for Car Insurance, Motor Tax, NCT Test Fee, Life Insurance and Health Insurance.',
    ],
  },
  {
    version: '1.14.2',
    date: '2026-09-03',
    changes: [
      'Actually fixed the "Money Journey" dropdown jump this time — its open animation and its centering were both fighting over the same CSS transform, snapping it to a new spot right after it opened.',
    ],
  },
  {
    version: '1.14.1',
    date: '2026-09-03',
    changes: [
      'Fixed the "Money Journey" nav dropdown shifting position instead of staying put under the button.',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-09-03',
    changes: [
      'Statement import review now groups transactions from the same merchant together (e.g. all your SuperValu trips) with a running total, instead of listing every single line separately.',
      'Added "Log all" and "Ignore all" bulk actions for a merchant group, so you can clear out repeat charges in one click instead of one at a time.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-09-03',
    changes: [
      'The "Ask about your spending" box can now answer how-to questions too — try "how do I import a statement" or "how do I assign a bill to someone" alongside your usual spending questions.',
      'Added quick How do I... buttons under the ask box for common setup questions.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-09-03',
    changes: [
      'Statement imports now ask which account a statement is from — matching is scoped to that account so bills and transfers on other accounts don\'t get cross-matched by mistake, which matters once you\'re importing statements for more than one account.',
      'The account is now shown alongside each past statement import in the list.',
    ],
  },
  {
    version: '1.11.1',
    date: '2026-09-03',
    changes: [
      'Tidied up the top navigation — Flow, Goals, Planned and Money Map are now grouped under a single "Money Journey" menu instead of crowding the main bar.',
      'Removed the blue "Admin workspace" banner that sat above the header for admin accounts.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-09-03',
    changes: [
      'New: import a bank or credit-card statement (CSV) on the Flow tab to cross-check it against your bills — Tally auto-matches what it recognises, flags recurring-but-untracked charges worth checking, and remembers your confirmations so cryptic statement references get recognised automatically next time.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-09-03',
    changes: [
      'Scanning a bill in a foreign currency now offers a one-click live conversion to your household currency, using daily ECB exchange rates.',
    ],
  },
  {
    version: '1.9.2',
    date: '2026-09-03',
    changes: [
      'Household ledger filters now include "Unpaid" and "Overdue", each showing a live count, alongside the existing All/Active/Paused.',
    ],
  },
  {
    version: '1.9.1',
    date: '2026-09-03',
    changes: [
      'Tightened up the Add/Edit expense window so it fits on laptop screens with far less scrolling — Save and Cancel now stay pinned in view.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-09-03',
    changes: [
      'Planned expenses can now link to a savings Goal — see how much you\'ve saved towards it right on the Planned list.',
      'Overview now shows a quiet nudge when planned costs are coming up, linking straight to the Planned list.',
      'Planned items due within 30 days now get a "consider activating" badge as a gentle reminder.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-09-03',
    changes: [
      'New "Planned" section for costs that aren\'t required yet (e.g. college) — add them ahead of time and they sit in their own stand-alone list, with zero impact on totals, bills or insights until you hit "Activate".',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-09-03',
    changes: [
      'New "Mortgage & loans" spending category to keep big-ticket items (mortgage, car/personal loan repayments, holidays) separate from everyday bills — totals and account links are unaffected.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-09-03',
    changes: [
      'Spending ledger rows now expand into a quick view on click — see category, billing cycle, renewal day, payment account, vendor email, contract end date, usage and notes without opening the edit form.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-09-03',
    changes: [
      'Overview on mobile is much shorter — Recently Added, Spending and Upcoming Bills are now quick-switch tabs instead of one long stacked page.',
      'Stat cards (This month spent, Coming up, Left after bills) swipe horizontally on mobile instead of stacking.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-09-03',
    changes: [
      'Income now has a "Next pay date" so monthly, weekly, quarterly and annual income repeats on a specific day, just like bills — Tally rolls it forward automatically after each payday.',
      'Overview dashboard cards now show how many items they\'re displaying out of the total, with "View all" links through to Spending or Bills — makes it clear why Overview shows fewer items than the full ledger.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-09-03',
    changes: [
      'Added "Scan a bill": paste, drag-and-drop, or upload a screenshot/photo of a bill or receipt anywhere in the app and Tally will read it and match it to an existing bill or pre-fill a new one for you to review.',
      'Added a separate vendor/provider name field on expenses, distinct from the item name and vendor email (e.g. item "Broadband", vendor "Vodafone").',
      'Sessions now stay signed in as long as you use the app at least once a month, instead of requiring a fresh magic-code login every time.',
      'Added a confirmation prompt before logging out, and a floating quick-hide button for instantly blurring the screen.',
      'Recently Added on the Overview dashboard now shows category, paid status and due date at a glance.',
      'You can now mark a bill as paid right when you add it, not just when editing.',
      'Fixed bills showing as "Overdue" in Bills/Overview after already being marked paid in Spending.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-09-03',
    changes: [
      'Added a privacy blur — the dashboard auto-hides after a short idle period or when the window loses focus, plus a manual "blur now" toggle for before you share your screen.',
      'Added a one-off (single payment) billing cycle for expenses that don\'t recur, like a car repair or a doctor\'s visit.',
      'Added an in-app version number and changelog.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-03',
    changes: [
      'Added Money Journey: Goals (savings targets linked to accounts) and Flow (a full transfer/money-movement ledger).',
      'Added AI-powered money-flow insights and spending optimisation suggestions.',
      'Added Money Map — a visual, node-graph view of how money moves through your accounts.',
      'Added encrypted Accounts with reveal-to-view sensitive details, and an encryption key rotation tool.',
      'Rebranded from Home Alone to Tally with a new green design system and logo.',
      'Switched all site copy to Irish/British English spelling.',
      'Reworked Add Expense: category and payment method are now dropdowns, and clicking outside the modal no longer discards your entry.',
      'Added legal/compliance pages (Privacy, Terms, AI Transparency) and hardened authentication security.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-01',
    changes: [
      'Initial release: household expense & subscription tracker with multi-user profiles and PostgreSQL cloud sync.',
      'Magic-code sign-in, session management, and an Admin panel for managing household members.',
      'AI spending assistant, income tracking, and a savings horizon view.',
      'Automatic contract renewal reminders and vendor contact email drafting.',
      'Progressive Web App support for installing on mobile devices.',
    ],
  },
];

export const MOBILE_APP_VERSION = '1.3.0';

export const MOBILE_CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.0',
    date: '2026-09-08',
    changes: [
      'Mobile is now deliberately a quick-glance experience. The menu keeps the read views up front — Overview, Spending, Bills, Income, Accounts, Insights, Reports, Progress — and tucks Flow, Planned and Money Map under "More — best on desktop".',
      'The dense authoring flows — statement import and the Category Manager — now show a short "open on a larger screen" note on a phone instead of a cramped editor. Home projects show a read-only summary on mobile.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-09-04',
    changes: [
      'Improved the privacy screen with a stronger veil, Tally branding, and a large accessible Reveal Tally button.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-09-04',
    changes: [
      'Simplified Spending filters into a responsive toolbar and replaced crowded row icons with labelled status controls and a compact More menu.',
    ],
  },
  {
    version: '1.1.1',
    date: '2026-09-04',
    changes: [
      'Made the expanded Ask Tally shortcuts easier to scan on small screens with clear insight/help groups and a responsive one- or two-column layout.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-04',
    changes: [
      'Refreshed the mobile look and feel with warmer colours, clearer type, larger touch targets, softer cards, a cleaner drawer, and a more focused small-screen action bar.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-03',
    changes: [
      'Ledger rows resized so they no longer run oversized on small screens.',
      'Overview stat cards resized to fit mobile screens properly.',
    ],
  },
];
