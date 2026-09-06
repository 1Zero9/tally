import crypto from 'crypto';

/**
 * Hashes a passwordless sign-in code before it's stored, so the
 * VerificationToken table never holds a live, usable code in plain text —
 * only an admin/log reader with BOTH database read access and this app's
 * secret could reconstruct a code, not one or the other alone. A 6-digit
 * code is only ~1M possibilities, so an *unkeyed* hash (salted or not)
 * would be trivially brute-forced offline in milliseconds — the keying is
 * what actually matters here, not the hash function.
 *
 * Base secret, in priority order: a dedicated AUTH_SECRET (recommended —
 * any string, generate with `openssl rand -base64 32`), else the
 * already-configured CREDENTIALS_ENCRYPTION_KEY (reused only as a base
 * secret, never as the raw AES key), else a hardcoded fallback so sign-in
 * never breaks over this being unconfigured. Either way, one more HMAC
 * round with a fixed domain-separation label derives a purpose-specific
 * key, so this never reuses another feature's key material directly.
 */
const DOMAIN_LABEL = 'tally-otp-v1';
const FALLBACK_SECRET = 'tally-otp-fallback-secret-set-AUTH_SECRET-in-production';

let warnedMissingSecret = false;

function baseSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.CREDENTIALS_ENCRYPTION_KEY) return process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      '[auth] Neither AUTH_SECRET nor CREDENTIALS_ENCRYPTION_KEY is set — verification codes are hashed with a ' +
      'built-in fallback secret. Set AUTH_SECRET (any string, e.g. `openssl rand -base64 32`) for real protection.'
    );
  }
  return FALLBACK_SECRET;
}

function deriveKey(): Buffer {
  return crypto.createHmac('sha256', baseSecret()).update(DOMAIN_LABEL).digest();
}

/** Deterministic keyed digest of an email+code pair, hex-encoded. */
export function hashCode(email: string, code: string): string {
  return crypto.createHmac('sha256', deriveKey()).update(`${email}:${code}`).digest('hex');
}
