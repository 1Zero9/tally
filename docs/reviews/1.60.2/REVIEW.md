# Tally v1.60.2 review and UI completion check

Reviewed commit `94f087e` on 2026-09-06. Local HEAD matched origin/main when checked. Compared with [the original review](../1.60.0/REVIEW.md) and [v1.60.1 re-review](../1.60.1/REVIEW.md).

## Answer

**No: the UI enhancements recommended in the original review have not been completed.** v1.60.1 and v1.60.2 are authentication hardening releases. The main app page, global styles, components and hooks have no changes since the reviewed v1.60.0 baseline (`2bd5fae`). The technical-overview page and changelog changed, but those do not implement the UI recommendations.

This is a source/diff review with focused auth execution, not a new full browser/device test. The prior UI evidence remains applicable because the affected implementation is unchanged. Prior timing measurements are historical, not fresh v1.60.2 benchmarks.

## UI and usability checklist

| Original recommendation | v1.60.2 status | Evidence / implication |
|---|---|---|
| Compact greeting/Ask box outside Overview | Outstanding | app/page.tsx unchanged; full greeting/Ask area remains above task views |
| Simplify/group eleven navigation destinations | Outstanding | Navbar.tsx unchanged |
| Single-column expense form on narrow phones | Outstanding | ExpenseModal.tsx:325 still uses fixed 1.6fr/1fr columns; other fixed two-column groups remain |
| Improve mobile summary-card discovery | Outstanding | OverviewDashboard.tsx and CSS unchanged; no new indicator/alternative layout |
| Clearly distinguish projected cost from actual paid cash flow | Outstanding | Overview labels and calculation presentation unchanged |
| Short quick-entry flow with progressive optional details | Outstanding | ExpenseModal.tsx unchanged |
| Visible save failure, rollback, retry and synchronization state | Outstanding, integrity issue F05 | app/page.tsx:427 still awaits fetch without checking HTTP success for mark-paid; similar handlers unchanged |
| Accessible shared dialogs, associated labels and focus containment | Outstanding, F14 | ExpenseModal.tsx:251 plain modal div; form labels and modal implementation unchanged |
| Faster large lists and independent loading/error states | Outstanding, F15 | ExpenseList.tsx unchanged; app/page.tsx:123–196 still loads resources sequentially |

Existing strengths remain: cohesive colors/type/cards, mobile drawer, sticky form Save/Cancel, no backdrop dismissal for data-entry forms. These predated the review and are not newly completed recommendations.

The broader QoL backlog (saved filters, global non-AI search, reconciliation inbox, budget history, offline draft recovery, richer reimbursement workflow) also has no implementation changes in these two releases. Some adjacent capabilities already existed; the proposed enhancements should not be confused with those existing features.

## v1.60.2 auth re-verification

Ran actual handlers with mocked atomic Prisma row operations, real HMAC and real in-memory rate limiter. No production DB calls or email delivery. See [probes](auth.probe.ts) and [results](auth-results.txt).

| Test | Result |
|---|---|
| Twenty concurrent wrong requests | Five successful bounded counter increments; peak counter = 5; zero sessions |
| Correct sixth request after fifth wrong increment, before cleanup | Clean 400; zero sessions — previous exploitable acceptance interleaving fixed |
| Two concurrent correct requests | One 200, one 400; exactly one session |
| Correct fifth request after four wrong ones | Succeeds |
| Twenty sequential wrong requests | Only first five reach comparison/update |
| CSPRNG and digest-only issuance | Pass: exact randomInt bounds and 64-character HMAC create payload |
| Email missing | 503, no code issuance/delivery |
| Both OTP secrets missing | hashCode throws; issuance returns 503; no public-key fallback |
| Provider exception containing synthetic OTP | Error message excluded from logs; only Error classification emitted |
| Send and verify throttles | Both enforced with independent per-IP budgets |
| Legacy plaintext token | Rejected; no session |

**F02 nuance:** the implementation still computes all twenty digest comparisons before bounded writes in the concurrent test. Therefore the earlier literal requirement “never more than five comparisons” is not satisfied. The important previous authentication bypass is fixed: exhausted rows cannot create a session because the correct-code DELETE now includes `attempts < 5`. Do not describe these two claims as equivalent.

For a strict pre-comparison admission budget, use a serialized verification operation or bounded reservation before comparison, and test it against PostgreSQL. The source also returns different rejection responses for the exhausted correct and wrong branches while a row remains available; standardizing exhausted-token responses would avoid that distinction. The mock tests establish handler interleavings, not production database load behavior.

**F03:** the two residuals reproduced in v1.60.1 are corrected for the tested paths: missing keys now fail closed and provider error messages are not forwarded to logs. This is not a certification of every possible log, historical database row or deployment configuration. New issuance remains digest-only, and the direct raw-code logger remains removed.

The limiter is still per-instance memory, not a durable deployment-wide limit. OTP expiry is checked on initial lookup but not in the conditional final writes; delayed requests crossing the expiry boundary deserve an additional regression test before broad auth sign-off.

## What remains beyond UI

F07–F09 have **no code changes** from the original baseline: the backup field-loss, incomplete restore/relationship handling and key-rotation defects remain pending. No repair batch was implemented during this review-and-advice request.

F01 (related-record household ownership), F04 (last-admin reinvite), F05 (false save success), F06 (payment integrity), and the other non-auth findings also have no relevant repairs in these releases. v1.60.2 should not be considered completion of the original review backlog.

## Advice

1. Finish the precise auth acceptance checks on an isolated PostgreSQL fixture, particularly the strict admission requirement and expiry-at-consumption case.
2. Prioritize F07–F09 recovery work and F01/F04/F06 integrity/authorization work before adding features. F05 save feedback/rollback belongs in this high-priority work, even though users see it as UI behavior.
3. Deliver a focused UI batch: shared accessible modal/forms, narrow-screen form layout, honest save states, clear projected/actual labels, and compact task-page header.
4. Then address large-list performance and navigation/mobile card discovery, followed by optional QoL features.

Do not redesign the established visual style wholesale; the more valuable improvements are reliability, clarity, accessibility and speed.

## Validation

Existing suite: **107 tests passed**, seven files. Focused review suite: **11 tests passed**, including documented comparison-limit characterization rather than universal auth acceptance. Final lint, typecheck and build results are recorded in [validation](validation.txt); production build output is [here](build-results.txt). Build uses `npx next build`, excluding the migration-bearing npm build script. No product/version changes were made.

Reproduce: `npx vitest run --config docs/reviews/1.60.2/vitest.config.mts`. The historical v1.60.0/v1.60.1 probes intentionally describe their target versions and are not acceptance tests for v1.60.2.
