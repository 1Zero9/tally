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
      opts.optimistic?.();
      try {
        const res = await request();
        const data = (await res.json().catch(() => null)) as (T & { status?: string; message?: string }) | null;
        if (!res.ok || !data || data.status !== 'ok') {
          opts.rollback?.();
          showFeedback({ type: 'error', message: data?.message || opts.errorMessage });
          return { ok: false };
        }
        if (opts.successMessage) {
          showFeedback({ type: 'success', message: opts.successMessage });
        }
        opts.onSuccess?.(data as T);
        return { ok: true, data: data as T };
      } catch {
        opts.rollback?.();
        showFeedback({ type: 'error', message: opts.errorMessage });
        return { ok: false };
      }
    },
    [showFeedback]
  );

  return { feedback, dismissFeedback, runMutation };
}
