import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog semantics for every modal in the app: focus moves into the
 * dialog on open (or stays wherever a field's own `autoFocus` already put
 * it), Tab/Shift+Tab is contained to the dialog instead of leaking out to
 * the page behind it, Escape closes it, and focus returns to whatever
 * triggered the modal once it closes — none of which the browser gives you
 * for free on a plain `<div>`.
 *
 * Usage: attach `dialogRef` to the `.modal-content` element and spread
 * `dialogProps` onto it —
 *   const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);
 *   <div ref={dialogRef} {...dialogProps} className="modal-content">
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;

    // Only move focus if it isn't already inside the dialog — a field with
    // its own `autoFocus` has already claimed it by the time this runs.
    if (dialog && !dialog.contains(document.activeElement)) {
      const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable || dialog).focus();
    }

    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  return {
    dialogRef,
    dialogProps: {
      role: 'dialog' as const,
      'aria-modal': true as const,
      tabIndex: -1 as const,
    },
  };
}
