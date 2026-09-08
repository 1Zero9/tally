# Tally Competitive Feature Research

Audience: Tally product owner  
Date: 8 September 2026  
Scope: Consumer personal-finance products relevant to Tally, with emphasis on Ireland and the UK. The comparison covers PocketSmith, YNAB, Monarch Money, Quicken Simplifi, Emma, Actual Budget, Lunch Money, Copilot Money, Moneyhub and MoneyWiz. Product claims were checked against current first-party pages and documentation. Tally capabilities were verified from its repository, schema, guide and changelog.

## Executive answer

Tally already has a credible and distinctive product core. It combines a shared household ledger, explicit money transfers, statement reconciliation from CSV, PDF and images, recurring bills, real income receipts, goals, projects, planned costs, a money-flow map, AI assistance and restorable household backups. Most competitors cover only parts of that combination. Tally is especially strong where users need to explain how money moved and verify it against source records.

The most valuable next feature is a dated cash-flow forecast built from current balances, recurring income, bills, planned expenses and goals. It should show the lowest projected balance and the first date an account or household total goes negative. A second phase should add toggleable what-if scenarios. PocketSmith makes this its defining capability, while Simplifi and Actual Budget validate the value of a shorter, easier forecast.

The next two priorities are a user-visible transaction rules engine and budget periods with rollovers. Both reduce repetitive work without weakening Tally's traceability. Ireland-focused Open Banking could create major value, but it is expensive, operationally demanding and dependent on coverage quality. It should follow a coverage and economics study rather than lead the roadmap.

Tally should preserve its current position as a shared, auditable household money system. Investment trading analytics, credit scores, tax filing and a broad financial marketplace would add scope faster than they add differentiation.

## What Tally already has

### Shared household ledger and control

Tally gives household members one shared workspace for expenses, income, accounts, transfers and goals, with separate logins and Admin, Member and Backup Admin roles. It also records destructive and access-related events. This is comparable with household collaboration in Monarch, Lunch Money, YNAB and Simplifi, although some competitors support selected-plan sharing or adviser access rather than Tally's single shared ledger.

Repository evidence: `docs/user-guide.md` lines 5–18, 206–219 and 240–249; `prisma/schema.prisma` lines 63–94 and 697–720.

### Bills spending and income

The app supports recurring and one-off expenses, multiple billing cycles, categories, payment methods, renewal dates, pause and paid states, contract dates, variable costs, reimbursements, member assignment and linked payment accounts. It tracks recurring income estimates and actual receipts. Contract reminders are emailed 30, 14 and 7 days before expiry, and upcoming bills are summarized over seven and 30 days.

Repository evidence: `prisma/schema.prisma` lines 147–267 and 722–734; `docs/user-guide.md` lines 65–95.

### Statement import and reconciliation

Tally imports CSV, PDF and photographed statements. It extracts statement and account details, reconciles opening and closing balances, detects overlapping imports, suggests matches, learns confirmed merchants, supports batch review and can create or link expenses, recurring bills, income and transfers. Users can undo a row or an entire import. The cross-import activity view makes past decisions findable and reversible.

This is one of Tally's strongest differentiators. Most competitors emphasize automatic feeds, file import and categorization; Tally's source-document extraction, balance check, explicit review state and reversible downstream actions form a more auditable workflow.

Repository evidence: `docs/user-guide.md` lines 121–151; `prisma/schema.prisma` lines 515–625; `src/data/changelog.ts` lines 53–57.

### Explicit money movement

Tally distinguishes household income, external spending and transfers between owned accounts. Internal transfers and card or loan payments do not inflate spending. Money trails group transfers into a named route and show how long money remained at each stop. The Money Map shows actual or projected flows, while a freeform version lets the household draw its own structure.

Competitors such as Copilot and PocketSmith also distinguish transfers, and Monarch offers a Sankey report. Tally's combination of an auditable transfer ledger, route grouping and editable map is unusual.

Repository evidence: `docs/user-guide.md` lines 109–120 and 171–180; `prisma/schema.prisma` lines 328–484.

### Goals projects and planned costs

Savings goals track targets, dates, contributions and projected completion. Progress views summarize savings accounts and loan or card payoff. Planned expenses remain outside totals until activated. Home projects compare estimated line items with linked real spending, including partial allocations.

Repository evidence: `docs/user-guide.md` lines 153–169; `prisma/schema.prisma` lines 414–513; `src/data/changelog.ts` lines 18–50.

### Reporting insights and AI

Reports cover income versus spending trends, category and vendor rankings and a transaction timeline, with CSV export and browser PDF printing. The assistant answers household-data and help questions. Other opt-in AI features scan receipts, parse statements, analyze money flow and draft vendor emails. Rule-based insights identify annual-plan savings, low-use subscriptions and savings from paused services.

Tally already matches the conversational-data direction visible in Copilot Money, while its explicit opt-in model and AI transparency support a privacy-led position.

Repository evidence: `docs/user-guide.md` lines 61–63 and 182–200; `src/utils/reports.ts` lines 44–149.

### Privacy portability and recovery

Tally uses passwordless access, secure sessions, idle logout, privacy blur and encrypted sensitive account fields. It exports bills as CSV or JSON and supports full restorable household snapshots, automatic daily backups and 14-snapshot retention.

The snapshot system is stronger than a basic export, but a complete user-downloadable export is not clearly documented. Actual Budget and Lunch Money set a higher expectation for user-controlled portability and APIs.

Repository evidence: `docs/user-guide.md` lines 212–238; `prisma/schema.prisma` lines 269–325 and 736–755.

## Current feature gaps

| Feature gap | User value | Competitor evidence | Tally position |
| --- | --- | --- | --- |
| Dated cash-flow forecast | Shows whether and when balances become unsafe | PocketSmith forecasts daily balances with calendars and scenarios; Simplifi projects balances up to one year; Actual Budget has an experimental balance forecast | Tally shows upcoming bills and projected recurring flows but no dated balance path |
| What-if scenarios | Tests a purchase, income change, mortgage increase or accelerated debt payment before committing | PocketSmith supports multiple secondary scenarios that can be toggled on and off | No scenario model |
| Live bank feeds and balance refresh | Removes imports and manual balance updates | PocketSmith, YNAB, Monarch, Simplifi, Emma, Lunch Money and MoneyWiz aggregate accounts; Actual supports EU-oriented providers | Explicitly absent; Ireland coverage and consent operations need validation |
| Editable transaction rules | Automates repetitive cleanup while keeping decisions inspectable | Actual auto-learns editable rules; Monarch supports ordered conditions and multiple actions; Lunch Money has a rules engine | Merchant aliases learn some statement behavior, but users cannot inspect or author general rules |
| Rollover and flexible budgets | Handles irregular spending and pay cycles more realistically | Monarch offers Category and Flex modes plus rollovers; YNAB uses allocation targets; Emma and Lunch Money support rollovers and non-monthly periods | One monthly category limit with no rollover, history or member split |
| Free-to-spend and budget pacing | Converts the plan into a simple daily decision | Emma calculates a daily allowance; Copilot shows free-to-spend against an ideal daily pace; Simplifi calculates left to spend | Tally shows committed spend and timing risk but not a live safe-to-spend amount |
| Debt payoff simulator | Makes extra-payment tradeoffs visible | YNAB calculates payoff time and interest saved; Moneyhub promotes debt management | Tally shows payoff progress and loan metadata but no amortization scenarios |
| Net-worth history and richer assets | Shows long-run household progress | Monarch and Simplifi track net worth history; Monarch adds real-estate values; Moneyhub aggregates pensions and property | Current net worth comes from manual balances; no balance history, property or pension model |
| Investment holdings and performance | Gives useful detail beyond one manual balance | Monarch, Simplifi, Copilot, Lunch Money and MoneyWiz track holdings or portfolio performance | Investment is an account type with a generic manual balance only |
| Watchlists and custom alerts | Lets a household monitor a merchant, category, tag or risk without restructuring the budget | Simplifi Watchlists track arbitrary combinations and projections; Copilot offers overdraft, unusual-spend and payday alerts | Contract reminders and overview nudges exist, but there is no general alert or watchlist model |
| Transaction splits groups and tags | Represents mixed purchases and provides flexible reporting dimensions | Lunch Money and Copilot split transactions; Lunch Money groups and tags them | Project allocations split value for a project, but the general transaction model lacks category splits and tags |
| Full data export and developer API | Strengthens trust, migration and integrations | Actual and Lunch Money provide extensive export and APIs; PocketSmith exports transaction data | Full restorable snapshots exist, but portable whole-household export and API access are unclear |
| Document attachments and financial inbox | Keeps invoices, policies and receipts beside the relevant item | PocketSmith stores and contextualizes files beside transactions and budgets; MoneyWiz supports receipt attachments | Tally extracts uploaded images and PDFs, but persistent source-document storage is not evident |
| Granular sharing boundaries | Supports personal, joint and adviser views in one account | Emma Spaces separate joint from personal activity; YNAB can share selected plans | Tally shares the household ledger; roles govern administration rather than record visibility |
| Offline use widgets and native notifications | Improves frequent, low-effort engagement | YNAB works offline and offers mobile widgets; Copilot offers several widgets | Tally is a PWA, but no comparable offline ledger or widget set was established |
| Tax-specific reports | Helps with annual filing and adviser handoff | Simplifi offers tax reports and tax-oriented export formats | No tax fields or tax report |

## Competitor profiles

### PocketSmith

PocketSmith is the closest strategic comparator because it combines aggregation, budgets, reports and an unusually deep future view. Every account has a primary scenario, scheduled budgets create daily closing balances, and secondary scenarios model proposed decisions. It also offers multi-currency support, attachments, saved searches, custom dashboards, collaborators and email summaries. Its current pages disagree on whether the maximum forecast is 30 or 60 years, so horizon claims should be treated as plan-dependent marketing rather than a product requirement.

Implication for Tally: borrow the scenario concept, but begin with a transparent 90-day or 12-month forecast whose calculations can be traced to Tally records.

### YNAB

YNAB is built around proactive allocation of available money. Targets, scheduled transactions, bank import and reconciliation support that method. Its loan simulator demonstrates the time and interest saved by extra payments. YNAB Together supports six individual users under one subscription and selected-plan sharing.

Implication for Tally: goal prompts and a debt simulator are valuable, but adopting strict zero-based budgeting would change Tally's product philosophy and add substantial complexity.

### Monarch Money

Monarch combines account aggregation, AI categorization, searchable transactions, recurring bills, investments, goals and household collaboration. It offers both detailed category budgets and a simpler Flex budget, rollovers, ordered transaction rules, configurable dashboards and rich reports including Sankey flows.

Implication for Tally: Monarch validates two accessible additions: user-controlled automation rules and a simple flexible-spend option alongside category limits.

### Quicken Simplifi

Simplifi's Spending Plan subtracts recurring bills, goals and planned spending from income to calculate what remains. Projected Cash Flow estimates balances up to one year. Watchlists provide a light way to monitor a category, merchant or tag with targets, projections and alerts. Its reports extend to tax and investment analysis.

Implication for Tally: Watchlists fit Tally well because they add attention and pacing without forcing every concern into a formal budget.

### Emma

Emma connects UK, US and Canadian accounts, detects subscriptions and offers rolling budgets, daily allowance, merchant budgets, rules, net worth and Spaces. A shared Space can isolate joint activity while personal data remains private. Official information says Emma does not currently support EU banks, so it is a useful UX reference but not a direct Irish connectivity benchmark.

### Actual Budget

Actual Budget is open source and local first. It offers envelope or tracking budgets, schedules, reports, bank sync, powerful editable rules, extensive import and export, an API and optional end-to-end encrypted sync. Its balance forecast remains experimental. Collaboration is technical rather than household-oriented.

Implication for Tally: Actual sets the benchmark for inspectable rules, data ownership and extensibility.

### Lunch Money

Lunch Money is a web-first product with bank, PDF and CSV import, multi-currency, flexible budgets, recurring items, calendar, analytics, rules, net worth, crypto, unlimited collaborators and a developer API. It claims Plaid support across the United States, Canada and the EU, although Irish institution coverage was not verified.

### Copilot Money

Copilot Money emphasizes polished automation. It provides adaptive budgets, recurring detection, linked savings goals, investment performance, custom alerts, split transactions and conversational AI. It is limited to US institutions, so it is a design and engagement reference rather than an Irish connectivity competitor.

### Moneyhub

Moneyhub's current positioning is mainly UK open-finance infrastructure. It aggregates bank, pension, investment, mortgage, loan, property and crypto data and offers transaction enrichment and alert capabilities to other providers. Current Irish retail availability was not established.

### MoneyWiz

MoneyWiz is a relevant European comparator. It advertises aggregation through several providers, including an EEA PSD2 provider, alongside multi-currency, investment tracking, budgets, goals, bill alerts, forecasts, reports, attachments and flexible imports. Exact Irish-bank coverage still requires institution-level testing.

## Recommended roadmap

### Priority 1 Build a transparent cash-flow runway

Create a household and per-account forecast from current balances, dated recurring income, recurring bills, scheduled transfers and activated planned costs. Start with 90 days and allow a 12-month view. Display the lowest projected balance, its date, and the first shortfall. Every point should open the records that caused it.

Why first: Tally already contains most inputs. This converts existing data into a repeated decision tool and strengthens the current timing-risk insight. It is valuable even without live bank feeds.

Success measures: forecast setup completion, weekly forecast views, records corrected from forecast drill-down, and reduction in upcoming negative-balance events.

### Priority 2 Add editable automation rules

Turn learned merchant behavior into a visible rules area. Begin with conditions for merchant text, direction, amount range and account, and actions for rename, category, transfer type, recurring bill or income match, tag and ignore. Show a preview count before saving and retain the originating rule on each automatic decision.

Why second: it reduces reconciliation effort while preserving Tally's auditability. It also prepares the product for live feeds.

Success measures: reviewed rows per import, correction rate on automatic actions, rules retained after 30 days, and time to reconcile a statement.

### Priority 3 Make budgets adapt to real households

Add explicit budget periods, rollover balances and budget-versus-actual history. Then offer a simple Flex amount that groups variable categories. Keep current category limits as the default so existing users do not face a forced methodology change.

Success measures: households with an active budget, monthly return rate, rollover use and fewer abandoned budgets.

### Priority 4 Add watchlists alerts and safe-to-spend

Allow users to watch a merchant, category, account or tag with an optional threshold. Add low-balance, unusual-spend, payday and goal-pace alerts. Calculate a conservative safe-to-spend amount from the forecast and remaining flexible budget, with the assumptions visible.

Success measures: watchlists created, alert action rate, alert mute rate and forecast corrections triggered by alerts.

### Priority 5 Add debt what-if planning

Use existing loan balance, rate, term and payment data to show a baseline amortization schedule. Let users test one-off and recurring extra payments and show the resulting payoff date and interest difference.

Success measures: simulations created, extra-payment plans saved and payoff targets linked to transfers.

### Priority 6 Investigate Ireland Open Banking

Run a separate discovery phase before implementation. Verify coverage for the household banks Tally users actually hold, consent renewal behavior, refresh frequency, pending versus booked handling, duplicate identifiers, historical depth, pricing, data residency, support burden and provider exit terms. Test MoneyWiz's EEA provider and Lunch Money's claimed EU Plaid support at institution level; do not infer Irish coverage from an EU label.

Why later: feeds remove the largest source of friction, but unreliable feeds would weaken the trust that differentiates Tally. The rules engine and reconciliation model should be ready before transaction volume becomes continuous.

### Later opportunities

Add complete downloadable household export and a read-only API; transaction splits and tags; balance history, property and pension assets; persistent document attachments; configurable household visibility; and deeper investment tracking. Each is credible, but none should displace the forecast, automation and budget work above.

### Features to defer

Defer credit scores, tax filing, investment trading or advice, cashback and product marketplaces. They add regulatory, geographic and commercial complexity and do little to strengthen Tally's shared, traceable household-money proposition. Tax-ready tagging and export may be useful later without turning Tally into tax software.

## Suggested release sequence

| Release theme | Minimum useful scope | Dependency |
| --- | --- | --- |
| Cash runway | 90-day household and account forecast, shortfall dates, drill-down | Existing dated balances, bills, income and transfers |
| Scenarios | Toggle named changes to income, bills, transfers and project costs | Cash runway calculation engine |
| Rules | Visible merchant/account/amount conditions, preview, audit origin | Existing aliases and statement review |
| Better budgets | Periods, rollovers, actual history, optional Flex group | Stable transaction categorization |
| Attention layer | Watchlists, low-balance alerts, safe-to-spend | Forecast and budget engine |
| Debt planner | Baseline and extra-payment comparisons | Forecast math and existing loan fields |
| Feed pilot | Read-only sync for a small verified Irish bank set | Rules, duplicate controls and provider study |

## Limits and uncertainties

This is a feature and positioning study, not a hands-on usability benchmark. Competitor pages describe availability but do not prove data quality, reliability or user satisfaction. Several products are geographically restricted: Emma does not currently support EU banks, Copilot Money is US-only, Moneyhub is UK-focused and increasingly B2B, and Monarch's official download page limits availability to the United States and Canada. Lunch Money's EU claim and MoneyWiz's EEA connection do not establish coverage for a specific Irish institution. PocketSmith's official pages conflict on its maximum forecast horizon. The report therefore recommends institution-level feed testing and avoids ranking products by unverifiable breadth claims.

## Claim to source ledger

- Tally User Guide. Tally repository. Current at 8 September 2026. `docs/user-guide.md`.
- Tally Prisma Schema. Tally repository. Current at 8 September 2026. `prisma/schema.prisma`.
- Tally Changelog. Tally repository. Current at 8 September 2026. `src/data/changelog.ts`.
- PocketSmith Features. PocketSmith. No visible date. https://www.pocketsmith.com/features/
- PocketSmith Scenarios. PocketSmith Learn Centre. No visible date. https://learn.pocketsmith.com/calendar--forecasting/6a6X8SseDAXwf8ZqYunJuU/scenarios-everything-you-need-to-know-about-scenarios-in-pocketsmith/6a6X8SseDAQ8gWy6LCbMW8
- Using the Calendar and Forecast Graph. PocketSmith Learn Centre. No visible date. https://learn.pocketsmith.com/article/1246-using-the-calendar-and-forecast-graph
- YNAB Features. YNAB. No visible date. https://www.ynab.com/features
- YNAB Debt Management. YNAB. No visible date. https://www.ynab.com/features/debt-management
- Monarch Tracking. Monarch Money. No visible date. https://www.monarchmoney.com/features/recurring
- Creating Your Budget in Monarch. Monarch Money Help. Updated 16 August 2025. https://help.monarchmoney.com/hc/en-us/articles/360048883631-Budgets
- Rollover Budgets. Monarch Money Help. Updated 13 February 2025. https://help.monarchmoney.com/hc/en-us/articles/4411119762196-Rollover-budget-feature
- Creating Transaction Rules. Monarch Money Help. Updated 9 May 2025. https://help.monarchmoney.com/hc/en-us/articles/360048393372-Transaction-rules
- Quicken Simplifi Projected Cashflow. Quicken. No visible date. https://www.quicken.com/features/projected-cashflow/
- Understanding Your Spending Plan. Quicken Simplifi Help Center. Natalie. Updated 11 June 2026. https://support.simplifi.quicken.com/en/articles/4212702-understanding-your-spending-plan
- Using Watchlists on the Web App. Quicken Simplifi Help Center. Natalie. Updated 23 December 2025. https://support.simplifi.quicken.com/en/articles/3472367-using-watchlists-on-the-web-app
- Emma Budgeting. Emma. No visible date. https://emma-app.com/features/tracking/budgeting
- How Joint Bank Accounts Work in Emma. Emma Help. Updated 27 February 2026. https://help.emma-app.com/en/article/how-do-joint-bank-accounts-work-in-emma-1phctzt/
- Actual Budget Rules. Actual Budget. Current documentation. https://actualbudget.org/docs/budgeting/rules/
- Actual Budget Syncing Across Devices. Actual Budget. Current documentation. https://actualbudget.org/docs/getting-started/sync/
- Lunch Money Features. Lunch Money. No visible date. https://lunchmoney.app/features
- Lunch Money Media Kit. Lunch Money. 2026. https://lunchmoney.app/media-kit/
- Lunch Money Developers. Lunch Money. No visible date. https://lunchmoney.app/developers
- Copilot Money FAQ. Copilot Money. Current at access. https://www.copilot.money/faq
- Moneyhub Data Aggregation. Moneyhub. No visible date. https://moneyhub.com/products/data-aggregation/
- MoneyWiz Homepage. MoneyWiz. Current at access. https://www.wiz.money/
- MoneyWiz Online Banking Providers. MoneyWiz Help. Updated 30 May 2023. https://help.wiz.money/en/articles/4440621-how-to-change-the-online-banking-provider

## Research record

Research used a repository audit and two competitor lanes. Discovery covered current official feature and support pages for ten products. Follow-up searches focused on forecasting, rules, budgeting, household sharing, regional availability, portability and privacy. The search stopped when every recommended roadmap item had first-party support, the most consequential regional and forecasting claims were checked, and additional results were repeating established feature patterns. No product was installed or tested with real bank data.
