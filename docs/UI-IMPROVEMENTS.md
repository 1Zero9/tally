# Tally UI improvements and verification checklist

Updated: 7 September 2026.

Original recommendations: v1.60.0 review, revisited at v1.60.2.
Current checkout when preparing this file: v1.64.0, commit `197908f`.

## Current status

The earlier statement that all UI enhancements were outstanding applied to v1.60.2. The repository has since added UI changes in v1.61.1–v1.64.0.

This file is a practical handoff and acceptance checklist. “Implemented” below means supported by the changelog and source inspection; it does **not** mean the behavior has passed a fresh browser, accessibility or real-device review. Leave acceptance boxes unchecked until verified.

Keep the established green/cream palette, typography, card styling and primary actions. Focus on clarity, reliability, accessibility and speed.

## 1. Reliable save feedback — highest priority

**Implementation present:** v1.62.0 introduced shared mutation feedback, rollback and form-saving states. Review `src/hooks/useActionFeedback.ts`, `app/page.tsx` and the entry modals.

- [ ] Successful saves show the persisted result and close the form appropriately.
- [ ] HTTP 400/401/403/409/429/500 responses produce a clear error.
- [ ] Network failures preserve the draft and keep the form open.
- [ ] Failed paid/active toggles and deletions restore the correct previous state.
- [ ] Save buttons show progress and prevent duplicate submissions.
- [ ] A corrected request can be retried without re-entering values.
- [ ] Rapid or overlapping edits cannot cause an old rollback to overwrite a newer successful change.
- [ ] Verify expenses, income, accounts, transfers and goals individually; do not infer complete coverage from the shared hook.

**Still to assess:** whether users need a persistent last-synchronized indicator beyond individual save feedback.

## 2. Accessible dialogs and controls — highest priority

**Implementation present:** v1.63.0 added `src/hooks/useModalA11y.ts`, dialog integration and label improvements.

- [ ] Opening each modal moves focus to an appropriate control.
- [ ] Tab and Shift+Tab stay within the active dialog.
- [ ] Closing returns focus to the opener when it still exists.
- [ ] Dialogs have an accessible name and modal semantics.
- [ ] Background content is unavailable to keyboard and screen-reader interaction while a modal is active.
- [ ] Fields have associated labels; errors are announced and linked to their fields.
- [ ] Icon-only buttons have useful accessible names.
- [ ] Nested dialogs trap focus only in the topmost dialog.
- [ ] Data-entry forms do not dismiss on backdrop click.
- [ ] Check Escape behavior with an unsaved draft: it must not cause unexpected data loss. The new hook closes on Escape, so this deserves explicit verification.
- [ ] Complete a representative form using only the keyboard and repeat with VoiceOver or another screen reader.

## 3. Narrow-screen expense forms

**Implementation present:** v1.61.1 added a single-column layout for narrow phones.

- [ ] At 320px and 390px widths, labels and selected values remain readable.
- [ ] Billing-cycle values such as “Monthly” are not clipped.
- [ ] No unintended page-level horizontal scrolling appears.
- [ ] Save and Cancel remain reachable with the software keyboard open.
- [ ] Long merchant names, large amounts and validation errors fit.
- [ ] Check actual iOS/Android viewport and safe-area behavior.

## 4. Compact task-page headers

**Implementation present:** v1.61.1 restricts the greeting and large Ask box to Overview.

- [ ] Reports and other task pages begin with their own heading and controls.
- [ ] Overview retains the greeting and Ask box.
- [ ] The top-bar Ask shortcut works from every destination.
- [ ] Invoking Ask moves focus predictably and preserves the user's context where practical.

## 5. Clearer navigation

**Implementation present:** v1.61.1 visually separates the money-journey destinations from the core sections.

**Partial fulfillment:** visual grouping helps, but is not proof that eleven destinations are easier to understand. Further restructuring is a design option, not an automatic requirement.

- [ ] A new user can find Spending, Bills, Accounts and Reports without guidance.
- [ ] Flow, Goals, Planned and Money Map read as a related group.
- [ ] Active location is clear on desktop and mobile.
- [ ] Navigation works with keyboard and screen reader.
- [ ] Check whether users confuse Flow with Money Map before changing labels or hiding destinations.

## 6. Dashboard financial wording

**Implementation present:** v1.61.1 renamed “This month spent” to “This month's committed spend” and added explanatory copy.

**Partial fulfillment:** the revised heading needs to be checked against every category of data contributing to the total.

- [ ] Users can distinguish committed/projected costs from actual payments.
- [ ] Copy accounts for recurring monthly equivalents and current-month one-off expenses.
- [ ] Reimbursements are explained consistently with the displayed amount.
- [ ] Reports and Overview explain why their figures may differ.
- [ ] The displayed period and currency are clear.
- [ ] A useful explanation or drill-through identifies which records contribute to a headline total.

## 7. Mobile dashboard summary cards

**Implementation present:** v1.61.1 added an edge fade to suggest more cards are available horizontally.

**Partial fulfillment:** a fade is a discovery cue; its effectiveness needs observation.

- [ ] Users notice additional cards without being told to swipe.
- [ ] All cards can be reached by touch and keyboard.
- [ ] Card content remains readable without accidental clipping.
- [ ] If the fade is insufficient, compare a position indicator or compact grid with the existing rail.

## 8. Faster expense entry

**Implementation present:** v1.64.0 puts optional information behind “Add optional details.” Existing populated details are intended to expand automatically.

- [ ] A basic expense can be saved using only essential fields.
- [ ] Optional details are discoverable and labelled clearly.
- [ ] Editing a record with optional values exposes those values appropriately.
- [ ] Collapsing optional details never clears their values.
- [ ] Hidden invalid fields cannot block saving without an explanation and a way to reveal them.
- [ ] Switching billing cycle/category does not silently discard useful data.
- [ ] Advanced sections remain accessible by keyboard and screen reader.

## 9. Large-list performance and loading resilience

**Previously outstanding:** original finding F15. This file does not establish that the performance recommendations have been implemented or re-tested.

- [ ] Check whether long lists now use pagination or virtualization.
- [ ] Measure navigation and search with 1,000 and 10,000 synthetic records.
- [ ] Show loading, empty and failed states distinctly.
- [ ] Failure of one resource must not prevent unrelated sections loading.
- [ ] Preserve filters and selection while data refreshes.

The earlier ~10.5-second Spending navigation measurement at 10,000 records belongs to the v1.60.0 review. Do not present it as a fresh measurement of v1.64.0.

## Suggested verification order

1. Failed saves, overlapping mutations and draft preservation.
2. Modal focus, labels, nested dialogs and Escape behavior.
3. Narrow-screen forms with a real software keyboard.
4. Financial headline wording against representative data.
5. Optional expense details and edit round trips.
6. Task-page headers, navigation and mobile card discovery.
7. Large-list performance and partial-load failures.

## Definition of done

- [ ] Test at 1440px, 768px, 390px and 320px.
- [ ] Test empty, populated and long-content states.
- [ ] Test keyboard-only and screen-reader operation.
- [ ] Test delayed requests, rejected writes and offline failures using isolated fixtures.
- [ ] Record results and screenshots for each changed workflow.
- [ ] Confirm no draft loss, false save success, clipped essential controls or inaccessible actions.
- [ ] Run type checking, lint and a production build after implementation.
- [ ] Apply the repository's desktop/mobile version and changelog conventions when shipping user-facing changes.

## References

- [Original intensive review](reviews/1.60.0/REVIEW.md)
- [v1.60.2 completion assessment](reviews/1.60.2/REVIEW.md) — historical status, superseded where newer implementation is described above
- [Current changelog](../src/data/changelog.ts)

This document covers UI implementation and verification. It does not certify the security, backup, restore or key-rotation changes in the current release.
