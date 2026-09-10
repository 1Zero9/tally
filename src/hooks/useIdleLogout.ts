import { useEffect, useRef } from 'react';

// How long the app can sit genuinely untouched (no mouse, keyboard, touch or
// scroll input) before automatically signing the user out — distinct from
// the much shorter privacy blur (which just hides the screen) and from the
// 30-day "remember me" session cookie (which keeps you signed in across
// separate visits). This fires whether the tab stayed open the whole time
// or was closed/backgrounded (common on a mobile PWA) and reopened after
// the window had already elapsed.
const IDLE_LOGOUT_MS = 30 * 60 * 1000;

const CHECK_INTERVAL_MS = 30_000;

// Last-activity time is mirrored to localStorage so it survives the tab
// being unloaded — a PWA that iOS killed and the user reopens hours later
// must be signed out, not have its clock silently restart from mount.
const STORAGE_KEY = 'tally.lastActivityAt';
const WRITE_THROTTLE_MS = 5_000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

/**
 * Signs the user out after a long period of true inactivity. Pass
 * `enabled` as whether the user is currently authenticated — the timer
 * only runs while there's someone to log out.
 */
export function useIdleLogout(enabled: boolean, onIdle: () => void) {
  const lastActivityRef = useRef(Date.now());
  const lastWriteRef = useRef(0);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;

    const readStored = (): number | null => {
      try {
        const v = Number(localStorage.getItem(STORAGE_KEY));
        return Number.isFinite(v) && v > 0 ? v : null;
      } catch {
        return null;
      }
    };
    const writeStored = (t: number) => {
      try {
        localStorage.setItem(STORAGE_KEY, String(t));
      } catch {
        /* private mode / quota — the in-memory timer still covers an open tab */
      }
    };

    // Honour an activity time carried over from a previous visit: if the
    // app sat closed/backgrounded past the idle window, sign out now
    // instead of restarting the clock from this mount.
    const carried = readStored();
    if (carried !== null && Date.now() - carried > IDLE_LOGOUT_MS) {
      onIdleRef.current();
      return;
    }

    const markActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (now - lastWriteRef.current > WRITE_THROTTLE_MS) {
        lastWriteRef.current = now;
        writeStored(now);
      }
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActivity, { passive: true }));

    const check = () => {
      // Idle only if neither this tab nor any other (via the shared
      // stored value) has seen activity within the window.
      const stored = readStored();
      const last = stored !== null ? Math.max(lastActivityRef.current, stored) : lastActivityRef.current;
      if (Date.now() - last > IDLE_LOGOUT_MS) onIdleRef.current();
    };

    const interval = setInterval(check, CHECK_INTERVAL_MS);

    // Timers don't advance while the OS has the tab suspended, so re-check
    // the moment it comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);

    // Opening the app now counts as activity for this session start.
    lastWriteRef.current = 0;
    markActivity();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActivity));
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [enabled]);
}
