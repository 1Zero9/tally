import { useEffect, useState } from 'react';

/**
 * True on small screens. SSR-safe: starts false, resolves on mount, and
 * updates on viewport changes. Used to pare the app back to a quick-glance
 * experience on a phone rather than rendering desktop-scale editors.
 */
export function useIsMobile(maxWidth = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [maxWidth]);

  return isMobile;
}
