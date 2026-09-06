/**
 * A coarse, in-memory sliding-window rate limiter — best-effort within one
 * server instance only (resets on redeploy/cold-start on serverless), with
 * no infra dependency. Originally private to the send-code route; shared
 * here so verify-code can apply its own separate budget too. Not a
 * substitute for a durable cross-instance store (Redis/Upstash) if this
 * app is ever scaled across many concurrent instances.
 */

const hitsByKey = new Map<string, number[]>();

/**
 * Records a hit for `key` and reports whether it's now over budget.
 * Independent callers (e.g. send-code vs verify-code) should use distinct
 * key prefixes so their windows/limits don't interfere with each other.
 */
/** Best-effort client IP from standard proxy headers (shared by auth routes). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function isRateLimited(key: string, windowMs: number, maxHits: number): boolean {
  const now = Date.now();
  const hits = (hitsByKey.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  hitsByKey.set(key, hits);

  if (hitsByKey.size > 5000) {
    // Simple unbounded-growth guard for a long-lived instance.
    for (const [existingKey, times] of hitsByKey) {
      if (times.every((t) => now - t >= windowMs)) hitsByKey.delete(existingKey);
    }
  }

  return hits.length > maxHits;
}
