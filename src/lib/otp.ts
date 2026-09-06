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
 * secret, never as the raw AES key). If NEITHER is set, this throws rather
 * than falling back to a hardcoded secret — a secret known from reading
 * this file's source provides no real protection at all, so silently
 * downgrading to one would just be lying about what "keyed" means here.
 * Call isOtpSecretConfigured() to check availability before issuing a code,
 * same pattern as isEmailConfigured() in src/lib/mail.ts.
 */
const DOMAIN_LABEL = 'tally-otp-v1';

function baseSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'AUTH_SECRET is not set (and neither is CREDENTIALS_ENCRYPTION_KEY as a fallback). ' +
      'Generate one with `openssl rand -base64 32` and add it to your environment before issuing sign-in codes.'
    );
  }
  return secret;
}

export function isOtpSecretConfigured(): boolean {
  return !!(process.env.AUTH_SECRET || process.env.CREDENTIALS_ENCRYPTION_KEY);
}

function deriveKey(): Buffer {
  return crypto.createHmac('sha256', baseSecret()).update(DOMAIN_LABEL).digest();
}

/** Deterministic keyed digest of an email+code pair, hex-encoded. */
export function hashCode(email: string, code: string): string {
  return crypto.createHmac('sha256', deriveKey()).update(`${email}:${code}`).digest('hex');
}
