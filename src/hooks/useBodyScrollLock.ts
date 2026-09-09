import { useEffect } from 'react';

/**
 * Locks page scroll while a modal is open, so scrolling inside the modal
 * (or reaching the end of a scroll area within it) doesn't bleed through
 * to the page behind. Restores the previous value — and the scroll
 * position — on unmount. Safe to nest: each lock restores exactly what it
 * replaced.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    // Compensate for the disappearing scrollbar so the layout doesn't jump.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [active]);
}
