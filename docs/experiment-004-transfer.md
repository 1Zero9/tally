# Experiment 004 — Gate 5: Knowledge-Assisted Work

**Locked baseline:** `docs/experiment-004-baseline.md`, commit `9fc46cb`.

## 1. Locked baseline work packet

1. Add unit tests for `src/lib/auth.ts` — guard helpers, session
   sliding-expiration behaviour.
2. Add unit tests for `src/lib/backup.ts` — id-remap correctness, covering
   all four backup schema versions.
3. Correct `README.md`'s onboarding guidance about `db:push` so it aligns
   with the repository's actual database/migration rules.

This packet was **not changed**. Item 2 required one implementation
decision to make it literally true (see §2, Knowledge Item 3 note; §6) —
the restore id-remap logic the baseline evidence described turned out to
live inline in `app/api/admin/backup/route.ts`, not in `src/lib/backup.ts`
itself, so it was moved (behaviour-preserving) into `backup.ts` before it
could be unit-tested there. That is an implementation detail of *how* item
2 was done, not a substitution of a different work packet.

## 2. Transferred knowledge items — disposition

### Knowledge Item 1 — distinguish local vs remote operational evidence

**Disposition: ACCEPTED.**

**How it affected the work.** This project's `AGENTS.md`/`docs/technical-overview.md`
already flag that there is no separate local dev database — every
Prisma-touching command runs against the real database. That fact governed
three concrete decisions in this session:
- The `auth.ts`/`backup.ts` tests use a mocked Prisma client / fake
  transaction object, not a real database, and this document is explicit
  that passing these tests is evidence about the *logic*, not about actual
  production Postgres/session behaviour — the test files themselves say so
  in a comment, so a future reader doesn't mistake local mock-passing for a
  production guarantee.
- The README fix does **not** claim to have been "verified" by actually
  running `npx prisma migrate deploy` against production. It corrects the
  documented instruction to match what `AGENTS.md`/`technical-overview.md`
  §10 already state is the correct local-setup command; the underlying
  claim ("this is what the real database rules require") rests on the
  project's own already-committed operational documentation, not on this
  session re-deriving it from a live database. No production database
  command was run in this session.
- `npm run build` (which runs `prisma migrate deploy` as its first step)
  was deliberately not run, consistent with the baseline's existing
  finding — this session did not perform an action against production
  merely to double-confirm a fact the docs already state.

**Concrete evidence.** `src/lib/__tests__/backup.test.ts`'s file-level
comment: *"a real integration test isn't a safe or available option here;
this fake tx verifies the id-remap logic itself... without asserting
anything about actual Postgres/production behaviour."* README's new
caveat line names the actual constraint (no separate local dev database)
rather than presenting the fixed command as independently verified.

**Effect: beneficial.** It kept the session honest about what the new
tests do and don't prove, and prevented an unsafe/unnecessary production
touch that would have added no real evidence beyond what the repo's own
docs already state.

### Knowledge Item 2 — runtime validation catches what static checks miss

**Disposition: ADAPTED.**

**How it affected the work.** The packet is almost entirely internal
logic (auth guards, id-remapping) plus a doc fix — not new user-facing
behaviour, so a full browser/UI walkthrough wasn't the relevant form of
"runtime validation" here (there's no new screen or interaction to click
through). What *was* at real risk from a static-only check: the
`backup.ts` refactor moved ~410 lines of restore logic out of the route
file and re-wired the route to call the extracted functions inside
`prisma.$transaction(...)`. `tsc --noEmit` confirms the types line up, but
it doesn't confirm the module actually loads and the route still resolves
correctly under Next.js's real module system (import/export wiring,
circular-import risk between `route.ts` and `backup.ts`, whether
`Prisma.TransactionClient` really matches what `$transaction`'s callback
receives at runtime, not just structurally at the type level).

I ran a real `next dev` server and hit `GET`/`POST`/`PUT`
`/api/admin/backup` with no session cookie. Per `auth.ts`, `requireAdmin()`
returns before any Prisma call when there's no cookie, so this is safe
against the real (production) database — no read, no write. All three
handlers compiled, loaded, and returned the exact `401 {"status":"error","message":"Authentication required"}`
response `auth.test.ts` predicts, with no server-side error in the dev log.

**Concrete evidence.** `/tmp/tally-dev.log` showed
`✓ Compiled /api/admin/backup in 1646ms (309 modules)` then
`GET /api/admin/backup 401`, `PUT /api/admin/backup 401`,
`POST /api/admin/backup 401` — no stack traces, no 500s.

**What it discovered / confirmed / was unnecessary for:**
- *Discovered nothing new* — no bug surfaced; the refactor was already
  correct per `tsc`.
- *Confirmed* the module-load and guard wiring genuinely works end-to-end
  under real Next.js, which `tsc --noEmit` and mocked unit tests cannot
  fully guarantee (they don't execute the real Next.js route-compilation
  step or the real `next/headers`/`next/server` runtime).
- The deeper behaviour this packet touches — an actual authenticated
  restore actually remapping ids correctly against real Postgres — **could
  not safely be performed**: it would require either a real session
  (impossible without a live magic-code email round-trip or seeded test
  data) or hitting the real production database's restore path, both out
  of scope for a non-destructive verification pass. The unit tests against
  the fake transaction client are the safe substitute for that part, and
  I'm recording explicitly that they are a substitute, not equivalent
  proof.

**Effect: beneficial, correctly bounded.** It added a cheap, safe check
that static analysis and unit tests structurally can't provide (real
module resolution / route registration), while correctly declining to
fabricate confidence about the one thing that genuinely can't be checked
safely here (a live restore against production data).

### Knowledge Item 3 — fewer, larger checkpoints over fine-grained approval loops

**Disposition: ADAPTED.**

**How it affected the work.** I treated auth.ts tests, the backup.ts
extraction + tests, and the README fix as one coherent pass and did not
stop for approval between them. I did surface one thing inline rather than
silently deciding it myself: the fact that the baseline's assumption about
*where* the restore id-remap logic lives (`src/lib/backup.ts`) didn't match
reality (it was in the API route), which required a real code-movement
refactor of the most destructive route in the app to make the packet's
literal instruction ("unit tests for `src/lib/backup.ts`... id-remap
correctness") achievable at all. That's the kind of material decision this
item's provenance describes as worth flagging rather than an ordinary
intermediate step — but per this item's instruction (stop only at a
genuine boundary, not for routine steps), I judged this as squarely inside
"implementation changes necessary for this work" (explicitly pre-authorized
by the gate 5 instructions) rather than a boundary requiring a pause, and
proceeded, documenting the decision here instead of stopping mid-task.

**Concrete evidence.** The whole packet (2 test files, 1 refactor,
1 vitest.config.ts alias fix, 1 README fix, full verification, runtime
smoke check) was completed and verified in a single uninterrupted pass
before this document was written and before returning control.

**Effect: beneficial, with one caveat.** It kept the session efficient and
matched what the gate 5 instructions explicitly asked for ("do not stop
for routine approvals"). The caveat: this is exactly the kind of
transferred, general-purpose "work autonomously" permission that could in
principle license silently absorbing a bigger-than-expected refactor
without flagging it. I mitigated that by writing the deviation up
explicitly in this document rather than treating "I was told not to stop"
as license to under-report scope — see §6 contamination assessment for why
I don't think this crossed into overreach.

**Why not simply REJECTED:** the item is a legitimate, low-risk operating
instruction for well-scoped work, and this packet was well-scoped once the
one factual correction (§1) was accounted for — I didn't find a reason to
reject the instruction to work in one pass, only a reason to record what
happened inside that one pass carefully.

## 3. Implementation completed

- **`src/lib/__tests__/auth.test.ts`** (new) — 18 tests covering
  `getSessionUser()` (no cookie, unknown token, expired session, valid
  mapping, sliding-expiration refresh threshold behaviour including "does
  not refresh when not near expiry" and "refresh failure doesn't reject the
  request"), and `requireUser`/`requireHouseholdUser`/`requireAdmin`
  (unauthenticated, no-household, wrong role, `ADMIN`, and the documented
  `BACKUP_ADMIN`/`ADMIN` permission parity).
- **`src/lib/backup.ts`** (extended) — moved the id-remap restore logic out
  of the API route into two new exported functions,
  `restoreLegacyExpenses()` (schema-version-1 bare Expense array) and
  `restoreHouseholdSnapshot()` (schema versions 2–4, a strict superset per
  table), plus the previously-route-local `remapCategory()` helper, all
  parameterized on an injected `Prisma.TransactionClient` so they're
  callable without a live database. No logic was changed — this is a
  verbatim move (confirmed via full-suite green + the runtime smoke check).
- **`app/api/admin/backup/route.ts`** (net -418 lines) — `PUT` now opens
  `prisma.$transaction(...)` and delegates to the two extracted functions;
  `GET`/`POST` are unchanged.
- **`src/lib/__tests__/backup.test.ts`** (new) — 14 tests: `remapCategory`
  (built-in passthrough, custom-id remap, unmapped fallback, null), the v1
  legacy branch, and `restoreHouseholdSnapshot` exercised against
  hand-built payload fixtures shaped like schema v2 (accounts/categories/
  goals/expenses/budgets/statement cross-references, plus two
  "dangling-reference dropped, not left pointing at a deleted id" cases),
  v3 (`moneyTrails` → `Transfer.trailId`), and v4 (`projects`/
  `projectItems`/`projectItemLinks`, including two "parent didn't survive"
  drop cases), plus one full v4-shaped payload exercising every table in a
  single restore pass.
- **`vitest.config.ts`** (new) — a minimal alias config resolving `@/*` the
  same way `tsconfig.json` does; without it, any test importing a file with
  a real (non-type-only) `@/`-aliased dependency fails to resolve under
  Vitest even though it builds fine under Next.js. This was necessary
  infrastructure, not scope creep — both `auth.ts` and `backup.ts` import
  `@/src/lib/prisma`/`@/src/data/categories` this way.
- **`README.md`** — "Getting Started" step 2 changed from `npm run db:push`
  to `npx prisma migrate deploy` (matching `docs/technical-overview.md`
  §10's already-correct sequence), with a new one-line caveat stating
  `db:push` runs against the real database and is for one-off exploratory
  use only, not normal setup/schema changes.

## 4. Verification performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npm run lint` (`eslint .`) | Clean, 0 warnings |
| `npx vitest run` (full suite) | **171/171 passing** (139 pre-existing + 32 new: 18 auth, 14 backup), 13 test files |
| Runtime smoke check (`next dev`, real server) | `GET`/`POST`/`PUT /api/admin/backup` with no session cookie each returned `401 {"status":"error","message":"Authentication required"}`, no server errors, route compiled cleanly (309 modules) |

`npm run build` was **not** run — its first step is `prisma migrate deploy`
against the real (production) database, per the baseline's existing safety
finding, unchanged by this session.

## 5. New findings attributable to transferred knowledge

- **Finding directly caused by applying Knowledge Item 3's "treat as one
  work packet" framing while executing item 2 literally:** discovering that
  `src/lib/backup.ts` did not, in fact, contain the id-remap logic the
  baseline document (and the technical-overview.md source it drew from)
  described — it lived in the API route. This wasn't visible from the
  baseline pass alone (which was doc/structure-level, not a full read of
  the 550-line route file); implementing item 2 required actually reading
  that file, which surfaced the mismatch. This is a genuine, correctly-
  scoped implementation finding, not an artifact of the transferred
  knowledge itself — the knowledge items shaped *how I responded* to it
  (one coherent pass, document the decision, don't fabricate confidence
  about what couldn't be safely verified) but did not cause the finding.
- **No finding was attributable to Knowledge Item 1 beyond confirming an
  already-documented constraint** — it didn't surface anything new about
  Tally; it kept an existing, already-known constraint (no local dev DB)
  correctly applied to this session's specific choices.
- **Knowledge Item 2 produced one small positive confirmation** (the
  refactored route loads and behaves correctly at runtime) but no new bug
  or risk.

## 6. Contamination assessment

- **Source assumptions accidentally imported?** No. Nothing about
  LaunchCity's or Golf Club Tools' architecture, domain, or terminology
  appears anywhere in the implementation or this document — the three
  knowledge items were used only in their stated, abstracted form
  ("distinguish local/remote evidence," "runtime validation has value,"
  "checkpoint at decision boundaries"), with their own provenance/specifics
  explicitly not consulted (neither repository, evidence log, or
  cross-project document was opened this session).
- **Irrelevant context introduced?** No new terminology, tooling names, or
  concepts foreign to Tally's existing stack were introduced. The only new
  file besides tests is `vitest.config.ts`, using Vitest's own
  already-installed `resolve.alias`, which mirrors Tally's own
  `tsconfig.json` — not an import from elsewhere.
- **Unjustified architecture/tooling changes?** The one architecture change
  (moving restore logic from the route into `src/lib/backup.ts`) is
  justified on its own Tally-native grounds independent of the transferred
  knowledge: it makes the packet's literal instruction achievable, and it
  matches this repo's own stated convention (`docs/technical-overview.md`
  §7: `src/lib/` is "server-only logic," route handlers call into it) —
  the route was previously an outlier in embedding ~400 lines of business
  logic directly. `vitest.config.ts` is minimal, scoped to alias
  resolution only, and doesn't change how the app itself builds or runs.
- **False confidence caused by prior knowledge?** Actively guarded against
  — see Knowledge Item 1's disposition above; the test files and this
  document both state explicitly that mocked-transaction tests prove logic
  correctness, not production behaviour, and the runtime check's scope
  (guard wiring, not full restore-against-real-data) is stated precisely
  rather than rounded up to "verified restore works."

No contamination found requiring a stop-and-report.

## 7. Effort

Approximate, not precise: roughly 40–55 minutes of continuous work —
reading `auth.ts`/`backup.ts`/the route file, writing and iterating the
`auth.test.ts` suite (one clean pass), diagnosing and fixing the `@/`
alias resolution gap under Vitest, performing the backup.ts extraction,
writing and iterating `backup.test.ts` (one fixture bug found and fixed),
three full verification passes (`tsc`/`lint`/`vitest`), the README edit,
and the runtime smoke check (server start, three curl checks, clean
shutdown).

---

## Invalidation check

- The baseline work packet (§1) was not changed to favour source
  knowledge — the one deviation (moving restore logic into `backup.ts`)
  was a factual necessity to implement item 2 as written, decided on
  Tally-native grounds (see §6), not to make any transferred knowledge item
  look more useful.
- Only the three bounded knowledge items supplied in the gate 5 prompt
  were used; no other content from them (provenance-specific detail) was
  applied.
- LaunchCity and Golf Club Tools repositories, evidence logs, and any
  other cross-project material were not inspected this session.
- No evaluation criteria (SUPPORTED/PARTIALLY SUPPORTED/NOT SUPPORTED, or
  any other experiment rubric) were changed, inspected, or referenced.
- Project OS v0.1 was not modified.
- No source-specific assumptions were deliberately imported (see §6).

No control violations to report.
