import { LegalPageLayout } from '@/src/components/LegalPageLayout';
import { APP_VERSION } from '@/src/data/changelog';

export const metadata = {
  title: 'Technical Overview — Tally',
};

export default function TechnicalOverviewPage() {
  return (
    <LegalPageLayout title="Technical overview" lastUpdated={`v${APP_VERSION}`}>
      <p>
        A complete technical reference for the Tally codebase: architecture, data model, API
        surface, security model, and the full feature set. For the end-user walkthrough, see the{' '}
        <a href="/guide">User Guide</a>.
      </p>

      <h2>1. Architecture</h2>
      <p>
        Tally is a server-rendered, full-stack <strong>Next.js App Router</strong> application —
        there is no separate backend service. All business logic lives in Next.js Route Handlers
        under <code>app/api/</code>, called from client components via <code>fetch</code>.
      </p>
      <table>
        <thead>
          <tr><th>Layer</th><th>Technology</th></tr>
        </thead>
        <tbody>
          <tr><td>Framework</td><td>Next.js 15 (App Router), React 19, TypeScript</td></tr>
          <tr><td>Database</td><td>PostgreSQL</td></tr>
          <tr><td>ORM</td><td>Prisma (<code>@prisma/client</code>)</td></tr>
          <tr><td>Auth</td><td>Passwordless 6-digit OTP, first-party session cookies (no third-party auth provider)</td></tr>
          <tr><td>AI</td><td>Google Gemini (<code>@google/generative-ai</code>, model <code>gemini-flash-latest</code>) — text and vision</td></tr>
          <tr><td>Email</td><td>Resend</td></tr>
          <tr><td>Styling</td><td>Hand-rolled responsive household UI and CSS design tokens (<code>--ha-*</code>), with no CSS framework</td></tr>
          <tr><td>Icons</td><td>Lucide React</td></tr>
          <tr><td>Deployment target</td><td>Vercel, Netlify, or a Node.js/Docker host</td></tr>
        </tbody>
      </table>
      <p>
        Requests flow: <strong>Client component</strong> → <code>fetch(&apos;/api/...&apos;)</code> →{' '}
        <strong>Route Handler</strong> (<code>app/api/**/route.ts</code>) →{' '}
        <code>requireUser</code>/<code>requireHouseholdUser</code>/<code>requireAdmin</code> (
        <code>src/lib/auth.ts</code>) → <strong>Prisma</strong> (<code>src/lib/prisma.ts</code>) →{' '}
        <strong>PostgreSQL</strong>.
      </p>
      <p>
        <code>middleware.ts</code> runs on the Edge runtime on every request (excluding static
        assets) purely to refresh the session cookie&apos;s <code>maxAge</code>, keeping the
        browser cookie&apos;s lifetime in step with the sliding-expiration session stored in the
        database (see §3). It deliberately avoids importing Prisma, since Prisma&apos;s Node
        runtime isn&apos;t supported on the Edge.
      </p>

      <h2>2. Data model</h2>
      <p>
        Defined in <code>prisma/schema.prisma</code>. Every domain model is scoped to a{' '}
        <code>Household</code> (multi-tenant by household, not by individual user), and most also
        record <code>createdById</code> for attribution.
      </p>
      <ul>
        <li><strong>Household</strong> — the tenant boundary. Has a unique <code>inviteCode</code> column, but self-service joining via it is intentionally disabled (<code>POST /api/workspace/join</code> unconditionally returns 410) — the app is invite-only, and the only way in is an admin inviting a specific email via <code>POST /api/workspace/invite</code>.</li>
        <li><strong>User</strong> — belongs to at most one household; <code>role</code> is <code>ADMIN</code>, <code>MEMBER</code>, or <code>BACKUP_ADMIN</code>. <code>BACKUP_ADMIN</code> is intentionally permission-identical to <code>ADMIN</code> (<code>requireAdmin()</code> passes for both) — a separate role only so it&apos;s clear who the &quot;usual&quot; admin is, not a restricted tier. The household&apos;s minimum-one-admin protection currently only counts <code>ADMIN</code> rows, so a household could in principle end up with only a <code>BACKUP_ADMIN</code> as its sole admin — harmless functionally since that role already has full admin rights.</li>
        <li><strong>Session</strong> — opaque token, <code>expiresAt</code>, sliding expiration (see §3).</li>
        <li><strong>VerificationToken</strong> — short-lived 6-digit login codes with an <code>attempts</code> counter.</li>
        <li><strong>Expense</strong> — a recurring or one-off bill/subscription (<code>billingCycle</code>: weekly / monthly / quarterly / termly / annual / once), with category, payment account link, optional linked savings Goal, contract end date, usage rating, and pause/active state. <code>originalAmount</code>/<code>originalCurrency</code>/<code>exchangeRate</code>/<code>rateDate</code> are set only when a receipt scan applied a live currency conversion — preserve what was actually paid alongside the converted <code>amount</code>/<code>currency</code>, informational only (never used in totals). <code>reimbursementExpected</code>/<code>reimbursementReceived</code>/<code>reimbursementReceivedDate</code> track a partial refund against this expense (e.g. a health-insurance claim). Every &quot;this month&quot; spend total/budget/category-breakdown in the app (client and server) reads the amount through a shared <code>getMonthlyContribution()</code> helper (<code>src/utils/calculations.ts</code>) instead of the raw field: a recurring bill still contributes its steady-state monthly-equivalent rate every month regardless of its own date, but a one-off (<code>once</code>-cycle) cost contributes its full (reimbursement-netted) amount only in the calendar month it&apos;s actually dated (<code>nextRenewalDate</code> doubles as &quot;payment date&quot; for a one-off) — nothing in any other month. Forward-looking &quot;what&apos;s due&quot; figures, Money Map&apos;s <em>projected</em> (recurring-rate) view, and a single row&apos;s own displayed amount are deliberately left reading the raw amount/the older date-independent <code>getMonthlyEquivalent()</code>, unaffected either way.</li>
        <li><strong>Income</strong> — recurring or one-off income, with frequency, optional <code>nextPayDate</code>, and a linked deposit Account. <code>amount</code> is the typical/expected figure, used as a fallback estimate — for a month where a real linked Transfer exists (from marking received or a statement&apos;s &quot;Link to income&quot;), <code>getIncomeMonthlyContribution()</code> (<code>src/utils/calculations.ts</code>) uses that real, possibly-fluctuating figure instead. <code>isReceivedThisCycle</code>/<code>lastReceivedAt</code> are a single flag/timestamp per record — un-marking received deletes that month&apos;s real linked Transfer(s) too, so re-confirming with a corrected amount doesn&apos;t double-count.</li>
        <li><strong>Account</strong> — a bank account, card, or loan. Sensitive fields (<code>accountNumberEnc</code>, <code>routingNumberEnc</code>, <code>loginUsernameEnc</code>, <code>loginPasswordEnc</code>, <code>loginUrlEnc</code>, <code>securityNotesEnc</code>) are stored AES-256-GCM encrypted at the application layer — see §4. Loan-specific fields (<code>originalAmount</code>, <code>interestRate</code>, <code>termMonths</code>, <code>payoffDate</code>) are plaintext, as they aren&apos;t secrets on their own. <code>balance</code>/<code>balanceAsOf</code> (also plaintext) are manually entered — no live bank sync — and power the Overview net-worth figure (§8: assets minus <code>CREDIT_CARD</code>/<code>LOAN</code> types).</li>
        <li><strong>Transfer</strong> — a single, dated real money movement (&quot;money journey&quot; ledger). Either side (<code>fromAccountId</code>/<code>toAccountId</code>) can be null to represent money crossing the household boundary, with a free-text <code>externalLabel</code>. Optionally linked to the recurring Expense/Income record it corresponds to.</li>
        <li><strong>Goal</strong> — a savings target, optionally linked to an Account and/or to one or more Expenses (for goals that fund a periodic bill, e.g. an annual subscription paid via monthly top-ups).</li>
        <li><strong>StatementImport</strong> — a single upload of a bank/card statement, optionally scoped to one Account (so matching doesn&apos;t cross accounts). <code>openingBalance</code>/<code>closingBalance</code>/<code>statementPeriod</code> are populated only for PDF/photo imports and power a client-side reconciliation check — <code>closingBalance - openingBalance</code> against the sum of every logged row&apos;s signed amount for that import, regardless of status. Every Expense/Transfer created via resolving one of its rows is stamped with <code>statementImportId</code> (<code>onDelete: SetNull</code>), letting <code>POST /api/statements/[id]/undo</code> remove an entire import&apos;s effects — including already-logged bills/transfers — as a unit, distinct from the plain delete route which intentionally keeps those records.</li>
        <li><strong>StatementTransaction</strong> — one normalized row from an import: <code>status</code> (UNMATCHED / MATCHED / IGNORED / DUPLICATE), <code>matchConfidence</code>, optional links to a matched Expense/Transfer, a learned <code>suggestedCategory</code>, and a <code>vendorName</code> nickname. <code>DUPLICATE</code> is assigned at import time, not by the matching pipeline — see §8.</li>
        <li><strong>MerchantAlias</strong> — a learned <code>(householdId, pattern)</code> → <code>vendorName</code>/<code>category</code> mapping, built up as the household confirms statement matches, so cryptic bank descriptions (&quot;IEPROS&quot;) get recognized and auto-categorized automatically next time. <code>matchCount</code> tracks how many times it&apos;s been reinforced.</li>
        <li><strong>Category</strong> — household-defined custom spending categories (in addition to the fixed built-in set in <code>src/data/categories.ts</code>), each with its own icon/colour, unique per household by name.</li>
        <li><strong>ExchangeRate</strong> — global (not household-scoped) cache of the current EUR-base rate for each non-EUR currency Tally supports, one row per currency, refreshed lazily whenever a row is missing or older than 24h — see §8&apos;s multi-currency note.</li>
        <li><strong>Budget</strong> — one static monthly limit per category (built-in or custom, matched by the same id used everywhere else), <code>@@unique([householdId, category])</code> so each household has at most one budget per category. Deliberately an MVP: no rollover, no history, no per-member split — see §8.</li>
        <li><strong>AuditLog</strong> — a plain, append-only trail for destructive and identity-affecting actions only (deletions of Expense/Account/Goal/Transfer/Income, backup restores, member removal, role changes) — deliberately not full field-level diffing on every edit. <code>entityLabel</code> is a short human-readable snapshot taken at the time of the action, written via a single <code>logAudit()</code> helper called from each affected route.</li>
        <li><strong>DatabaseBackup</strong> — a stored full-household JSON snapshot, created by admins or by the daily <code>cron/backup</code> job (<code>isAutomatic</code> distinguishes the two; automatic snapshots are pruned to the most recent 14 per household, manual ones never auto-pruned). <code>payloadJson</code> holds <code>{'{ accounts, goals, expenses, incomes, transfers }'}</code> (each a plain array of that table&apos;s rows, Account rows including their <code>*Enc</code> ciphertext as-is). Restore deletes the household&apos;s rows across all five tables, then recreates them in dependency order (Account → Goal → Expense → Income → Transfer), building an old-id → new-id map at each step so cross-references (an Expense&apos;s <code>paymentAccountId</code>, a Transfer&apos;s <code>linkedExpenseId</code>, etc.) resolve to the newly-created rows rather than the snapshot&apos;s now-gone ids. Older backups predating this shape have <code>payloadJson</code> as a bare array of Expense rows and still restore correctly via a legacy branch.</li>
      </ul>
      <p>Nearly every model indexes <code>householdId</code>, since virtually every query is household-scoped.</p>

      <h2>3. Authentication &amp; sessions</h2>
      <p>
        Tally uses <strong>passwordless, 6-digit magic-code sign-in</strong> — there are no stored
        passwords anywhere.
      </p>
      <ul>
        <li><code>POST /api/auth/send-code</code> — issues a VerificationToken (6-digit code from <code>crypto.randomInt</code>, 15-minute expiry, stored only as a keyed digest — never in plain text, never logged) for the given email and emails it via Resend; fails loudly rather than falling back to logging the code if email isn&apos;t configured.</li>
        <li><code>POST /api/auth/verify-code</code> — checks the code against its digest, atomically enforcing a 5-attempts cap against brute-forcing (race-safe under concurrent guesses) and atomically consuming a correct code so two concurrent requests can&apos;t both mint a session, creates a Session row, and sets an httpOnly <code>tally_session</code> cookie. Both routes apply a per-IP throttle.</li>
        <li><code>getSessionUser()</code> (<code>src/lib/auth.ts</code>) is the single source of truth for &quot;who is making this request&quot; on every API route — request bodies are never trusted for identity, user ID, household ID, or role.</li>
      </ul>
      <p>
        <strong>Sliding expiration</strong>: sessions last 30 days from creation, but{' '}
        <code>getSessionUser()</code> transparently extends (&quot;touches&quot;) a session back
        out to a fresh 30 days once its remaining life drops under ~25 days.{' '}
        <code>middleware.ts</code> mirrors this by refreshing the cookie&apos;s own{' '}
        <code>maxAge</code> on every request, so the browser cookie and the DB session never drift
        out of sync — anyone who opens the app at least once every ~25–30 days stays signed in
        indefinitely without re-entering a code.
      </p>
      <p>Three composable guard helpers wrap every protected route handler:</p>
      <ul>
        <li><code>requireUser()</code> — any authenticated user.</li>
        <li><code>requireHouseholdUser()</code> — authenticated <strong>and</strong> belongs to a household.</li>
        <li><code>requireAdmin()</code> — authenticated, in a household, and role is ADMIN or BACKUP_ADMIN.</li>
      </ul>
      <p>
        Separately from the 30-day session, the client also enforces a{' '}
        <strong>30-minute idle auto-sign-out</strong> in an open tab, and a{' '}
        <strong>90-second privacy blur</strong> that hides on-screen figures after inactivity or
        when the tab loses focus — both independent of the underlying session lifetime.
      </p>

      <h2>4. Security &amp; encryption</h2>
      <ul>
        <li>
          <strong>Field-level encryption</strong> (<code>src/lib/crypto.ts</code>): sensitive
          Account fields are encrypted with <strong>AES-256-GCM</strong> before being written to
          the database — a random 12-byte IV per value, with the GCM auth tag appended so
          tampering/corruption is detectable on decrypt. Stored format:{' '}
          <code>base64(iv):base64(authTag):base64(ciphertext)</code>.
        </li>
        <li>
          The key comes from <code>CREDENTIALS_ENCRYPTION_KEY</code> (32 raw bytes,
          base64-encoded — generate with <code>openssl rand -base64 32</code>). If unset,
          encryption calls throw rather than silently falling back to plaintext.
        </li>
        <li>
          Encrypted fields are <strong>never selected</strong> in list/summary API responses —
          only decrypted on an explicit &quot;reveal&quot; action (
          <code>POST /api/accounts/[id]/reveal</code>), or for statement-import account
          verification, via an on-the-fly comparison (<code>src/lib/accountMatching.ts</code>,
          shared by both statement-matching endpoints below) that returns only a match/mismatch
          signal per field, never the decrypted value.
        </li>
        <li><code>npm run rotate-key</code> (<code>scripts/rotate-encryption-key.ts</code>) re-encrypts all sensitive fields under a new key.</li>
        <li><strong>Passwordless auth</strong> removes password-database risk entirely (see §3).</li>
        <li><strong>httpOnly, secure, sameSite=lax session cookie</strong> — inaccessible to client-side scripts, mitigating XSS-based session theft.</li>
        <li><strong>Household-scoped queries everywhere</strong> — every Prisma query for domain data filters by the requester&apos;s own householdId from the session, never from client input.</li>
        <li><strong>AI data isolation</strong> — every AI call (<code>src/lib/ai.ts</code>) is passed only the requesting household&apos;s own data, assembled server-side; the model is never given cross-household context, and nothing is sent unless the user actively triggers that specific action.</li>
        <li><strong>Privacy blur</strong> and <strong>idle auto-sign-out</strong> as defense-in-depth for shared/unattended screens.</li>
      </ul>
      <p>
        Full user-facing detail: the <a href="/privacy">Privacy</a> and{' '}
        <a href="/ai-transparency">AI Transparency</a> pages.
      </p>

      <h2>5. AI features</h2>
      <p>
        All AI capability is implemented in <code>src/lib/ai.ts</code> using Google&apos;s Gemini
        API (<code>gemini-flash-latest</code>, text + vision), gated behind{' '}
        <code>GOOGLE_AI_API_KEY</code>. Every function is called on-demand from a specific user
        action — nothing runs automatically in the background or on a schedule.
      </p>
      <table>
        <thead>
          <tr><th>Function</th><th>Used by</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>askAboutHouseholdData</code></td>
            <td><code>POST /api/assistant/ask</code></td>
            <td>Answers a plain-English question, routed to either the household&apos;s own JSON data or a static app-feature guide, never inventing data or features outside what&apos;s provided.</td>
          </tr>
          <tr>
            <td><code>analyzeReceiptImage</code></td>
            <td><code>POST /api/assistant/scan-receipt</code></td>
            <td>Vision extraction of vendor, amount, currency, date, billing-cycle guess, category guess, and paid status from a bill/receipt photo — also matches against existing bill names to avoid duplicates.</td>
          </tr>
          <tr>
            <td><code>analyzeStatementDocument</code></td>
            <td><code>POST /api/statements/extract</code></td>
            <td>Vision/document extraction of every transaction row plus account-level details (bank name, account holder, account number, sort code/IBAN, statement period, balances) from a PDF or photo statement.</td>
          </tr>
          <tr>
            <td><code>draftVendorEmail</code></td>
            <td><code>POST /api/expenses/[id]/draft-email</code></td>
            <td>Drafts a short negotiate/cancel/renewal-terms email for a given bill; always returned to the human for review, never sent automatically.</td>
          </tr>
          <tr>
            <td><code>analyzeMoneyFlow</code></td>
            <td><code>POST /api/insights/money-flow</code></td>
            <td>Reviews accounts, transfers, goals, and recurring bills/income to surface idle cash, timing risk, consolidation opportunities, and savings suggestions.</td>
          </tr>
        </tbody>
      </table>
      <p>
        All prompts explicitly instruct the model to use <strong>only</strong> the supplied JSON
        context and to avoid inventing data, and all responses are parsed defensively before being
        trusted.
      </p>

      <h2>6. API reference</h2>
      <p>
        All routes live under <code>app/api/</code>, are household-scoped via the guard helpers in
        §3, and return <code>{'{ status: \'error\', message }'}</code> on failure.
      </p>
      <table>
        <thead>
          <tr><th>Route</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td><code>auth/send-code</code>, <code>auth/verify-code</code>, <code>auth/logout</code>, <code>auth/me</code></td><td>Passwordless sign-in flow and current-session lookup</td></tr>
          <tr><td><code>users</code></td><td>Household member management (admin) — edit role/name, remove; adding a new member goes through <code>workspace/invite</code> instead (single canonical path, used by both the Admin tab and the Share modal)</td></tr>
          <tr><td><code>workspace</code>, <code>workspace/invite</code>, <code>workspace/join</code></td><td>Household workspace info; <code>invite</code> upserts-by-email (refuses to reassign an email already in a different household) and sends a real email when configured; <code>join</code> is intentionally disabled (410) — invite-only, no self-service join</td></tr>
          <tr><td><code>expenses</code>, <code>expenses/[id]</code></td><td>CRUD for recurring/one-off bills; creating a one-off (<code>once</code>-cycle) expense runs a soft cross-table duplicate check (see §8)</td></tr>
          <tr><td><code>expenses/[id]/draft-email</code>, <code>expenses/[id]/send-vendor-email</code></td><td>AI vendor-email drafting and sending</td></tr>
          <tr><td><code>income</code></td><td>CRUD for income sources; marking <code>isReceivedThisCycle</code> true logs a real Transfer at the actual received amount/date when supplied, falling back to the usual amount/today otherwise — marking it back false deletes that month&apos;s linked Transfer(s)</td></tr>
          <tr><td><code>accounts</code>, <code>accounts/[id]</code>, <code>accounts/[id]/reveal</code></td><td>CRUD for bank accounts/cards/loans, and on-demand decrypt-and-reveal</td></tr>
          <tr><td><code>accounts/[id]/compare-statement</code></td><td>Server-side account number/sort code/IBAN/BIC match check for ONE account against a statement, without exposing the decrypted value — confirms whichever account the user has already picked</td></tr>
          <tr><td><code>accounts/match-statement</code></td><td>Cross-references the same four fields against EVERY account in the household, returning ranked candidates so the import flow can auto-select (or suggest) the right account before the user picks one</td></tr>
          <tr><td><code>transfers</code></td><td>CRUD for the Flow money-movement ledger; creating a standalone (not linked to a recurring Expense/Income) transfer runs the same soft duplicate check</td></tr>
          <tr><td><code>goals</code></td><td>CRUD for savings goals</td></tr>
          <tr><td><code>categories</code>, <code>categories/[id]</code></td><td>CRUD for household-defined custom spending categories</td></tr>
          <tr><td><code>budgets</code></td><td>Set/list/remove one monthly spending limit per category (upsert-by-category)</td></tr>
          <tr><td><code>statements</code>, <code>statements/[id]</code></td><td>Statement import CRUD (including rename); import also runs an exact-match duplicate check against every prior import for the household, and persists opening/closing balance + statement period when supplied (PDF/photo imports only)</td></tr>
          <tr><td><code>statements/[id]/undo</code></td><td><code>GET</code> previews (record counts), <code>POST</code> executes — reverses an import as a unit, deleting every Expense/Transfer it created plus the import itself, distinct from the plain delete route&apos;s keep-what&apos;s-logged behavior</td></tr>
          <tr><td><code>statements/extract</code></td><td>AI extraction of a PDF/photo statement into transaction rows + account info</td></tr>
          <tr><td><code>statements/[id]/transactions</code>, <code>statements/[id]/transactions/[txId]/resolve</code></td><td>List/manage statement rows and resolve them (confirm match, add as expense or transfer with an optional note, link to income for a money-in row, ignore, rename merchant)</td></tr>
          <tr><td><code>statements/[id]/transactions/group-resolve</code></td><td>Resolves a whole group of same-merchant, same-amount, regularly-spaced rows as ONE recurring Expense (server re-verifies amount/spacing via <code>detectRecurringCycle</code>) — each occurrence still gets its own backdated Transfer</td></tr>
          <tr><td><code>statements/[id]/recheck</code></td><td>Re-runs normalization + matching on every still-UNMATCHED row in an import against current Expenses/Transfers/MerchantAlias data — catches rows that couldn&apos;t be recognized as the same merchant at import time (e.g. a bank format normalizeDescription didn&apos;t handle well), and best-effort repairs a MerchantAlias pattern baked from a since-corrected normalizedDescription</td></tr>
          <tr><td><code>insights/summary</code>, <code>insights/money-flow</code></td><td>Rule-based savings-opportunity summary, and on-demand AI money-flow analysis</td></tr>
          <tr><td><code>reports/transactions</code></td><td>The full real Transfer ledger for a period (linked or not) — the shared data source every Reports-tab view aggregates client-side from, unlike <code>/api/history</code> (powers the Overview trend chart) which only sees transfers linked to a tracked Expense/Income</td></tr>
          <tr><td><code>assistant/ask</code>, <code>assistant/scan-receipt</code></td><td>AI Q&amp;A and AI receipt/bill scanning</td></tr>
          <tr><td><code>exchange-rate</code></td><td>Live currency conversion for the one-off receipt-scan flow (ECB daily rates)</td></tr>
          <tr><td><code>exchange-rate-cache</code></td><td>Returns the cached EUR-base rate for every supported currency, refreshing from the same ECB-backed source first if stale (&gt;24h) — powers every ongoing conversion app-wide</td></tr>
          <tr><td><code>admin/backup</code></td><td>Full household snapshot/restore (admin) — Account, Goal, Expense, Income and Transfer rows, with cross-reference remapping on restore (see §2 data model note)</td></tr>
          <tr><td><code>admin/audit-log</code></td><td>Lists the household&apos;s 50 most recent audit-log entries (admin) — deletions, backup restores, member removal, role changes</td></tr>
          <tr><td><code>cron/reminders</code></td><td>Scheduled job: emails the household at 30/14/7 days before a contract end date</td></tr>
          <tr><td><code>cron/backup</code></td><td>Scheduled job: creates an automatic snapshot for every household daily and prunes each household&apos;s automatic snapshots to the most recent 14</td></tr>
        </tbody>
      </table>

      <h2>7. Frontend structure</h2>
      <ul>
        <li><strong><code>app/</code></strong> — Next.js App Router pages: the main app shell, plus standalone pages for <code>guide</code>, <code>technical-overview</code>, <code>privacy</code>, <code>terms</code>, and <code>ai-transparency</code>.</li>
        <li><strong><code>src/components/</code></strong> — one component per feature area (e.g. AccountsSection, StatementImportModal, StatementsSection, MoneyMap, GoalsSection, AssistantBox, OptimizationInsights, AdminSection), plus shared modals and chrome (Navbar, PrivacyBlurOverlay, HelpGuideModal, ChangelogModal).</li>
        <li><strong><code>src/hooks/</code></strong> — shared client-side hooks.</li>
        <li><strong><code>src/lib/</code></strong> — server-only logic: <code>auth.ts</code>, <code>crypto.ts</code>, <code>prisma.ts</code>, <code>ai.ts</code>, <code>billing.ts</code> (billing-cycle math), <code>statementMatching.ts</code> (statement-to-bill matching/scoring, duplicate detection, recurring-cycle detection), <code>mail.ts</code> (Resend integration), <code>errors.ts</code>.</li>
        <li><strong><code>src/services/storage.ts</code></strong> — client-side persistence helpers.</li>
        <li><strong><code>src/data/</code></strong> — static/shared reference data: <code>categories.ts</code>, <code>presets.ts</code>, <code>helpGuide.ts</code> (structured content powering both the in-app Help guide and the AI&apos;s &quot;how do I…&quot; answers), <code>changelog.ts</code>.</li>
        <li><strong><code>src/types/</code></strong> and <strong><code>src/utils/</code></strong> — shared TypeScript types and utility functions.</li>
      </ul>

      <h2>8. Feature reference</h2>
      <p>A structured inventory of user-facing functionality (see the <a href="/guide">User Guide</a> for the narrative walkthrough):</p>
      <ul>
        <li><strong>Passwordless authentication</strong> — 6-digit email codes, 30-day sliding-expiration sessions, 30-minute idle auto-sign-out.</li>
        <li><strong>Household workspaces</strong> — shared ledger per household; invite-only via a specific email (no self-service join/shareable link — see the Household model note in §2); Admin / Member / Backup Admin roles (Backup Admin carries identical permissions to Admin today — see the User model note in §2); a household can never be left without at least one Admin.</li>
        <li><strong>Activity log</strong> — a plain, reverse-chronological trail of destructive/identity-affecting actions (deletions, backup restores, member removal, role changes), visible to admins under Admin → Recent activity. Not a full edit history.</li>
        <li><strong>Spending ledger</strong> — recurring and one-off bills across built-in categories plus household-defined custom categories; one-click Catalog presets; usage-rating-based cancellation candidates; pause/resume; contract-renewal badges and automated 30/14/7-day reminder emails; AI-drafted vendor emails, always human-reviewed before sending; partial reimbursement/claim tracking (e.g. a health-insurance claim) — spend totals count the full amount until it&apos;s received, then just the net cost, everywhere the app totals spend; a one-off (<code>once</code>-cycle) cost counts in full toward those same totals in the calendar month it&apos;s actually dated, then drops out in every later month (a recurring bill&apos;s steady-state rate is unaffected by its own date, by contrast).</li>
        <li><strong>Income tracking</strong> — recurring/one-off income with a next pay date that auto-rolls forward, linked to a deposit account; marking one received captures the actual amount and date, so a fluctuating income (e.g. salary) reconciles against what it really was — every monthly income total uses that real figure for the current month when it exists, the usual estimate otherwise.</li>
        <li><strong>Bills calendar</strong> — a 31-day renewal view with 7-day urgency indicators.</li>
        <li><strong>Accounts</strong> — bank accounts, cards, and loans with encrypted sensitive fields, loan amortization fields, manually-entered balance/as-of date, and reveal-on-demand. Overview shows a net-worth stat tile (assets minus credit cards/loans, second-layer-blurred like &quot;Left after bills&quot;) once any account has a balance set.</li>
        <li><strong>Flow (money journey ledger)</strong> — a dated, real transfer ledger, optionally linked to a recurring Expense/Income record.</li>
        <li><strong>Cross-table duplicate guard</strong> — a soft, non-blocking check run on new one-off Expenses and standalone Transfers: same account (when known), same amount/currency, within a ±2 day tolerance, checked against both tables regardless of which one is being written to. Surfaced as a dismissible banner, never a hard block. Deliberately scoped to fresh manual/receipt-scan entry only — statement-import resolution already has its own, separate confidence-scored matching system and isn&apos;t touched by this check.</li>
        <li><strong>Statement imports</strong> — CSV, PDF, or photo/screenshot upload; AI extraction of account details (account number, sort code, IBAN, BIC/SWIFT, holder, statement period, balances) for non-CSV formats; cross-references those details against every account in the household (<code>src/lib/accountMatching.ts</code>) to auto-select an unambiguous match or suggest candidates, then confirms/flags mismatches per field against whichever account is picked; inline &quot;add a new account&quot;, carrying over every extracted field (encrypted); a money-in row shows &quot;Link to income&quot; (ties it to a recorded Income at its real amount/date, marking that income received) instead of the expense-side &quot;Link to a bill&quot;/&quot;Add as expense&quot; buttons, which only a money-out row shows; confidence-scored auto-suggested matching with a learned MerchantAlias system; equal-weighted confirm/correct UI; merchant renaming; bulk &quot;add all as expense&quot;; import renaming; non-destructive dialog dismissal; an exact-match duplicate guard against every prior import (own <code>DUPLICATE</code> status, reversible); an optional note on &quot;Add as expense&quot;/&quot;Log as transfer&quot;; an always-visible Overview banner (also shown with zero household data yet, not just after 30+ days without an import) that opens the import modal directly in one click; sortable review list (date/amount/merchant/status); detecting a same-amount, regularly-spaced group as one recurring bill (with per-occurrence backdated Transfers) instead of N one-offs; a &quot;Recheck matches&quot; action that re-normalizes and re-matches every unresolved row, catching up anything that couldn&apos;t be grouped/matched/renamed at import time; repeat-merchant groups auto-collapse on load once a statement has several of them (≥4), with a manual &quot;Collapse/Expand all&quot; toggle on top; balance reconciliation on PDF/photo imports (opening/closing balance persisted, checked against the sum of logged rows, surfaced as a plain &quot;N rows imported, balance reconciles&quot; or &quot;…, €X unaccounted for&quot; line); &quot;Undo this import&quot; (distinct from plain delete) reverses an import as a unit, including bills/transfers already logged from it.</li>
        <li><strong>Goals</strong> — savings targets with progress bars, optional account link, optional link to a recurring Expense, and an equal-payments split calculator.</li>
        <li><strong>Planned expenses</strong> — future/not-yet-required costs that don&apos;t affect any totals or insights until explicitly activated; due-soon badges; optional goal linking.</li>
        <li><strong>Budgets</strong> — an optional monthly spending limit per category (built-in or custom), shown as a progress bar against that category&apos;s current monthly-equivalent spend on the Spending → All spending view; categories with no limit set show no bar. Deliberately lightweight: one static limit, no rollover of unused amounts, no history/trend over time, no per-member budgets.</li>
        <li><strong>Money Map</strong> — a node-graph visualization of real money flow or a projected monthly view, filterable by time window.</li>
        <li><strong>Insights</strong> — an on-demand AI money-flow analysis and a separate rule-based &quot;what could we save&quot; breakdown across 1/12/36/60-month horizons.</li>
        <li><strong>Reports</strong> — a dedicated tab with four views (Trends, Category &amp; Vendor, Timeline, Insights) over a selectable period (1/3/6/12 months, all time), all aggregated client-side (<code>src/utils/reports.ts</code>) from one endpoint (<code>GET /api/reports/transactions</code>) built on the <em>complete</em> Transfer ledger rather than only transfers linked to a tracked Expense/Income — a genuine accuracy fix over the Overview trend chart&apos;s narrower <code>/api/history</code> data. Every tabular report exports to CSV (<code>src/utils/reportExport.ts</code>); a print stylesheet makes the browser&apos;s native Print → Save as PDF produce a clean report with no extra dependency.</li>
        <li><strong>AI assistant</strong> — plain-English Q&amp;A over the household&apos;s own data or the app&apos;s own feature set, plus AI bill/receipt scanning with duplicate-bill matching and one-click foreign-currency conversion.</li>
        <li><strong>Multi-currency</strong> — EUR-standardized ledger with conversion for GBP/USD/CAD/AUD/JPY. The one-off receipt-scan conversion always uses a live ECB rate fetched on the spot. Every ongoing figure (Overview, Budgets, category charts, etc.) uses a shared rate cache that lazily refreshes from the same ECB-backed source whenever it&apos;s missing or older than 24h — genuinely live, not a one-time hardcoded fallback.</li>
        <li><strong>Data export &amp; backup</strong> — CSV/JSON bill export for any user (a portable copy, not a restore point); full household snapshot/restore (accounts, goals, bills, income, transfers) for admins, with cross-reference remapping on restore; an automatic daily snapshot per household (most recent 14 kept) so a real backup exists without anyone triggering one manually.</li>
        <li><strong>Privacy controls</strong> — auto-blur after inactivity/tab blur with a manual toggle, a second independent per-figure blur on the highest-sensitivity amounts (Overview&apos;s &quot;Left after bills&quot; and &quot;Net worth&quot;, every Income figure) that stays blurred regardless of the screen-wide toggle and unblurs one figure at a time (client-side only, resets on reload — see §7&apos;s <code>useSensitiveReveal</code>), and the encryption/AI-isolation model described in §4–§5.</li>
      </ul>

      <h2>9. Environment variables</h2>
      <table>
        <thead>
          <tr><th>Variable</th><th>Required</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td><code>DATABASE_URL</code></td><td>Yes</td><td>Pooled PostgreSQL connection string (Prisma Client)</td></tr>
          <tr><td><code>DIRECT_URL</code></td><td>Yes</td><td>Direct (non-pooled) PostgreSQL connection string (Prisma migrations)</td></tr>
          <tr><td><code>CREDENTIALS_ENCRYPTION_KEY</code></td><td>Yes, to store account credentials</td><td>Base64-encoded 32-byte AES-256-GCM key</td></tr>
          <tr><td><code>AUTH_SECRET</code></td><td>Recommended</td><td>Keys the digest sign-in codes are hashed with before storage — falls back to <code>CREDENTIALS_ENCRYPTION_KEY</code>, then a built-in default, so sign-in still works either way</td></tr>
          <tr><td><code>GOOGLE_AI_API_KEY</code></td><td>Yes, for any AI feature</td><td>Gemini API key</td></tr>
          <tr><td><code>RESEND_API_KEY</code></td><td>Yes, to send emails</td><td>Login codes, invites, renewal reminders</td></tr>
          <tr><td><code>NEXT_PUBLIC_APP_URL</code></td><td>Optional</td><td>Base URL used in emails/links (defaults to localhost in dev)</td></tr>
        </tbody>
      </table>

      <h2>10. Local development &amp; deployment</h2>
      <pre><code>{`npm install
npm run db:push && npx prisma generate   # first-time setup against a fresh database only
npm run db:seed        # seeds an initial workspace + admin account
npm run dev -- -p 5174`}</code></pre>
      <pre><code>{`npm run build           # prisma migrate deploy && prisma generate && next build
npm start                # production server
npm run lint             # eslint
npm run test             # vitest — unit coverage on billing.ts, statementMatching.ts, crypto.ts`}</code></pre>
      <p><strong>Schema changes</strong> go through Prisma Migrate, tracked under <code>prisma/migrations/</code> (committed to git): run <code>npm run db:migrate</code> (<code>prisma migrate dev --name &lt;description&gt;</code>) to generate and apply a new migration locally, then commit the generated file alongside the schema change. <code>npm run build</code>&apos;s <code>prisma migrate deploy</code> step applies any pending migrations automatically on every deploy. <code>db:push</code> (schema-diff against the live database, no history, can drop columns silently) is reserved for first-time setup against a fresh database only — not for changes to an existing one.</p>
      <p>Deployable to Vercel, Netlify, or any Node.js/Docker host.</p>
    </LegalPageLayout>
  );
}
