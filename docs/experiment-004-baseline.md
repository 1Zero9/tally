# Experiment 004 — Gate 4: Tally Baseline Assessment

**Scope note:** This assessment was produced using only the Tally repository
(`/Users/stephencranfield/Projects/tally`) and its legitimate in-repo
context (README, `AGENTS.md`, `docs/`, source, `git log`, and locally-run
`tsc`/`eslint`/`vitest`). No Project OS, Experiment 001–003, LaunchCity,
Golf Club Tools, or cross-project material was inspected or used. See
**Invalidation check** at the end.

Approximate effort: one focused pass, ~20 tool-call rounds (directory
listing, doc reads, `git log`, `tsc --noEmit`, `eslint`, `vitest run`,
targeted greps/`wc -l`) — roughly 20–30 minutes of wall-clock investigation.

---

## 1. Current project state

**What Tally is.** A server-rendered Next.js 15 (App Router) + React 19 +
TypeScript household finance app. No separate backend — all logic lives in
Next.js Route Handlers (`app/api/**/route.ts`) over Prisma/PostgreSQL.
Passwordless 6-digit OTP auth, household-scoped multi-tenancy, AES-256-GCM
field-level encryption for sensitive account data, Google Gemini for
on-demand AI features (assistant Q&A, receipt/statement vision extraction,
money-flow insights), Resend for email, Vercel Blob for private file
attachments.

**Major implemented capabilities** (per `README.md`, `docs/technical-overview.md`,
and confirmed against `app/api` route list and `prisma/schema.prisma`):
expense/bill ledger with recurring + one-off items, income tracking, accounts
(bank/card/loan) with encrypted credentials, a real dated Transfer ledger
("money journey"), savings goals, statement import (CSV/PDF/photo) with AI
extraction, merchant-alias learning, duplicate detection, group-resolve for
recurring bill groups, balance reconciliation and per-import undo, a
household master ledger and per-account register, Money Map, Money Trails,
Home Projects, Reports (trends/category/vendor/timeline/insights, CSV
export), Budgets (flat monthly limit), a floating "Tally Agent" assistant
with a help-question KB cache, file attachments, full JSON household
backup/restore with cross-reference id remapping, an audit log, and admin
tooling.

**Maturity.** `package.json` version `1.122.3`; 56 API routes; 56 components
(~17,600 lines in `src/components`); `prisma/schema.prisma` is 870 lines;
18 committed migrations, all named and incremental (last:
`20260909150000_attachments`). Git history (last 50 commits) shows steady,
narrowly-scoped, well-described feature and polish commits with no reverts
or "fix the fix" churn visible in that window — evidence of an actively
maintained, not abandoned, project. `docs/simplify.md` (local planning
file, gitignored) records a self-directed consolidation effort: of 8 planned
UI consolidations, 7 are marked **done** and shipped (versions cited
v1.108.0–v1.114.0), 1 is explicitly **partial/deferred**. This is a
positive maturity signal — evidence of the team recognizing and actively
reducing its own accumulated duplication rather than letting it compound.

**Architecture shape.** Monolithic Next.js app, no microservices. Three
composable auth guards (`requireUser`/`requireHouseholdUser`/`requireAdmin`)
wrap every route. All AI calls are synchronous, on-demand, user-triggered —
nothing runs in the background except two cron jobs (`cron/backup`,
`cron/reminders`). Styling is hand-rolled CSS design tokens, no CSS
framework. The repo is a single Next.js project, not a monorepo.

## 2. Documentation vs implementation

**Agreement.** `docs/technical-overview.md` is unusually detailed and, on
spot-checks, was consistent with what's observable in the repo: version
number in `changelog.ts` (`APP_VERSION = '1.122.3'`) matches
`package.json` (`1.122.3`); `MOBILE_APP_VERSION` (`1.3.1`) is tracked
independently as the doc/AGENTS.md workflow convention describes; the last
commit (`2156478`) touched `package.json` + `changelog.ts` together,
matching the documented "bump version + changelog entry before committing"
convention exactly. The data-model section's model list matches
`prisma/schema.prisma`'s models at a structural level (spot-checked
`Account`, `Expense`, `StatementImport`, `Attachment`, `DatabaseBackup`).
Migration filenames line up with the features the docs describe as recently
shipped (attachments, category sort order, projects, money trails).

**Inconsistency / ambiguity.**
- `README.md`'s "Getting Started" tells a new developer to run
  `npm run db:push` as step 2 of local setup. `AGENTS.md` (checked-in
  project instructions) and `docs/technical-overview.md` §10 both say
  `db:push` is a live command against the **real production database**
  (no separate local dev database exists for this project) and should be
  reserved for one-off exploratory schema experiments, never the normal
  path — the correct onboarding path per those two sources is
  `prisma migrate deploy` / `db:migrate`. The public-facing README's
  quick-start currently contradicts the project's own stated database
  discipline. This is a real inconsistency an outside contributor (or a
  future agent following only the README) could act on destructively.
- `docs/roadmap.md` states current baseline is "~v1.107"; the repo is
  actually at `1.122.3`. The roadmap doc is explicitly dated/versioned as a
  planning snapshot from 2026-09-09 and says so at the top, so this isn't a
  hidden contradiction, just a stale baseline note inherent to any
  point-in-time planning doc — worth flagging as something that will
  mislead if read without noticing the date.
- `docs/simplify.md` item 4 ("Transactions tab: 4 stacked sections → 2") is
  explicitly left **partial** — the deeper structural merge is "deferred,
  optional." This is documented ambiguity, not a bug, but it's a known
  half-finished consolidation still sitting in the codebase.

**Unresolved ambiguity worth naming.** `docs/technical-overview.md` §2
itself documents an internal data-model wrinkle rather than hiding it: the
household minimum-one-admin protection only counts `ADMIN` rows, so a
household could in principle end up with only a `BACKUP_ADMIN` as sole
admin. The doc calls this "harmless functionally" since the role has
identical permissions — this reads as an accepted, understood edge case
rather than a live bug, but it is explicitly unresolved.

## 3. Quality / readiness

All three checks were run directly against the working tree (no changes
made):

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | **Clean** — zero errors |
| Lint | `npm run lint` (`eslint .`) | **Clean** — zero warnings/errors |
| Tests | `npx vitest run` | **139/139 passing**, 11 test files, 583ms |

**Test coverage shape.** All 11 test files live under `src/lib/__tests__`
and `src/utils/__tests__` and test pure/near-pure logic: `billing.ts`,
`statementMatching.ts`, `crypto.ts`, `otp.ts`, `accountMatching.ts`,
`attachments.ts`, `assistantKb.ts`, plus `reports.ts`, `calculations.ts`,
`duplicateExpenses.ts`, `formatters.ts`. Of 17 files in `src/lib/`, **7 have
tests and 10 do not** — untested files include `auth.ts` (session
issuance/validation, the guard helpers every route depends on),
`backup.ts` (full household snapshot/restore with cross-table id
remapping — described in `docs/technical-overview.md` §2 as intricate
enough to need explicit dependency-ordering and remap-map logic), `ai.ts`,
`audit.ts`, `duplicateGuard.ts`, `rateLimit.ts`, `projects.ts`, `mail.ts`,
`errors.ts`, `prisma.ts`. **Zero of the 56 API routes under `app/api/`
have any test coverage** — every test is at the lib/utility layer; nothing
exercises a Route Handler end-to-end (auth guard → Prisma → response
shape).

**Structural readiness note.** `src/components/StatementImportModal.tsx` is
2,887 lines — over 3x the next-largest component (`AdminSection.tsx`,
902 lines) and over 16% of all component code in the app. It has zero
dedicated component-level tests (consistent with the project-wide pattern
of testing only extracted lib logic, in this case `statementMatching.ts`
which it likely calls into).

I did not run `next build` (it invokes `prisma migrate deploy` against the
project's real database per `AGENTS.md`/`package.json`'s build script, with
no separate local dev database — a non-destructive-looking but
network/production-touching action I judged out of scope for a read-only
baseline check) or a live dev-server smoke test. Both are legitimate
follow-ups but weren't performed here.

## 4. Current risks / gaps (ranked)

1. **Highest-risk logic paths (`auth.ts`, `backup.ts`) have zero automated
   test coverage**, despite both being unusually consequential: `auth.ts`
   is the single source of truth for "who is making this request" across
   every route, and `backup.ts` performs a destructive delete-then-recreate
   restore across ~12 tables with hand-built id-remapping — the kind of
   logic where a silent regression either leaks/misattributes household
   data or loses it on restore, and where a unit test would catch a
   regression far cheaper than discovering it live. The project's own docs
   describe this remap logic in enough procedural detail (§2's
   `DatabaseBackup` note) that it's clearly understood to be delicate — but
   that understanding isn't backed by a regression test.
2. **README quick-start contradicts the project's own database-safety
   convention** (`db:push` presented as normal onboarding, elsewhere
   documented as production-only/exploratory). Low effort to fix, but a
   real correctness/safety gap in the one doc most likely to be followed
   literally by someone new.
3. **Zero API-route-level test coverage.** All 139 tests validate pure
   logic; none exercise a full request through an auth guard + Prisma +
   response shape. This doesn't block shipping today (manual + typecheck +
   lint have evidently been enough so far, per clean CI-equivalent checks
   and 122+ versions of incremental shipping) but is a widening gap as
   route count grows.
4. **`StatementImportModal.tsx` at 2,887 lines** is a maintainability
   concentration risk — the single largest, most complex, and (implicitly,
   per the AI-extraction + reconciliation + duplicate-detection feature set
   it hosts) most business-critical UI surface in the app, with no
   component-level test isolating its logic from rendering.
5. **One explicitly deferred consolidation** (`docs/simplify.md` item 4)
   left half-done in the codebase — low severity, self-documented, not
   urgent.

## 5. Decisions and assumptions

- **Observed fact:** `tsc --noEmit`, `eslint .`, and `vitest run` all pass
  cleanly as of this session (2026-09-15, commit `2156478`).
- **Observed fact:** 10 of 17 `src/lib` files and all 56 API routes have no
  test file referencing them by the project's own `__tests__` convention.
- **Observed fact:** the version-bump/changelog workflow convention in
  `AGENTS.md` is being followed in practice (verified against the last
  commit's diff).
- **Reasonable inference:** the project is actively, solo-maintained
  (single git author `1Zero9`/`scranfield@gmail.com` across the sampled
  history) with an unusually disciplined self-review habit (`docs/simplify.md`,
  `docs/reviews/1.60.x/` with browser screenshots and probes from earlier
  in the project's life).
- **Assumption:** "readiness" here is judged against Tally's own bar
  (clean typecheck/lint/tests, docs matching code) since no CI config
  (e.g., GitHub Actions) was found in the repo to define an external bar —
  I did not exhaustively search for one beyond the repo root and `.github`
  absence was inferred from the root directory listing, not a dedicated
  search.
- **Unknown:** whether `next build` currently succeeds — not run, per the
  production-database caveat above.
- **Unknown:** real-world defect rate / production incident history — no
  issue tracker or incident log is present in-repo to consult.

## 6. Uncertainty

- Whether the missing `auth.ts`/`backup.ts` test coverage reflects genuine
  risk exposure or simply a "tested manually every time, carefully" habit
  that has worked so far for a single-maintainer, single-household-scale
  project — the repo alone can't distinguish these.
- Whether `StatementImportModal.tsx`'s size has caused actual bugs/rework;
  no evidence either way was found in the sampled 50-commit history (no
  commit reads as a StatementImportModal-specific bug-chase or revert).
- Whether the README's `db:push` inconsistency is a leftover from an
  earlier phase (before the "no separate local dev database" constraint
  was formalized in `AGENTS.md`) or was never aligned — commit history for
  `README.md` specifically wasn't inspected to date this.
- Real user/scale context (household count, concurrency, data volume) is
  entirely unknown from the repo.

---

## Selected baseline work packet

**Title:** Add automated test coverage for `src/lib/auth.ts` and
`src/lib/backup.ts`, and fix the README onboarding inconsistency around
`db:push`.

**Problem / opportunity.** The two most consequential pieces of logic in
the codebase — who is authenticated/authorized on every request, and how a
full household's data is destructively restored — have no regression
safety net, while lower-stakes pure-math modules (`billing.ts`,
`statementMatching.ts`) do. This is an inverted risk/coverage ratio. Fixing
the adjacent README issue is small, cheap, and directly related (both are
about the gap between documented intent and what a reader/contributor would
actually do).

**Evidence.** Direct file listing of `src/lib/__tests__/` vs `src/lib/*.ts`
(§3 above); `docs/technical-overview.md` §2's own description of
`backup.ts`'s remap complexity and §3's description of `auth.ts` as the
"single source of truth" for identity on every route; `README.md` lines
62–70 vs `AGENTS.md`'s explicit `db:push` warning and
`docs/technical-overview.md` §10's matching warning.

**Why it matters.** A regression in `auth.ts` is a security incident
(wrong household's data served, or a downgraded guard silently passing).
A regression in `backup.ts` is data loss (a restore that drops or
mis-links records) with no way to detect it before a real user hits
"restore." Both are exactly the kind of low-frequency, high-blast-radius
path that unit tests are best suited to guard, and both already sit next
to a codebase culture that clearly values tests (139 existing, all
passing, covering comparable-complexity modules) — this is completing an
existing practice, not introducing a new one.

**Proposed approach.**
1. `auth.ts`: unit-test `getSessionUser()`'s sliding-expiration touch
   behavior, and each of `requireUser`/`requireHouseholdUser`/`requireAdmin`
   against mocked session/user/household states (missing session, expired
   session, wrong role, `BACKUP_ADMIN` parity with `ADMIN`), using the same
   Vitest + mocking approach already used for `assistantKb.test.ts`
   (also Prisma-adjacent).
2. `backup.ts`: unit-test the id-remap logic per schema version (1→4) with
   a small in-memory fixture snapshot for each version, asserting every
   cross-reference (`matchedExpenseId`, `matchedTransferId`, project→item→
   link chains, remapped custom `category` ids) resolves correctly after a
   simulated restore, plus a regression test for the documented
   `StatementTransaction`/`StatementImport` cascade-delete side-effect
   note.
3. `README.md`: replace the `npm run db:push` step in "Getting Started"
   with `npx prisma migrate deploy` (matching `docs/technical-overview.md`
   §10's already-correct local-dev sequence), and add the one-line caveat
   AGENTS.md already states about `db:push` being production-only.

**Expected benefit.** Closes the single largest coverage/risk gap in the
project without touching product behavior; makes the riskiest code in the
app safe to refactor later (e.g., if Phase-1-roadmap work ever touches
`Account.balance`/session handling); removes a documented onboarding trap.

**Risks.** Writing tests for `auth.ts`/`backup.ts` requires mocking Prisma
calls — some effort to get right, and low risk of the tests themselves
being shallow/false-confidence if not reviewed carefully. No product code
changes are needed, so no regression risk to shipped behavior from this
packet itself (README edit is text-only; new test files are additive).

**Assumptions.** That Vitest's existing mocking patterns in this repo
(used for `assistantKb.test.ts`, which already touches
household/session-shaped data) generalize to `auth.ts`/`backup.ts` without
needing a new test-infrastructure investment (e.g., a test database) —
unconfirmed until attempted.

**Unknowns.** Whether the team wants integration-style tests (real test DB)
vs pure unit tests with mocked Prisma for this work — the existing suite
uses the latter throughout, which the proposed approach follows for
consistency, but this is a choice worth confirming before implementation.

**Success criteria.** New test files
`src/lib/__tests__/auth.test.ts` and `src/lib/__tests__/backup.test.ts`
exist, pass, and cover: every guard helper's accept/reject paths, session
touch/extend behavior, and at least one full simulated restore per backup
schema version (1–4) verifying cross-reference integrity. `README.md`'s
"Getting Started" no longer recommends `db:push`. `tsc --noEmit`,
`eslint .`, and `vitest run` all remain clean.

---

## Invalidation check

- No Project OS repository or its documents were inspected.
- No Experiment 001, 002, 003 material was inspected.
- No LaunchCity material was inspected.
- No Golf Club Tools material was inspected.
- No evidence logs from prior experiments were inspected.
- No cross-project knowledge packet was inspected or used.
- The selected work packet (auth/backup test coverage + README fix) arose
  solely from evidence gathered inside this repository during this
  session: file listings, doc reads, `git log`, and local `tsc`/`eslint`/
  `vitest` runs.
- No product/implementation changes were made. Only this document was
  written; `tsc --noEmit`, `eslint .`, and `vitest run` were run read-only
  with no `--fix`/write flags.

No control violations to report.
