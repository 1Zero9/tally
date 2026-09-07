import { useCallback, useRef, useState } from 'react';

export interface ActionFeedback {
  type: 'success' | 'error';
  message: string;
}

interface RunMutationOptions<T> {
  /** Applied immediately, before the request resolves — e.g. toggling a
   * checkbox or removing a row from local state so the UI feels instant. */
  optimistic?: () => void;
  /** Reverses `optimistic` exactly — called only if the request actually
   * failed, so a rejected save never keeps looking like it succeeded. */
  rollback?: () => void;
  /** Shown briefly on success. Omit for actions where silence-is-golden
   * (e.g. a toggle) is preferable to a toast on every single click. */
  successMessage?: string;
  /** Shown (and kept visible until dismissed) whenever the request fails —
   * a non-ok HTTP status, an API-level {status:'error'} body, or a thrown
   * network error are all treated as the same "it didn't actually save"
   * outcome. */
  errorMessage: string;
  /** Called with the parsed response body on success, before returning —
   * for handlers that need the server's data (e.g. a newly created id). */
  onSuccess?: (data: T) => void;
  /** Identifies which entity this mutation is about (typically the row's
   * id) — e.g. two rapid clicks on the same toggle fire two overlapping
   * calls with the same key. When set, only the most recently *started*
   * call for that key is allowed to apply its outcome (rollback, success,
   * toast) once it resolves; an earlier call that resolves later (a slow
   * failure racing a fast success) is treated as superseded and silently
   * ignored, so it can never stomp a newer, already-correct state. Omit
   * for mutations with no stable identity to race against (creates,
   * whole-entity saves) — they keep today's un-guarded behavior. */
  key?: string;
}

const SUCCESS_AUTO_DISMISS_MS = 3000;

/**
 * The one missing check every mutation handler in app/page.tsx currently
 * lacks: none of them inspect res.ok, so a failed save resolves exactly
 * like a successful one and any optimistic local-state update is never
 * rolled back. runMutation() is a single, shared place that does this
 * correctly — apply optimistic state, await the request, and roll back +
 * show a real error the moment ANY failure mode (bad HTTP status, an
 * {status:'error'} body, or a thrown network error) is detected.
 */
export function useActionFeedback() {
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest "generation" number started per key, so a stale call's outcome
  // (rollback/success/toast) can be dropped once a newer call for the same
  // key has started — see the `key` option below.
  const generations = useRef<Map<string, number>>(new Map());

  const showFeedback = useCallback((next: ActionFeedback) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setFeedback(next);
    if (next.type === 'success') {
      dismissTimer.current = setTimeout(() => setFeedback(null), SUCCESS_AUTO_DISMISS_MS);
    }
  }, []);

  const dismissFeedback = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setFeedback(null);
  }, []);

  const runMutation = useCallback(
    async <T = unknown>(request: () => Promise<Response>, opts: RunMutationOptions<T>): Promise<{ ok: boolean; data?: T }> => {
      const { key } = opts;
      let myGeneration = 0;
      if (key !== undefined) {
        myGeneration = (generations.current.get(key) || 0) + 1;
        generations.current.set(key, myGeneration);
      }
      // True once a later call for the same key has started — this call's
      // resolution no longer gets to touch state, no matter how it settles.
      const isStale = () => key !== undefined && generations.current.get(key) !== myGeneration;

      opts.optimistic?.();
      try {
        const res = await request();
        const data = (await res.json().catch(() => null)) as (T & { status?: string; message?: string }) | null;
        if (!res.ok || !data || data.status !== 'ok') {
          if (!isStale()) {
            opts.rollback?.();
            showFeedback({ type: 'error', message: data?.message || opts.errorMessage });
          }
          return { ok: false };
        }
        if (!isStale()) {
          if (opts.successMessage) {
            showFeedback({ type: 'success', message: opts.successMessage });
          }
          opts.onSuccess?.(data as T);
        }
        return { ok: true, data: data as T };
      } catch {
        if (!isStale()) {
          opts.rollback?.();
          showFeedback({ type: 'error', message: opts.errorMessage });
        }
        return { ok: false };
      }
    },
    [showFeedback]
  );

  return { feedback, dismissFeedback, runMutation, showFeedback };
}
