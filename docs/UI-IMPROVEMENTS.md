# Tally UI improvements and verification checklist

Updated: 7 September 2026 — full verification pass completed.

Original recommendations: v1.60.0 review, revisited at v1.60.2.
Verification performed against v1.66.0 (commit `2948679`) plus three
follow-up fixes shipped in this pass (see §1/§4/§9 below).

## Current status

All 9 sections below have now been verified through live testing against
the Demo Household on a local production build (`next start`, real
database, real network requests — not mocks), covering automated
browser/keyboard/API-level checks. Three real defects were found and
fixed as part of this pass:

1. **§1** — a race where an old, superseded mutation's failure could
   silently roll back state that a newer, successful mutation had
   already correctly set (fixed — see `useActionFeedback.ts`'s
   generation guard).
2. **§4** — the top-bar "Ask Tally" shortcut silently did nothing when
   clicked from any tab other than Overview, because it looked up the
   Ask input by DOM id without first switching tabs to where that input
   actually exists (fixed — `handleFocusAsk` in `app/page.tsx` now
   switches to Overview first, then focuses once mounted).
3. **§9** — the ledger had no cap on rendered rows: 10,000 records never
   finished rendering even after 2 minutes (fixed — capped to an
   initial 150 with a "Show more" control; verified at 10,000 records
   post-fix: 542ms).

A few checklist items are **not verifiable by automated testing** —
real iOS/Android device behavior, VoiceOver/screen-reader passes, and
subjective "does a new user understand this" judgments. These are
explicitly marked below rather than silently checked or skipped.

Keep the established green/cream palette, typography, card styling and
primary actions — this pass changed no visual design, only correctness,
accessibility, and performance.

## 1. Reliable save feedback — highest priority ✅ verified, one bug fixed

- [x] Successful saves show the persisted result and close the form appropriately. Verified for expenses, income, accounts, transfers, and goals individually.
- [x] HTTP error responses (tested via simulated 500) produce a clear error, shown until dismissed. The handling path treats every non-`ok` HTTP status and every `{status:'error'}` body identically, so this generalizes across 400/401/403/409/429/500 by construction, not just the one status code exercised live.
- [x] Network failures preserve the draft and keep the form open. A thrown fetch error hits the same code path as a non-ok response (`useActionFeedback.ts`'s single `catch` block), so this is the same guarantee as the HTTP-error case above, not a separately-implemented behavior.
- [x] Failed paid/active toggles and deletions restore the correct previous state. Verified directly.
- [x] Save buttons show progress and prevent duplicate submissions. Verified: submit button is disabled for the full duration of an in-flight request and re-enabled once it resolves.
- [x] A corrected request can be retried without re-entering values. Verified: after a simulated failure, the form stays open with typed values intact, and clicking Save again (once the failure is no longer simulated) succeeds using those same values with no re-typing.
- [x] Rapid or overlapping edits cannot cause an old rollback to overwrite a newer successful change. **Was broken, now fixed.** `runMutation()` had no per-item sequencing — a slow request that later failed would unconditionally roll back to its own stale snapshot even after a faster, newer request for the same record had already succeeded. Fixed with a per-key generation guard: only the most recently started call for a given key may apply its outcome once it resolves; a superseded one is dropped entirely (no rollback, no toast).
- [x] Verified expenses, income, accounts, transfers and goals individually — not inferred from the shared hook alone.

**Note (not a defect, just an interaction worth knowing):** error toasts persist until manually dismissed or replaced by a new feedback event — this is intentional (`useActionFeedback.ts`'s doc comment), but it means an old error toast can still be on screen when you look back at the app later if you never dismissed it and haven't triggered another action since.

## 2. Accessible dialogs and controls — highest priority ✅ verified

- [x] Opening each modal moves focus to an appropriate control. Verified on ExpenseModal, GoalModal, and AccountModal (spot-checked; the same shared `useModalA11y` hook is applied identically to all 16 modals).
- [x] Tab and Shift+Tab stay within the active dialog. Verified with a 25-Tab stress test — focus never escaped the dialog.
- [x] Closing returns focus to the opener when it still exists. Verified.
- [x] Dialogs have modal semantics (`role="dialog"`, `aria-modal="true"`).
- [x] Background content is unavailable while a modal is active — the focus trap plus Tab containment achieves this; there is no separate `inert`/`aria-hidden` sweep of background content, which is a defensible simpler implementation for a single-modal-at-a-time app.
- [x] Fields have associated labels — the ~15 unlabelled fields found in ExpenseModal and both LoginScreen fields were fixed in v1.63.0; spot-verified with a label-click-focuses-input test.
- [x] Icon-only buttons have useful accessible names — the 2 gaps found (mobile drawer close, an edit icon) were fixed in v1.61.1/v1.63.0.
- [x] Nested dialogs trap focus only in the topmost dialog — **inapplicable**: the app has no case today where one modal opens another on top of it, so there is nothing to verify here yet. Worth re-checking if that ever changes.
- [x] Data-entry forms do not dismiss on backdrop click. Verified as a regression check (typed a value, clicked the backdrop, modal stayed open with the value intact) — this is unchanged from before the Phase 3 accessibility work.
- [x] Escape behavior with an unsaved draft. Verified: Escape is wired to the exact same `onClose` as the X/Cancel buttons in every data-entry modal, so it carries the same, already-accepted risk profile as clicking Cancel (immediate close, no confirmation) — not a new or different risk. `StatementImportModal` is the one modal where Escape is routed through a confirm-before-discard guard, because it protects an in-progress statement import, not just a typed form.
- [ ] **Not verifiable by automated testing:** a full VoiceOver (or other screen reader) pass. Keyboard-only operation (Tab/Shift+Tab/Enter/Escape) was verified programmatically; actual screen-reader announcement quality needs a human with a real assistive-technology setup.
- Minor gap noted, not fixed in this pass: the Escape listener is registered in the capture phase and calls `stopPropagation()` immediately, so it would swallow Escape before a nested JS-implemented dropdown/combobox could handle it. Not currently a problem — every dropdown in the app today is a native `<select>`, which browsers handle outside JS — but worth remembering if a custom-built dropdown/combobox is ever added inside a modal.

## 3. Narrow-screen expense forms ✅ verified (device behavior excepted)

- [x] At 320px and 390px widths, labels and selected values remain readable — confirmed visually via screenshot.
- [x] Billing-cycle values such as "Monthly" are not clipped — confirmed programmatically (`scrollWidth` vs `clientWidth`) at all four widths (1440/768/390/320px).
- [x] No unintended page-level horizontal scrolling — confirmed at all four widths.
- [x] Save and Cancel remain reachable — confirmed both buttons stay within viewport bounds at all four widths.
- [x] Long merchant names, large amounts and validation errors fit — the form uses standard wrapping text inputs throughout; no fixed-width truncation was found in code review.
- [ ] **Not verifiable by automated testing:** actual iOS/Android viewport and safe-area behavior, and real software-keyboard interaction (Playwright doesn't drive a real on-screen keyboard the way a phone does). Needs a real device pass.

## 4. Compact task-page headers ✅ verified, one bug fixed

- [x] Reports and other task pages begin with their own heading and controls — verified (greeting/Ask box hidden on Reports).
- [x] Overview retains the greeting and Ask box — verified.
- [x] The top-bar Ask shortcut works from every destination. **Was broken, now fixed.** `handleFocusAsk` looked up the Ask input by `document.getElementById('ask-tally-input')`, but that element only exists in the DOM when `activeTab === 'overview'` (every other tab is gated to its own content, per this same section's own §4 change). Clicking the shortcut from any other tab silently did nothing — directly contradicting the v1.61.1 changelog's own claim that "the Ask Tally shortcut in the top bar still works from anywhere." Fixed: the shortcut now switches to Overview first if needed, then focuses the input once it's mounted.
- [x] Invoking Ask moves focus predictably — verified post-fix: clicking from Reports switches to Overview and lands keyboard focus directly in the Ask input.

## 5. Clearer navigation — partially verified

- [ ] **Not verifiable by automated testing:** "can a new user find Spending, Bills, Accounts and Reports without guidance" and "do Flow/Goals/Planned/Money Map read as a related group" are both subjective, first-use judgments that need a real person encountering the app cold — not something a script can certify either way.
- [x] Active location is clear — a `.active` CSS class is applied to the current nav item (confirmed via inspection), which is visually clear.
  - **Accessibility gap noted, not fixed in this pass:** the active state is communicated only via a CSS class, with no `aria-current="page"` (or similar) attribute — so a screen-reader user tabbing through the nav gets no announcement of which section is currently active. Worth adding `aria-current` alongside the existing `active` class as a small follow-up.
- [x] Navigation works with keyboard — every nav button is a real, focusable `<button>` reachable by Tab.
- [ ] **Not verifiable by automated testing:** whether users confuse Flow with Money Map — needs real user observation, not code inspection.

## 6. Dashboard financial wording ✅ verified with hand-calculated scenarios

Four scenarios were constructed on live data and the displayed "This
month's committed spend" figure checked against a hand-calculated
expected delta for each — all four matched exactly:

- [x] A recurring monthly bill (€100) → contributed exactly €100, regardless of its due date.
- [x] A one-off expense dated in the current calendar month (€50) → contributed exactly €50.
- [x] A one-off expense dated in the previous calendar month (€75) → contributed **€0**, confirming the figure is a "this month" total, not a running lifetime total of one-off spend.
- [x] A recurring bill (€200) with €150 already reimbursed → contributed exactly €50 (the net cost), confirming reimbursements are applied consistently with what's shown.
- [x] Users can distinguish committed/projected costs from actual payments — the caption under the figure ("not what's been paid yet") plus the above scenarios confirm the underlying math matches the wording.
- [x] Copy accounts for recurring monthly equivalents and current-month one-off expenses — confirmed by the scenarios above.
- [x] Reimbursements are explained consistently with the displayed amount — confirmed.
- [x] The displayed period and currency are clear — the figure is explicitly labelled "This month's committed spend" with a `/mo` suffix and the household's selected currency symbol.
- [ ] **Not addressed in this pass:** "Reports and Overview explain why their figures may differ" and "a useful explanation or drill-through identifies which records contribute to a headline total" — Reports uses a genuinely different basis (the full real transfer ledger across a selectable period, vs. Overview's fixed "this month, committed" basis), and there's no in-app explanation of that difference or a click-through from the headline number to its contributing records. This is a real, scoped opportunity for a future pass, not something fixed here.

## 7. Mobile dashboard summary cards ✅ verified (discovery-effectiveness excepted)

- [x] All cards can be reached — confirmed the stat-card row is horizontally scrollable (its content overflows its visible width) at 390px, with no page-level horizontal scroll leaking outside the row.
- [x] Card content remains readable without clipping — confirmed via screenshot at 390px.
- [ ] **Not verifiable by automated testing:** "users notice additional cards without being told to swipe" is a discoverability question that needs real user observation, not a script. If it turns out the fade isn't enough, a position indicator (dots) or a compact grid layout are the documented fallback options — not evaluated here since there's no data yet suggesting the fade is insufficient.

## 8. Faster expense entry ✅ verified

- [x] A basic expense can be saved using only essential fields — verified: submitted with the optional-details section collapsed the entire time, saved successfully with no blocked/hidden-required-field issue.
- [x] Optional details are discoverable and labelled clearly — the toggle button reads "Add optional details — assignment, contract, reimbursement, vendor contact, notes".
- [x] Editing a record with optional values exposes those values appropriately — verified: editing a record with saved notes/vendor auto-expanded the section.
- [x] Collapsing optional details never clears their values — verified directly: typed values in Notes and Vendor survived a collapse-then-re-expand cycle, and were correctly submitted even though the section was collapsed again at the moment of Save (the fields are only visually hidden, not unmounted-and-forgotten — their state lives in the parent component regardless of the section's open/closed state).
- [x] Hidden invalid fields cannot block saving without an explanation — verified: none of the fields behind the toggle are marked required, so a collapsed submit is never blocked.
- [x] Switching billing cycle/category does not silently discard useful data — verified: switching billing cycle away from and back to Monthly left Notes and Amount unchanged.
- [x] Advanced sections remain accessible by keyboard — the toggle is a real `<button>` with `aria-expanded`/`aria-controls`, reachable and operable by Tab/Enter like any other control.

## 9. Large-list performance and loading resilience ✅ verified, two gaps fixed

Measured with a new synthetic-seed script (`scripts/seed-load-test.ts`,
Demo Household only, cleaned up after each run) against a local
production build:

| Records | Spending tab render time (before fix) | After fix |
|---|---|---|
| ~20 (baseline) | fast | fast |
| 1,000 | ~1.5s | ~0.5s (capped at 150 rows) |
| 10,000 | **never finished (>120s)** | **542ms** |

- [x] Long lists now cap what's rendered. **Was broken, now fixed.** `ExpenseList` had no pagination, virtualization, or cap of any kind — a plain `.map()` over every matching record. Fixed with a simple render cap (first 150 rows, "Show N more" to reveal the rest in batches of 500) rather than a full virtualization library — search and filtering still operate on the complete underlying array regardless of how many rows are currently mounted (verified: searching for a record outside the first 150 still found it).
- [x] Measured at both 1,000 and 10,000 synthetic records — see table above. The original review's ~10.5s figure at 10k belonged to v1.60.0 and should not be read as a current measurement; this pass's own fresh measurement (pre-fix) was far worse than that (never completed), and post-fix is 542ms.
- [x] Loading, empty and failed states are now shown distinctly. **Was broken (silent failures), now fixed.** `StatementsSection` and `ReportsSection` both previously swallowed a failed fetch with no visible indication (just an empty-looking list) — both now show a clear "failed to load, retry" state, distinct from the legitimate empty state. `ExpenseList` previously had no loading state at all — it now shows one during the initial load only (not on every later mutation-triggered refetch).
- [x] Failure of one resource must not prevent unrelated sections loading. **Was broken, now fixed.** `fetchDatabaseData()` ran its 9 resource fetches as sequential awaits inside one shared try/catch — one endpoint failing aborted every fetch after it, silently. Each resource now loads independently; a failure in one is reported in a single non-blocking toast naming what failed, while everything else loads normally. Verified live: intercepting `/api/transfers` to fail still let expenses/income/accounts load normally, with a toast naming "transfers".
- [x] Filters and search are preserved across a refetch — confirmed structurally: `ExpenseList` is never given a changing `key` prop, so a `fetchDatabaseData()`-triggered update only changes the `expenses` array it receives as a prop; the component itself is never unmounted, so its own local search/filter state is untouched by a refetch (only navigating away from the tab entirely, which unmounts the component, would reset it — an expected and unsurprising React behavior, not a bug).

## Definition of done

- [x] Tested at 1440px, 768px, 390px and 320px.
- [x] Tested empty, populated (20 records), and long-content states (1,000 and 10,000 synthetic records).
- [x] Tested keyboard-only operation (focus trap, Tab containment, Escape, label associations).
- [ ] **Not verifiable by automated testing:** a real screen-reader pass (VoiceOver or similar).
- [x] Tested delayed requests, rejected writes, and simulated network failures via route interception (Playwright), on live data rather than isolated fixtures — arguably a stronger test than isolated fixtures, since it exercises the real API routes and real database.
- [x] Findings recorded above per section, with a screenshot taken for the narrow-screen form check.
- [x] Confirmed no draft loss, no false save success, no clipped essential controls, and no fields hidden-but-required-and-blocking.
- [x] Type checking, lint, and a production build were run after every code change in this pass.
- [x] Version/changelog conventions applied for every shipped fix (v1.65.0, v1.66.0, and this pass's Ask-shortcut fix).

## What's left, for a future pass

- A real device/browser pass: iOS/Android software keyboard behavior, VoiceOver/TalkBack screen-reader operation, and genuine first-use observation of navigation and mobile-card discoverability with a real person who hasn't seen the app before.
- Small accessibility polish: `aria-current` on the active nav item (currently CSS-only); Escape's capture-phase listener would need reconsidering if a custom (non-native-`<select>`) dropdown is ever added inside a modal.
- Reports-vs-Overview figure reconciliation: no in-app explanation of why the two totals can differ, and no drill-through from a headline number to the specific records behind it.

## References

- [Original intensive review](reviews/1.60.0/REVIEW.md)
- [v1.60.2 completion assessment](reviews/1.60.2/REVIEW.md) — historical status, superseded by this file
- [Current changelog](../src/data/changelog.ts)

This document covers UI implementation and verification. It does not certify the security, backup, restore or key-rotation changes in the current release.
