# Tally 1.60.0 intensive review — test plan

Baseline: 2bd5fae4185d192aa0d278ba2e22b051840428d2. Review date: 2026-09-06.

## Execution boundaries

Use local production build, synthetic browser fixtures, and mocked Prisma/email/AI dependencies for adversarial tests. Never invoke production migrations, seed commands, real emails, AI uploads, restore, or destructive production requests. The repo has no separate test database. Mock tests establish route behavior, not database isolation or production throughput. Keep product behavior unchanged during this review; record findings and repeatable probes.

## Matrix and acceptance criteria

| Area | Cases | Acceptance |
|---|---|---|
| Baseline | Existing tests, TypeScript, ESLint, production compilation, dependency audit | All pass; record exact versions and scope |
| Authentication | Unknown/known email, malformed bodies, code logging, random source, expired/reused code, concurrent wrong attempts, cookies, logout | Indistinguishable responses; bounded attempts under concurrency; secrets absent from logs; correct cookie flags |
| Authorization | Anonymous API sweep; MEMBER/ADMIN/BACKUP_ADMIN; foreign account/goal/user IDs on create/update; invitations and last-admin guard | 401/403 before data access; all referenced rows owned by household; no last-admin loss |
| Integrity | Paid/received transitions, retries and concurrent requests, partial failures, negative/nonfinite amounts, dates, reimbursement, currencies | Atomic ledger changes, no duplicates, validated amounts and dates, totals consistent |
| Recovery | Snapshot fields and relationships; restore ordering; old format; new fields; encryption key compatibility | Full round trip; no unrelated data loss; explicit backup scope and preflight |
| Imports | Empty/malformed CSV, quoted commas/newlines, duplicate overlap, ambiguous merchants, account matching, reconcile/undo | Clear validation; stable matches; no duplicate ledger writes; reversible actions |
| Export | Formula prefixes, quotes/newlines, Unicode, one-offs and reimbursements | Safe cells; valid CSV; totals align with UI |
| UI | Desktop/mobile widths, empty/populated/large data, primary navigation, forms, long labels, modals | No unintended horizontal scrolling; controls reachable; consistent hierarchy |
| Accessibility | Labels, dialog semantics, keyboard focus/trap/return, errors, contrast, touch size, reduced motion | Programmatic names; keyboard completion; perceivable errors; usable mobile targets |
| Resilience | 401/403/409/429/500, network loss, delayed API, failed save, refresh and multi-tab | Visible failure; preserve drafts; revert optimism; no false success |
| Stress | 1k/10k synthetic rows, concurrent local anonymous requests, concurrent auth attempts | Record latency/error counts; no loss or crashes; do not infer production capacity |
| Features/QoL | Onboarding, search, bulk operations, reconciliation, budget semantics, reports, PWA, help | Rank useful additions separately from confirmed defects |

## Environment-dependent follow-up

A disposable PostgreSQL environment is required for real concurrency/locking, migration rollback rehearsal, complete backup round trip and multi-household end-to-end tests. Real-device iOS/Android installation, camera, keyboard and screen-reader tests require those devices. Email delivery, AI extraction quality and production latency require explicit fixtures/accounts and controlled service access. Mark these unexecuted rather than passing by inference.

## Release gate

Resolve high-severity access-control/data-loss findings first. Add regression assertions for every reproduced defect, run full checks, then execute disposable-database workflows and device checks before claiming stress readiness.
