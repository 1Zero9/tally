# Tally — Technical Overview

A complete technical reference for the Tally codebase: architecture, data model, API surface, security model, and the full feature set. For the end-user walkthrough, see [`user-guide.md`](./user-guide.md).

---

## Contents

1. [Architecture](#1-architecture)
2. [Data model](#2-data-model)
3. [Authentication & sessions](#3-authentication--sessions)
4. [Security & encryption](#4-security--encryption)
5. [AI features](#5-ai-features)
6. [API reference](#6-api-reference)
7. [Frontend structure](#7-frontend-structure)
8. [Feature reference](#8-feature-reference)
9. [Environment variables](#9-environment-variables)
10. [Local development & deployment](#10-local-development--deployment)

---

## 1. Architecture

Tally is a server-rendered, full-stack **Next.js App Router** application — there is no separate backend service. All business logic lives in Next.js Route Handlers under `app/api/`, called from client components via `fetch`.

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma (`@prisma/client`) |
| Auth | Passwordless 6-digit OTP, first-party session cookies (no third-party auth provider) |
| AI | Google Gemini (`@google/generative-ai`, model `gemini-flash-latest`) — text and vision |
| Email | Resend |
| Styling | Hand-rolled CSS design tokens (`--ha-*`), no CSS framework |
| Icons | Lucide React |
| Deployment target | Vercel, Netlify, or a Node.js/Docker host |

Requests flow: **Client component** → `fetch('/api/...')` → **Route Handler** (`app/api/**/route.ts`) → `requireUser`/`requireHouseholdUser`/`requireAdmin` (`src/lib/auth.ts`) → **Prisma** (`src/lib/prisma.ts`) → **PostgreSQL**.

`middleware.ts` runs on the Edge runtime on every request (excluding static assets) purely to refresh the session cookie's `maxAge`, keeping the browser cookie's lifetime in step with the sliding-expiration session stored in the database (see [§3](#3-authentication--sessions)). It deliberately avoids importing Prisma, since Prisma's Node runtime isn't supported on the Edge.

## 2. Data model

Defined in `prisma/schema.prisma`. Every domain model is scoped to a `Household` (multi-tenant by household, not by individual user), and most also record `createdById` for attribution.

- **Household** — the tenant boundary. Has a unique `inviteCode` column, but self-service joining via it is intentionally disabled (`POST /api/workspace/join` unconditionally returns 410) — the app is invite-only, and the only way in is an admin inviting a specific email via `POST /api/workspace/invite`.
- **User** — belongs to at most one household; `role` is `ADMIN`, `MEMBER`, or `BACKUP_ADMIN`. `BACKUP_ADMIN` is intentionally permission-identical to `ADMIN` (`requireAdmin()` passes for both, see §3) — a separate role only so it's clear who the "usual" admin is, not a restricted tier. Note the household's minimum-one-admin protection (§8) currently only counts `ADMIN` rows, so a household could in principle end up with only a `BACKUP_ADMIN` as its sole admin — harmless functionally since that role already has full admin rights, just worth knowing if the count ever looks surprising.
- **Session** — opaque token, `expiresAt`, sliding expiration (see §3).
- **VerificationToken** — short-lived 6-digit login codes with an `attempts` counter.
- **Expense** — a recurring or one-off bill/subscription (`billingCycle`: `weekly | monthly | quarterly | termly | annual | once`), with category, payment account link, optional linked savings `Goal`, contract end date, usage rating, and pause/active state. `originalAmount`/`originalCurrency`/`exchangeRate`/`rateDate` are set only when a receipt scan applied a live currency conversion — preserve what was actually paid alongside the converted `amount`/`currency`, informational only (never used in totals). `reimbursementExpected`/`reimbursementReceived`/`reimbursementReceivedDate` track a partial refund against this expense (e.g. a health-insurance claim). Every "this month" spend total/budget/category-breakdown in the app (client and server) reads the amount through a shared `getMonthlyContribution()` helper (`src/utils/calculations.ts`) instead of the raw field: a recurring bill still contributes its steady-state monthly-equivalent rate every month regardless of its own date, but a one-off (`once`-cycle) cost contributes its full (reimbursement-netted) amount only in the calendar month it's actually dated (`nextRenewalDate` doubles as "payment date" for a one-off) — nothing in any other month. Forward-looking "what's due" figures, Money Map's *projected* (recurring-rate) view, and a single row's own displayed amount are deliberately left reading the raw amount/the older date-independent `getMonthlyEquivalent()`, unaffected either way.
- **Income** — recurring or one-off income, with frequency, optional `nextPayDate`, and a linked deposit `Account`.
- **Account** — a bank account, card, or loan. Sensitive fields (`accountNumberEnc`, `routingNumberEnc`, `loginUsernameEnc`, `loginPasswordEnc`, `loginUrlEnc`, `securityNotesEnc`) are stored **AES-256-GCM encrypted at the application layer** — see §4. Loan-specific fields (`originalAmount`, `interestRate`, `termMonths`, `payoffDate`) are plaintext, as they aren't secrets on their own. `balance`/`balanceAsOf` (also plaintext) are manually entered — no live bank sync — and power the Overview net-worth figure (§8: assets minus `CREDIT_CARD`/`LOAN` types).
- **Transfer** — a single, dated real money movement ("money journey" ledger). Either side (`fromAccountId`/`toAccountId`) can be null to represent money crossing the household boundary (income landing, a payment going out), with a free-text `externalLabel`. Optionally linked to the recurring `Expense`/`Income` record it corresponds to.
- **Goal** — a savings target, optionally linked to an `Account` and/or to one or more `Expense`s (for goals that fund a periodic bill, e.g. an annual subscription paid via monthly top-ups).
- **StatementImport** — a single upload of a bank/card statement, optionally scoped to one `Account` (so matching doesn't cross accounts). `openingBalance`/`closingBalance`/`statementPeriod` are populated only for PDF/photo imports (from `analyzeStatementDocument`'s extraction) and power a client-side reconciliation check — `closingBalance - openingBalance` against the sum of every logged row's signed amount for that import, regardless of status, since a row still counts even if `IGNORED` or flagged `DUPLICATE`. Every `Expense`/`Transfer` created via resolving one of its rows is stamped with `statementImportId` (`onDelete: SetNull`, so the ordinary delete-import action doesn't touch them), letting `POST /api/statements/[id]/undo` remove an entire import's effects — including already-logged bills/transfers — as a unit; this is a separate, stronger action from the plain delete route, which intentionally keeps those records.
- **StatementTransaction** — one normalized row from an import: `status` (`UNMATCHED | MATCHED | IGNORED | DUPLICATE`), `matchConfidence`, optional links to a matched `Expense`/`Transfer`, a learned `suggestedCategory`, and a `vendorName` nickname. `DUPLICATE` is assigned at import time, not by the matching pipeline — see §8.
- **MerchantAlias** — a learned `(householdId, pattern)` → `vendorName`/`category` mapping, built up as the household confirms statement matches, so cryptic bank descriptions ("IEPROS") get recognized and auto-categorized automatically next time. `matchCount` tracks how many times it's been reinforced.
- **Category** — household-defined custom spending categories (in addition to the fixed built-in set in `src/data/categories.ts`), each with its own icon/colour, unique per household by name.
- **ExchangeRate** — global (not household-scoped) cache of the current EUR-base rate for each non-EUR currency Tally supports, one row per currency, refreshed lazily whenever a row is missing or older than 24h — see §8's multi-currency note.
- **Budget** — one static monthly limit per category (built-in or custom, matched by the same id used everywhere else), `@@unique([householdId, category])` so each household has at most one budget per category. Deliberately an MVP: no rollover, no history, no per-member split — see §8.
- **AuditLog** — a plain, append-only trail for destructive and identity-affecting actions only (deletions of Expense/Account/Goal/Transfer/Income, backup restores, member removal, role changes) — deliberately not full field-level diffing on every edit. `entityLabel` is a short human-readable snapshot taken at the time of the action, written via a single `logAudit()` helper (`src/lib/audit.ts`) called from each affected route.
- **DatabaseBackup** — a stored full-household JSON snapshot, created by admins or by the daily `cron/backup` job (`isAutomatic` distinguishes the two; automatic snapshots are pruned to the most recent 14 per household, manual ones never auto-pruned). `payloadJson` holds `{ accounts, goals, expenses, incomes, transfers }` (each a plain array of that table's rows, Account rows including their `*Enc` ciphertext as-is). Restore deletes the household's rows across all five tables, then recreates them in dependency order (Account → Goal → Expense → Income → Transfer), building an old-id → new-id map at each step so cross-references (an Expense's `paymentAccountId`, a Transfer's `linkedExpenseId`, etc.) resolve to the newly-created rows rather than the snapshot's now-gone ids. Older backups predating this shape have `payloadJson` as a bare array of Expense rows and still restore correctly via a legacy branch.

Nearly every model index's `householdId`, since virtually every query is household-scoped.

## 3. Authentication & sessions

Tally uses **passwordless, 6-digit magic-code sign-in** — there are no stored passwords anywhere.

1. `POST /api/auth/send-code` — issues a `VerificationToken` (6-digit code, 15-minute expiry) for the given email and emails it via Resend.
2. `POST /api/auth/verify-code` — checks the code (with an `attempts` limit against brute-forcing), creates a `Session` row, and sets an httpOnly `tally_session` cookie.
3. `getSessionUser()` (`src/lib/auth.ts`) is the **single source of truth** for "who is making this request" on every API route — request bodies are never trusted for identity, user ID, household ID, or role.

**Sliding expiration**: sessions last 30 days from creation, but `getSessionUser()` transparently extends (`touch`es) a session back out to a fresh 30 days once its remaining life drops under ~25 days. `middleware.ts` mirrors this by refreshing the cookie's own `maxAge` on every request, so the browser cookie and the DB session never drift out of sync — anyone who opens the app at least once every ~25–30 days stays signed in indefinitely without re-entering a code.

Three composable guard helpers wrap every protected route handler:
- `requireUser()` — any authenticated user.
- `requireHouseholdUser()` — authenticated **and** belongs to a household.
- `requireAdmin()` — authenticated, in a household, and role is `ADMIN` or `BACKUP_ADMIN`.

Separately from the 30-day session, the client also enforces a **30-minute idle auto-sign-out** in an open tab, and a **90-second privacy blur** (`PrivacyBlurOverlay.tsx`) that hides on-screen figures after inactivity or when the tab loses focus — both independent of the underlying session lifetime.

## 4. Security & encryption

- **Field-level encryption** (`src/lib/crypto.ts`): sensitive `Account` fields are encrypted with **AES-256-GCM** before being written to the database — a random 12-byte IV per value, with the GCM auth tag appended so tampering/corruption is detectable on decrypt. Stored format: `base64(iv):base64(authTag):base64(ciphertext)`.
  - The key comes from `CREDENTIALS_ENCRYPTION_KEY` (32 raw bytes, base64-encoded — generate with `openssl rand -base64 32`). If unset, encryption calls throw rather than silently falling back to plaintext.
  - Encrypted fields are **never selected** in list/summary API responses — only decrypted on an explicit "reveal" action (`POST /api/accounts/[id]/reveal`), or for statement-import account verification, via an on-the-fly comparison (`src/lib/accountMatching.ts`, shared by both statement-matching endpoints below) that returns only a match/mismatch signal per field, never the decrypted value.
  - `npm run rotate-key` (`scripts/rotate-encryption-key.ts`) re-encrypts all sensitive fields under a new key.
- **Passwordless auth** removes password-database risk entirely (see §3).
- **httpOnly, secure, sameSite=lax session cookie** — inaccessible to client-side scripts, mitigating XSS-based session theft.
- **Household-scoped queries everywhere** — every Prisma query for domain data filters by the requester's own `householdId` from the session, never from client input.
- **AI data isolation** — every AI call (`src/lib/ai.ts`) is passed only the requesting household's own data, assembled server-side; the model is never given cross-household context, and nothing is sent unless the user actively triggers that specific action (ask a question, scan a receipt, import a statement, run money-flow analysis).
- **Privacy blur** and **idle auto-sign-out** (see §3) as defense-in-depth for shared/unattended screens.
- Full user-facing detail: the in-app **Privacy** (`app/privacy`) and **AI Transparency** (`app/ai-transparency`) pages.

## 5. AI features

All AI capability is implemented in `src/lib/ai.ts` using Google's Gemini API (`gemini-flash-latest`, text + vision), gated behind `GOOGLE_AI_API_KEY` (`isAiConfigured()`). Every function is called on-demand from a specific user action — nothing runs automatically in the background or on a schedule.

| Function | Used by | What it does |
|---|---|---|
| `askAboutHouseholdData` | `POST /api/assistant/ask` | Answers a plain-English question, routed to either the household's own JSON data (spending questions) or a static app-feature guide (`src/data/helpGuide.ts`, "how do I…" questions), never inventing data or features outside what's provided. |
| `analyzeReceiptImage` | `POST /api/assistant/scan-receipt` | Vision extraction of vendor, amount, currency, date, billing-cycle guess, category guess, and paid status from a bill/receipt photo — also attempts to match it against the household's existing bill names to avoid duplicates. |
| `analyzeStatementDocument` | `POST /api/statements/extract` | Vision/document extraction of every transaction row (date, description, amount, direction) plus account-level details (bank name, account holder, account number, sort code/IBAN, statement period, opening/closing balance) from a PDF or photo statement — the non-CSV import path. |
| `draftVendorEmail` | `POST /api/expenses/[id]/draft-email` | Drafts a short negotiate/cancel/renewal-terms email for a given bill; always returned to the human for review, never sent automatically (`send-vendor-email` is a separate, explicit step). |
| `analyzeMoneyFlow` | `POST /api/insights/money-flow` | Reviews accounts, transfers, goals, and recurring bills/income to surface idle cash, direct-debit timing risk, consolidation opportunities, and savings suggestions — at most 5 insights, grounded only in the data provided. |

All prompts explicitly instruct the model to use **only** the supplied JSON context and to avoid inventing data, and all responses are parsed defensively (JSON-shape validated, unknown/invalid enum values coerced to a safe default) before being trusted.

## 6. API reference

All routes live under `app/api/`, are household-scoped via the guard helpers in §3, and return `{ status: 'error', message }` on failure.

| Route | Purpose |
|---|---|
| `auth/send-code`, `auth/verify-code`, `auth/logout`, `auth/me` | Passwordless sign-in flow and current-session lookup |
| `users` | Household member management (admin) — edit role/name, remove; adding a new member goes through `workspace/invite` instead (single canonical path, used by both the Admin tab and the Share modal) |
| `workspace`, `workspace/invite`, `workspace/join` | Household workspace info; `invite` upserts-by-email (refuses to reassign an email already in a different household) and sends a real email when configured; `join` is intentionally disabled (410) — invite-only, no self-service join |
| `expenses`, `expenses/[id]` | CRUD for recurring/one-off bills; creating a one-off (`once`-cycle) expense runs a soft cross-table duplicate check (see §8) |
| `expenses/[id]/draft-email`, `expenses/[id]/send-vendor-email` | AI vendor-email drafting and sending |
| `income` | CRUD for income sources |
| `accounts`, `accounts/[id]`, `accounts/[id]/reveal` | CRUD for bank accounts/cards/loans, and on-demand decrypt-and-reveal |
| `accounts/[id]/compare-statement` | Server-side account number/sort code/IBAN/BIC match check for ONE account against a statement, without exposing the decrypted value — confirms whichever account the user has already picked |
| `accounts/match-statement` | Cross-references the same four fields against EVERY account in the household, returning ranked candidates so the import flow can auto-select (or suggest) the right account before the user picks one |
| `transfers` | CRUD for the Flow money-movement ledger; creating a standalone (not linked to a recurring Expense/Income) transfer runs the same soft duplicate check |
| `goals` | CRUD for savings goals |
| `categories`, `categories/[id]` | CRUD for household-defined custom spending categories |
| `budgets` | Set/list/remove one monthly spending limit per category (upsert-by-category) |
| `statements`, `statements/[id]` | Statement import CRUD (including rename); import also runs an exact-match duplicate check against every prior import for the household, and persists opening/closing balance + statement period when supplied (PDF/photo imports only) |
| `statements/[id]/undo` | `GET` previews (record counts), `POST` executes — reverses an import as a unit, deleting every `Expense`/`Transfer` it created plus the import itself, distinct from the plain delete route's keep-what's-logged behavior |
| `statements/extract` | AI extraction of a PDF/photo statement into transaction rows + account info |
| `statements/[id]/transactions`, `statements/[id]/transactions/[txId]/resolve` | List/manage statement rows and resolve them (confirm match, add as expense or transfer with an optional note, ignore, rename merchant) |
| `statements/[id]/transactions/group-resolve` | Resolves a whole group of same-merchant, same-amount, regularly-spaced rows as ONE recurring Expense (server re-verifies amount/spacing via `detectRecurringCycle`) — each occurrence still gets its own backdated Transfer |
| `statements/[id]/recheck` | Re-runs normalization + matching on every still-UNMATCHED row in an import against current Expenses/Transfers/MerchantAlias data — catches rows that couldn't be recognized as the same merchant at import time (e.g. a bank format `normalizeDescription` didn't handle well), and best-effort repairs a MerchantAlias pattern baked from a since-corrected normalizedDescription |
| `insights/summary`, `insights/money-flow` | Rule-based savings-opportunity summary, and on-demand AI money-flow analysis |
| `reports/transactions` | The full real Transfer ledger for a period (linked or not) — the shared data source every Reports-tab view aggregates client-side from, unlike `/api/history` (powers the Overview trend chart) which only sees transfers linked to a tracked Expense/Income |
| `assistant/ask`, `assistant/scan-receipt` | AI Q&A and AI receipt/bill scanning |
| `exchange-rate` | Live currency conversion for the one-off receipt-scan flow (ECB daily rates) |
| `exchange-rate-cache` | Returns the cached EUR-base rate for every supported currency, refreshing from the same ECB-backed source first if stale (>24h) — powers every ongoing conversion app-wide |
| `admin/backup` | Full household snapshot/restore (admin) — Account, Goal, Expense, Income and Transfer rows, with cross-reference remapping on restore (see §2 data model note) |
| `admin/audit-log` | Lists the household's 50 most recent audit-log entries (admin) — deletions, backup restores, member removal, role changes |
| `cron/reminders` | Scheduled job: emails the household at 30/14/7 days before a contract end date |
| `cron/backup` | Scheduled job: creates an automatic snapshot for every household daily and prunes each household's automatic snapshots to the most recent 14 |

## 7. Frontend structure

- **`app/`** — Next.js App Router pages: the main app shell, plus standalone pages for `guide` (in-app user guide), `privacy`, `terms`, and `ai-transparency`.
- **`src/components/`** — one component per feature area (e.g. `AccountsSection`, `StatementImportModal`, `StatementsSection`, `MoneyMap`, `GoalsSection`, `AssistantBox`, `OptimizationInsights`, `AdminSection`), plus shared modals (`ExpenseModal`, `TransferModal`, `GoalModal`, `AccountModal`, `ScanReceiptModal`) and chrome (`Navbar`, `PrivacyBlurOverlay`, `HelpGuideModal`, `ChangelogModal`).
- **`src/hooks/`** — shared client-side hooks.
- **`src/lib/`** — server-only logic: `auth.ts`, `crypto.ts`, `prisma.ts`, `ai.ts`, `billing.ts` (billing-cycle math), `statementMatching.ts` (statement-to-bill matching/scoring, duplicate detection, recurring-cycle detection), `mail.ts` (Resend integration), `errors.ts`.
- **`src/services/storage.ts`** — client-side persistence helpers (e.g. cached profile for instant greeting on return visits).
- **`src/data/`** — static/shared reference data: `categories.ts` (built-in category definitions), `presets.ts` (one-click bill catalog), `helpGuide.ts` (structured content powering both the in-app Help guide and the AI's "how do I…" answers), `changelog.ts` (in-app version history).
- **`src/types/`** and **`src/utils/`** — shared TypeScript types and utility functions.

## 8. Feature reference

A structured inventory of user-facing functionality (see [`user-guide.md`](./user-guide.md) for the narrative walkthrough):

- **Passwordless authentication** — 6-digit email codes, 30-day sliding-expiration sessions, 30-minute idle auto-sign-out.
- **Household workspaces** — shared ledger per household; invite-only via a specific email (no self-service join/shareable link — see the Household model note in §2); `Admin` / `Member` / `Backup Admin` roles (`Backup Admin` carries identical permissions to `Admin` today — see the User model note in §2); a household can never be left without at least one Admin.
- **Activity log** — a plain, reverse-chronological trail of destructive/identity-affecting actions (deletions, backup restores, member removal, role changes), visible to admins under Admin → Recent activity. Not a full edit history.
- **Spending ledger** — recurring and one-off bills across built-in categories (streaming, AI/tech tools, utilities, education, insurance/motor tax, mortgage/loans/big purchases) plus household-defined **custom categories**; one-click **Catalog** presets; usage-rating-based cancellation candidates; pause/resume; contract-renewal badges and automated 30/14/7-day reminder emails; AI-drafted vendor emails (negotiate/cancel/ask), always human-reviewed before sending; partial reimbursement/claim tracking (e.g. a health-insurance claim) — spend totals count the full amount until it's received, then just the net cost, everywhere the app totals spend; a one-off (`once`-cycle) cost counts in full toward those same totals in the calendar month it's actually dated, then drops out in every later month (a recurring bill's steady-state rate is unaffected by its own date, by contrast).
- **Income tracking** — recurring/one-off income with a `nextPayDate` that auto-rolls forward, linked to a deposit account.
- **Bills calendar** — a 31-day renewal view with 7-day urgency indicators.
- **Accounts** — bank accounts, cards, and loans with encrypted sensitive fields (§4), loan amortization fields, manually-entered balance/as-of date, and reveal-on-demand. Overview shows a net-worth stat tile (assets minus credit cards/loans, second-layer-blurred like "Left after bills") once any account has a balance set.
- **Flow (money journey ledger)** — a dated, real transfer ledger (income landing, inter-account transfers, outgoing payments), optionally linked to a recurring Expense/Income record.
- **Cross-table duplicate guard** (`src/lib/duplicateGuard.ts`) — a soft, non-blocking check run on new one-off Expenses and standalone Transfers: same account (when known), same amount/currency, within a ±2 day tolerance, checked against both tables regardless of which one is being written to. Surfaced as a dismissible banner, never a hard block. Deliberately scoped to fresh manual/receipt-scan entry only — statement-import resolution already has its own, separate confidence-scored matching system (§8's Statement imports) and isn't touched by this check, to avoid two overlapping duplicate signals on the same screen.
- **Statement imports** — CSV, PDF, or photo/screenshot upload; AI extraction of transactions and account details (account number, sort code, IBAN, BIC/SWIFT, holder, statement period, balances) for non-CSV formats; cross-references those details against every account in the household (`src/lib/accountMatching.ts`) to auto-select an unambiguous match or suggest candidates, then confirms/flags mismatches per field against whichever account is picked; inline "add a new account" during import, carrying over every extracted field (encrypted); confidence-scored auto-suggested matching against bills/transfers with a learned `MerchantAlias` system; equal-weighted confirm/correct UI (never nudges toward a wrong "confirm"); merchant renaming (nickname propagates to all past/future rows); bulk "add all as expense" per merchant group; import renaming; non-destructive dialog dismissal; an exact-match duplicate guard against every prior import (own `DUPLICATE` status, reversible); an optional note on "Add as expense"/"Log as transfer"; an always-visible Overview banner (also shown with zero household data yet, not just after 30+ days without an import) that opens the import modal directly in one click; sortable review list (date/amount/merchant/status); detecting a same-amount, regularly-spaced group as one recurring bill (with per-occurrence backdated Transfers) instead of N one-offs; a "Recheck matches" action that re-normalizes and re-matches every unresolved row, catching up anything that couldn't be grouped/matched/renamed at import time; repeat-merchant groups auto-collapse on load once a statement has several of them (≥4), with a manual "Collapse/Expand all" toggle on top; balance reconciliation on PDF/photo imports (opening/closing balance persisted, checked against the sum of logged rows, surfaced as a plain "N rows imported, balance reconciles" or "…, €X unaccounted for" line); "Undo this import" (distinct from plain delete) reverses an import as a unit, including bills/transfers already logged from it.
- **Goals** — savings targets with progress bars, optional account link, optional link to a recurring Expense for goal-funded periodic bills, and an equal-payments split calculator.
- **Planned expenses** — future/not-yet-required costs that don't affect any totals or insights until explicitly activated; due-soon badges; optional goal linking.
- **Budgets** — an optional monthly spending limit per category (built-in or custom), shown as a progress bar against that category's current monthly-equivalent spend on the Spending → All spending view; categories with no limit set show no bar. Deliberately lightweight: one static limit, no rollover of unused amounts, no history/trend over time, no per-member budgets.
- **Money Map** — a node-graph visualization of real money flow (actual, from Transfers) or a projected monthly view (from recurring Expenses/Income), filterable by time window.
- **Insights** — an on-demand AI money-flow analysis (idle cash, timing risk, consolidation, savings) and a separate rule-based "what could we save" breakdown (annual-billing switches, low-usage subscription flags, running "already saving" total) across 1/12/36/60-month horizons.
- **Reports** — a dedicated tab with four views (Trends, Category & Vendor, Timeline, Insights) over a selectable period (1/3/6/12 months, all time), all aggregated client-side (`src/utils/reports.ts`) from one endpoint (`GET /api/reports/transactions`) built on the *complete* Transfer ledger rather than only transfers linked to a tracked Expense/Income — a genuine accuracy fix over the Overview trend chart's narrower `/api/history` data. Every tabular report exports to CSV (`src/utils/reportExport.ts`); a print stylesheet (`@media print` in `app/globals.css`, hides `.ha-navbar`/`.ha-print-hide`) makes the browser's native Print → Save as PDF produce a clean report with no extra dependency.
- **AI assistant** — plain-English Q&A over the household's own data or the app's own feature set, plus AI bill/receipt scanning with duplicate-bill matching and one-click foreign-currency conversion.
- **Multi-currency** — EUR-standardized ledger with conversion for GBP/USD/CAD/AUD/JPY. The one-off receipt-scan conversion always uses a live ECB rate fetched on the spot (§8's receipt scanning). Every ongoing figure (Overview, Budgets, category charts, etc.) uses a shared rate cache (`ExchangeRate` model, `GET /api/exchange-rate-cache`) that lazily refreshes from the same ECB-backed source whenever it's missing or older than 24h — genuinely live, not the one-time hardcoded fallback values in `src/utils/currencies.ts` (which only apply until the first successful fetch, or if the upstream service is ever unreachable).
- **Data export & backup** — CSV/JSON bill export for any user (a portable copy, not a restore point); full household snapshot/restore (accounts, goals, bills, income, transfers) for admins, with cross-reference remapping on restore; an automatic daily snapshot per household (most recent 14 kept) so a real backup exists without anyone triggering one manually.
- **Privacy controls** — auto-blur after inactivity/tab blur with a manual toggle, a second independent per-figure blur on the highest-sensitivity amounts (Overview's "Left after bills" and "Net worth", every Income figure) that stays blurred regardless of the screen-wide toggle and unblurs one figure at a time (client-side only, resets on reload — see §7's `useSensitiveReveal`), and the encryption/AI-isolation model described in §4–§5.

## 9. Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection string (Prisma Client) |
| `DIRECT_URL` | Yes | Direct (non-pooled) PostgreSQL connection string (Prisma migrations) |
| `CREDENTIALS_ENCRYPTION_KEY` | Yes, to store account credentials | Base64-encoded 32-byte AES-256-GCM key (`openssl rand -base64 32`) |
| `GOOGLE_AI_API_KEY` | Yes, for any AI feature | Gemini API key |
| `RESEND_API_KEY` (and related Resend config) | Yes, to send emails | Login codes, invites, renewal reminders |
| `NEXT_PUBLIC_APP_URL` | Optional | Base URL used in emails/links (defaults to localhost in dev) |

## 10. Local development & deployment

```bash
npm install
npm run db:push && npx prisma generate   # first-time setup against a fresh database only
npm run db:seed        # seeds an initial workspace + admin account
npm run dev -- -p 5174
```

```bash
npm run build           # prisma migrate deploy && prisma generate && next build
npm start                # production server
npm run lint             # eslint
npm run test             # vitest — unit coverage on billing.ts, statementMatching.ts, crypto.ts
```

**Schema changes** go through Prisma Migrate, tracked under `prisma/migrations/` (committed to git): run `npm run db:migrate` (`prisma migrate dev --name <description>`) to generate and apply a new migration locally, then commit the generated file alongside the schema change. `npm run build`'s `prisma migrate deploy` step applies any pending migrations automatically on every deploy. `db:push` (schema-diff against the live database, no history, can drop columns silently) is reserved for first-time setup against a fresh database only — not for changes to an existing one.

Deployable to Vercel, Netlify, or any Node.js/Docker host — see the root [`README.md`](../README.md) for the quick-start version of these steps.
