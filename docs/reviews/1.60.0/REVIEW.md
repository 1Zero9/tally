# Tally 1.60.0 — intensive application review

Reviewed 6 September 2026. Baseline commit `2bd5fae4185d192aa0d278ba2e22b051840428d2`; installed Next.js 15.5.25, React 19. Product version remains 1.60.0: this delivery adds review material and probes, not product changes.

## Assessment

Tally has a coherent visual identity and substantial household-finance functionality. Its basic engineering checks are clean. However, **it is not yet ready to be called stress-tested or recovery-safe**. The main concerns are integrity and authorization at workflow boundaries: linked records, concurrent authentication, failed writes, paid-state corrections, restore, and key rotation. Address these before adding more features.

This is a local source and synthetic runtime review, not evidence of an active compromise or a certification of production security. No production data was intentionally read or changed, no migrations or restore commands were run, and no email or AI calls were made by probes. The local runtime was started with database URLs overridden to an unreachable loopback endpoint. Browser API requests were fulfilled with synthetic fixtures. The compile used `npx next build`, bypassing the migration-bearing npm build script.

## Executed results

| Check | Result | Meaning / limitation |
|---|---|---|
| Existing Vitest suite | 97/97 passed, six files | Pure calculations, reports, billing, encryption, matching; no existing route or browser suite |
| TypeScript / ESLint | Passed | Baseline and added review material checked |
| Production compilation | Passed; 44 pages generated | `npx next build`; migrations intentionally excluded |
| npm audit | Zero reported vulnerabilities across 504 dependency entries | Registry advisory snapshot, not a security guarantee |
| Adversarial review probes | 16/16 passed | Most intentionally assert the current defect; passing means reproduced, NOT fixed |
| Anonymous HTTP matrix | 70 method/path combinations: 69 returned 401; retired join endpoint returned 410 | Fail-closed coverage for business endpoints; auth, cron and exchange-rate routes excluded from this sweep |
| Local rejection load | 200 requests, concurrency 20, all 401; p50 71.9ms, p95 145.5ms, max 188.2ms | Measures anonymous rejection only; says nothing about database capacity |
| Desktop/mobile walkthrough | 11 destinations × four widths, plus login, form, keyboard and save-failure observations; 57 records | Widths 1440/768/390/320; synthetic expenses and empty ancillary datasets; no document-level overflow or page errors |
| Failed-save fault injection | Reproduced | HTTP 500 left expense shown as paid; error message absent |
| Modal keyboard check | Failed at all four widths | Tab reached elements outside the open expense modal |
| Form semantics | Failed | Login email has no associated label; expense form has 12 fields without associated labels/ARIA naming; no dialog role |
| CSV scale | 10,000 rows parsed in ~25ms | Synthetic quoted-field and date/amount checks also passed |
| Matching scale | 2,000 rows × 500 candidates in ~99ms | Specific low-match workload, not every expensive matching path |
| Browser scale | 0/1,000/10,000 expenses completed with no errors | Spending navigation ~0.28s / 1.23s / 10.49s; search including 100ms settle ~0.14s / 0.23s / 1.04s |

Measurements are single local runs under other review work, not benchmark distributions or mobile-device timings. Browser DOM counts in the stress output are **after filtering**, not peak rendered list size. An early stress fixture omitted required `paymentMethod`, causing a fixture-induced search crash; it was corrected and the final run above is the valid result. Screenshot animations were disabled for stable captures.

Evidence: [test plan](TEST-PLAN.md), [route probes](review.probe.ts), [probe output](probe-results.log), [HTTP results](http-results.json), [browser results](browser-results.json), [large-data results](browser-stress-results.json).

## Prioritized defects

Severity: P1 = high, fix before relying on the affected workflow; P2 = medium, schedule next; P3 = low/polish. “Reproduced” uses mocks or browser fixtures as specified. Source findings still need disposable-database regression tests.

### F01 — P1: Related record IDs are not constrained to the household

**Evidence:** reproduced route behavior, SEC-04. `app/api/expenses/route.ts:120–122` accepts `paymentAccountId`, `linkedGoalId`, and caller-supplied `createdById`; the response includes related account, goal and user metadata. The PUT path repeats this at lines 222–224. Equivalent patterns appear in income, transfers and goals.

An authenticated member who obtains a valid foreign ID can attach it to their own row. Ordinary foreign keys enforce existence, not matching household ownership. This can disclose selected foreign metadata and corrupt cross-household relationships. Random IDs limit discoverability but do not provide authorization. The probe confirms values reach persistence without a lookup; actual multi-tenant database exploitation was not performed.

**Fix/acceptance:** central scoped relationship validation on every create/update; constrain selectable attribution to household members; preserve actual actor separately. Two-household tests must reject all foreign references before writing, including mixed owned/foreign IDs and explicit nulls.

### F02 — P1: OTP attempt cap loses increments under concurrency

**Evidence:** reproduced, SEC-02; `app/api/auth/verify-code/route.ts:40`. Twenty concurrent wrong guesses all read zero and write one. The expected five-guess limit does not hold under that interleaving.

**Fix/acceptance:** atomically consume an attempt and enforce the cap within a transaction/conditional write; ensure successful consumption is single-use. Add durable per-account/IP throttling. Test 20 parallel failures and success/failure races against PostgreSQL. Mocks demonstrate a valid race schedule, not the number of guesses attainable on production.

### F03 — P1: Verification codes are logged and use non-cryptographic randomness

**Evidence:** reproduced code logging, SEC-01; source `app/api/auth/send-code/route.ts:84,100`. Every issued code is printed with the email, including production; generation uses `Math.random()`.

Log readers acquire live sign-in secrets. The random-source issue is a hardening defect, not a demonstrated prediction attack.

**Fix/acceptance:** use `crypto.randomInt`, remove code logging, store a keyed digest rather than raw OTPs, and test captured logs for absence of secrets. Configure production delivery to fail explicitly if unavailable.

### F04 — P1: Re-inviting an existing admin can remove the last admin

**Evidence:** reproduced, SEC-03; `app/api/workspace/invite/route.ts:18,53–55`. An invite with an existing admin email and omitted role defaults to MEMBER and upserts that role. It bypasses the last-admin protection in `/api/users` and has no corresponding role-change audit call.

**Fix/acceptance:** invitations should preserve existing membership/role or return “already a member.” Perform role changes through one guarded transactional path. Test self-invite, sole admin, backup admin, concurrent demotions and existing member invitation.

### F05 — P1: HTTP failures leave optimistic financial changes displayed as saved

**Evidence:** browser reproduced `failed-paid-save`: one paid item after injected 500, zero visible error messages. `app/page.tsx:427` awaits `fetch` without checking `res.ok`; edit, pause, activation and deletion paths have similar handling (e.g. 383,454,533). Fetch only throws on network failures, not ordinary HTTP errors.

**Fix/acceptance:** shared response handling, visible actionable errors, rollbacks and preserved drafts. Test 401/403/409/429/500 and offline for every write. A rejected payment must never remain shown as committed.

### F06 — P1: Expense/payment writes are not atomic; correcting paid status duplicates history

**Evidence:** DATA-01 and DATA-05. `app/api/expenses/route.ts:145,249` creates a transfer after persisting the expense outside a transaction. A transfer failure returns 500 after the expense has committed. Paid → unpaid → paid creates two transfers: clearing the flag does not reverse the first. Income has analogous separate writes.

**Fix/acceptance:** define payment instances per cycle; use transactions and idempotency/uniqueness. Separate “reverse this payment” from “record another payment.” Test retries, duplicate clicks, simultaneous users, intermediate failure and correction. Reports must not double-count a corrected payment.

### F07 — P1: Restore silently discards current expense fields

**Evidence:** reproduced, DATA-04; `app/api/admin/backup/route.ts:217` recreates expenses without original-currency/exchange-rate fields or reimbursement fields. A snapshot with a €100 charge and €50 reimbursement restores as €100 unreimbursed, changing financial totals.

**Fix/acceptance:** versioned snapshot schema and explicit round-trip coverage for every persisted field, including provenance/timestamps. Require fixture equality after snapshot/restore, apart from explicitly documented remapped IDs.

### F08 — P1: “Full” restore is incomplete and changes data outside snapshot scope

**Evidence:** source, `src/lib/backup.ts:5–10,30`; only accounts/goals/expenses/incomes/transfers are snapshotted. Budgets, categories, statements, aliases, map and workspace settings are omitted. Restore deletes accounts and regenerates IDs (`app/api/admin/backup/route.ts:163`). Schema relations cascade account-linked map nodes and their edges; statement/alias links to deleted rows are set null. They are not remapped or restored. Snapshot reads also occur in independent queries, not one consistent transaction.

**Fix/acceptance:** clarify partial vs full recovery, take a consistent snapshot, include/remap dependent entities, and show a restore impact preview. Test a fully connected fixture and compare all tables. Keep an independent recoverable backup outside the same database failure domain. Full database behavior is unexecuted here.

### F09 — P1: Key rotation skips current ciphertext and omits fields

**Evidence:** SEC-06 proves an old-key `encryptField` value passes `isCurrentKeyVersion` while failing decryption with the new key. `scripts/rotate-encryption-key.ts:73` skips every `v1` field; `v1` identifies the format, not which actual key encrypted it. Field lists at line 27 also omit `ibanEnc` and `bicEnc`. The implementation updates accounts one by one despite the comment claiming a single transaction; snapshot ciphertext is not rotated.

Following the documented key-switch procedure can render credentials unreadable, and restored old snapshots can require the old key.

**Fix/acceptance:** distinguish key IDs from format versions, cover all eight encrypted fields, keep a deliberate old-key recovery policy for backups, and verify all data with the destination key before switching. Test legacy + versioned values, repeated rotation, interruption and snapshot recovery. Do not run the current rotation procedure on live data as a routine maintenance step.

### F10 — P2: Cron authorization fails open when its secret is absent

**Evidence:** SEC-08/09; `app/api/cron/backup/route.ts:22`, reminders equivalent. With no secret, an anonymous caller reaches the handler; with a secret, rejection works. Production secret presence was not inspected.

**Fix/acceptance:** missing secret returns unavailable/unauthorized before work. Test unset, blank, wrong and valid secret for both routes. Repeated anonymous GETs must never create snapshots or send reminders.

### F11 — P2: Authentication responses enumerate invited users

**Evidence:** SEC-01. Unknown email gets the generic message; known email gets “A verification code has been sent…” (or a configuration message), and cooldown changes status. The intent comment is contradicted by the final response.

**Fix/acceptance:** same public status/body and comparable flow for known/unknown emails, including cooldown/error paths. Use server-side diagnostics that exclude OTPs. See [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### F12 — P2: Weak request validation and raw error disclosure

**Evidence:** DATA-02 accepts negative expense, unknown cycle and invalid date; DATA-03 passes NaN transfer amount to persistence because comparisons with NaN are false. SEC-05 returns a `.trim` type error for numeric email. `src/lib/errors.ts:1` returns raw Error messages throughout APIs, potentially exposing Prisma internals/configuration details.

**Fix/acceptance:** validate types, finite monetary values, supported currency/cycle, real calendar dates, string lengths and reimbursements at the API boundary; 400 for input errors, opaque 500 plus server correlation ID for unexpected failures. Consistent validation should cover update as well as create. Money uses Float currently; adopt a documented rounding/minor-unit or Decimal policy before complex reconciliation. Floating-point storage alone is not a demonstrated incorrect balance.

### F13 — P2: CSV exports allow formula interpretation

**Evidence:** SEC-07 retains `"=1+1"` in exported CSV. `src/utils/reportExport.ts:9` and `src/services/storage.ts:67` escape quotes but do not neutralize formula prefixes. Custom category names in expense CSV are not fully quote-escaped either.

A user-controlled label may be interpreted as a formula when opened in spreadsheet software; the harmless arithmetic probe did not invoke an external link or execute code. **Fix:** shared safe cell encoder with formula-prefix and delimiter/quote/newline tests, or a typed XLSX export. See [OWASP CSV injection](https://owasp.org/www-community/attacks/CSV_Injection).

### F14 — P2: Forms and modals are not fully keyboard/screen-reader usable

**Evidence:** runtime at four widths: 12 unlabelled fields in expense form, unassociated email label, no dialog semantics, focus escapes after tabbing. Source: `src/components/ExpenseModal.tsx:251,286`, `LoginScreen.tsx` label/input, and `ExportImportModal.tsx` clickable export divs. Overview also has visible icon buttons with no text, title or ARIA label (six at desktop, four at smaller widths in the fixture).

**Fix/acceptance:** reusable dialog with accessible name, `aria-modal`, background inertness, focus containment/return; associated labels and described errors; native buttons for export; names on icons. Preserve the existing no-backdrop-dismiss behavior for forms. Test completion without a mouse plus VoiceOver/TalkBack. This was not a full WCAG/contrast audit.

### F15 — P2: Unbounded lists and serial startup make scale and partial failures worse

**Evidence:** 10,000 expenses took ~10.49s to enter Spending in local desktop Chrome. `ExpenseList.tsx` renders filtered records directly. `app/page.tsx:123–196` fetches nine resources sequentially; a malformed response/network exception aborts subsequent loads, with only a console message. Transfers and expenses GETs fetch full history/collections. Expenses GET also issues writes for every overdue rollover via unbounded Promise.all.

**Fix/acceptance:** pagination/virtualization, server filtering, independent data-query states, parallel independent initial requests, bounded rollover work and background processing where justified. Set explicit targets: e.g. p95 interactive navigation under 1s on a representative 1k dataset and under 2s on 10k after paging. Measure on a midrange phone and real disposable database before setting release SLOs.

### F16 — P2: AI/email endpoints lack durable usage controls

**Evidence:** source review of assistant/scan/extract/vendor-email routes: authentication and some input caps exist, but no household quota, durable rate limiting or explicit application timeout around model generation. A member or compromised session can repeatedly incur provider costs or send vendor mail. No abuse requests were executed.

**Fix/acceptance:** per-user/household limits, timeouts, cancellation, duplicate-send protection and visible quota/error states. Use malicious/instruction-bearing document fixtures to verify extraction output schema and that untrusted document text cannot cause unintended actions. AI output quality and injection resistance were not tested against the real provider.

## UI, style and usability review

**Keep:** warm green/cream system, readable financial typography, strong primary Add expense action, consistent cards and spacing, explicit empty states, practical mobile drawer and sticky form actions. Screenshots show a cohesive app, not a need for a redesign. The screenshot pass found no document-level horizontal scrolling; the partially visible next summary card on mobile is an intentional inner horizontal rail.

**Improve next:**

- The greeting and large Ask box remain above Reports and other task pages; in desktop Reports the task starts around y=320. Compact this outside Overview, or offer a persistent small Ask control. This improves density without changing the visual language.
- Eleven desktop destinations make navigation harder to learn. Group money movement (Flow/Goals/Planned/Map) under a meaningful secondary area, while retaining direct links to recent destinations. Test discoverability rather than assuming fewer tabs automatically helps.
- At 320px, the expense form uses two columns and visibly truncates “Monthly.” Use one column at narrow widths for meaningful values. The sticky Save/Cancel footer is useful and should stay.
- Mobile summary cards require horizontal discovery to see all key figures. Add a clear position indicator or a compact two-column alternative; do not rely only on a clipped next card.
- “This month spent” includes recurring monthly-equivalent costs even when unpaid; Reports describes actual transfers. These are different useful measures, but the wording encourages comparisons that will not reconcile. Label projected/committed, paid cash flow and reimbursement-adjusted cost explicitly, with a drill-through explaining each total.
- Separate quick expense entry from optional contract, attribution, original currency, variable bill and reimbursement details. Progressive sections or remembered defaults reduce the length of an ordinary add flow.
- Show save progress, last successful synchronization and retry affordances. A financial app should never require refresh to discover whether an action persisted.
- Make keyboard accessibility a shared component feature. One-off labels and focus fixes across dozens of bespoke modals will drift again.

Representative captures: [desktop overview](overview-1440.png), [mobile overview](overview-390.png), [desktop reports](reports-1440.png), [narrow expense form](expense-form-320.png).

## Feature and QoL backlog

These are proposals, not claims that every adjacent capability is absent.

| Priority | Proposal | User value / scope | Acceptance example |
|---|---|---|---|
| Now | Reliable write state + undo | Confidence before more functionality | Failed save preserves draft; successful deletion has bounded recovery |
| Now | Complete backup + restore preview | Recovery users can trust | Show omitted/included tables, key requirements, impact and validation before restore |
| Next | One reconciliation inbox | Bring unresolved, duplicates, balance mismatch and reimbursements together | User can explain a statement difference and reach zero unexplained rows |
| Next | Bulk categorize/assign/archive with preview | Less repetitive statement and expense cleanup | Mixed selections show exact effects; safe partial-error handling |
| Next | Saved filters + shareable URL state | Resume household workflows | “Unpaid this month” survives refresh/back and can be bookmarked |
| Next | Global non-AI search | Predictable fast access across bills, accounts, statements and transfers | Exact merchant query opens the matching records without a model request |
| Next | Reimbursement ledger/work queue | Track pending/partial claims and actual receipts consistently | Multiple reimbursements sum correctly and reconcile to cash flow |
| Next | Forecast vs actual toggle | Clear household planning | Every headline states time period, basis and included records |
| Later | Budget history/rollover and thresholds | More useful budgeting than static run-rate limits | Past months stay stable; alert explains actual vs planned spend |
| Later | Safer collaboration | Avoid overwritten changes | Stale edits get a conflict prompt; activity identifies actual actor |
| Later | Credential reveal audit + recent reauthentication | Better protection for high-sensitivity account fields | Reveal expires and records actor; recovery admin powers explicitly documented |
| Later | PWA offline status and draft recovery | Mobile confidence when connectivity drops | Show offline state, retain unsent draft, never imply server commit |
| Later | Onboarding checklist + demo household | Explain accounts → bills → statements → reports | New user completes a synthetic monthly cycle without help |
| Later | Accessible charts with data tables | Make insights usable beyond color/vision | Same values available by keyboard and screen reader |

The manifest exists, but no service worker registration was found. Treat this as an installable/standalone experience, not verified offline support. Actual iOS/Android install, camera and keyboard behavior remains to be tested. Avoid adding bank syncing or more AI surfaces until financial integrity and recovery are stable.

## Remaining execution plan

The local review phase is complete; the full production-readiness plan is **not fully executed**. The following cannot responsibly be marked passed with mocks:

1. Provision a disposable PostgreSQL database, apply committed migrations there, create two households and all three roles. The current project has no isolated DB, and `docker`, `postgres`, `initdb` were unavailable on PATH. Do not use production as a substitute.
2. Run the F01/F02/F04/F06 races and permissions against actual transactions. Include cross-household foreign keys, concurrent demotion, same-cycle payment retries and stale edits.
3. Build a fully connected snapshot fixture: all eight encrypted account fields; FX/reimbursed expenses; incomes/transfers/goals; statements/matches/aliases; budgets/categories; map nodes/edges. Snapshot, mutate, restore and compare all records/relationships. Rehearse key rotation and old-backup recovery.
4. Run populated end-to-end workflows for accounts, income, transfers, goals, budgets, categories, report export, statement resolve/group-resolve/recheck/undo and admin roles. This review navigated those screens but did not submit every form or validate every report dataset.
5. Test import limits at 0/1/2,000/2,001 rows, duplicate overlaps across accounts, leap dates, ambiguous merchants, malicious CSV and prompt-bearing PDF/image fixtures. Execute provider-backed extraction only with approved synthetic samples; compare row/amount completeness against known ground truth.
6. Inject delayed/reordered API responses, offline reload, aborted saves, multi-tab session expiry and sign-out-everywhere failures. Local 500 fault injection covered one representative paid action, not every mutation.
7. Real-device Safari/iOS standalone and Chrome/Android: camera/file picker, keyboard open, rotation, safe areas, 200% zoom, screen reader, focus order, color contrast, reduced motion and 24-hour/session-idle behavior.
8. Run authenticated load on isolated infrastructure: 1/5/20 concurrent users; 1k/10k records; import/rollover/report workloads; collect p50/p95/p99, CPU, memory, DB pool and query counts. Perform a bounded soak and validate ledger invariants afterward.

## Recommended delivery order

1. **Integrity and isolation:** F01, F04–F09. Add real database fixtures and regression tests first; do not rely on existing backup/rotation workflows for that rollout.
2. **Authentication and input handling:** F02–F03, F10–F13, F16. Add a shared validator/error contract and durable abuse controls.
3. **Usability and performance:** F14–F15 plus compact non-overview header, narrow-form layout and clear projected/actual totals.
4. **Quality-of-life features:** reconciliation inbox, saved filters, bulk actions and reimbursement workflow, guided by actual usage.

The existing green build is valuable. It does not cover the highest-risk paths found here. The release gate should be “no unresolved high-severity integrity/access/recovery defects, with disposable-database and real-device evidence,” not simply “all current unit tests pass.”

## Reproducing this review

Run from the repo root. The installed Next package did not contain the AGENTS-referenced `node_modules/next/dist/docs` directory, so testing guidance was checked against the [official Next.js guide](https://nextjs.org/docs/app/guides/testing/vitest). No framework implementation was changed.

```sh
npm test
npx tsc --noEmit
npm run lint
npm audit --json
npx next build
npx vitest run --config docs/reviews/1.60.0/vitest.config.mts
```

The review probe filename is deliberately `review.probe.ts`, so it does not join the ordinary regression suite. Its expectations characterize known defects and must be inverted/replaced when fixes land.

For browser/HTTP reproduction, start the local server with `DATABASE_URL` and `DIRECT_URL` explicitly pointing to a disposable or unreachable **loopback** database, never production. Use port 3199. `browser-review.cjs` and `browser-stress.cjs` need Playwright plus installed Chrome; set `PLAYWRIGHT_PATH` to the package path if it is outside the project. `http-review.cjs` only calls local protected business endpoints without cookies. Scripts overwrite their evidence outputs. They are review tools, not production test infrastructure.
