import crypto from 'crypto';

/**
 * Field-level encryption for highly sensitive data (account numbers, login
 * credentials, security notes) stored on the Account model. This is
 * server-only code — never import it from a client component.
 *
 * Uses AES-256-GCM: a random 12-byte IV per value, with the GCM auth tag
 * appended so we can detect tampering/corruption on decrypt. Output format:
 * `v2:<keyId>:base64(iv):base64(authTag):base64(ciphertext)` — `keyId` is
 * the first 8 hex characters of sha256(key), identifying WHICH key
 * produced this value, not just that it's in the current string format.
 * This is what a real key rotation actually needs to know ("does this
 * value still need rotating, or is it already on the destination key?") —
 * `v1` (the previous format, `v1:iv:tag:ciphertext`, no key id) and truly
 * legacy values (no marker at all, 3 parts) still decrypt correctly, since
 * every value ever written by this app used the single key currently in
 * CREDENTIALS_ENCRYPTION_KEY until a rotation changes that. See
 * isEncryptedWithKey() below and scripts/rotate-encryption-key.ts.
 *
 * The key comes from CREDENTIALS_ENCRYPTION_KEY (32 raw bytes, base64
 * encoded — generate with `openssl rand -base64 32`). If it's not set,
 * encrypt/decrypt throw rather than silently storing plaintext.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_VERSION = 'v2';

function parseKey(secret: string, envVarName: string): Buffer {
  const key = Buffer.from(secret, 'base64');
  if (key.length !== 32) {
    throw new Error(`${envVarName} must decode to exactly 32 bytes (256 bits).`);
  }
  return key;
}

function getKey(): Buffer {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to your environment before storing account credentials.'
    );
  }
  return parseKey(secret, 'CREDENTIALS_ENCRYPTION_KEY');
}

export function isEncryptionConfigured(): boolean {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!secret) return false;
  try {
    return Buffer.from(secret, 'base64').length === 32;
  } catch {
    return false;
  }
}

/** Short, non-secret fingerprint identifying a key without exposing it. */
function keyId(key: Buffer): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
}

export function encryptField(plaintext: string, key: Buffer = getKey()): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${KEY_VERSION}:${keyId(key)}:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

/** True if a stored value already carries the current format's prefix. */
export function isCurrentKeyVersion(stored: string): boolean {
  return stored.startsWith(`${KEY_VERSION}:`);
}

/**
 * True if `stored` was encrypted with exactly this key — the question a
 * real rotation needs answered, unlike isCurrentKeyVersion (which only
 * tells you the *format*, not which key produced it; a v1 value predates
 * key ids entirely and can never claim a match here, correctly forcing
 * rotation to treat it as needing rotation rather than skipping it).
 */
export function isEncryptedWithKey(stored: string, key: Buffer): boolean {
  const parts = stored.split(':');
  if (parts.length === 5 && parts[0] === KEY_VERSION) {
    return parts[1] === keyId(key);
  }
  return false;
}

export function decryptField(stored: string, key: Buffer = getKey()): string {
  const parts = stored.split(':');
  let ivB64: string | undefined, tagB64: string | undefined, dataB64: string | undefined;
  if (parts.length === 5 && parts[0] === KEY_VERSION) {
    // v2: version:keyId:iv:tag:ciphertext
    [, , ivB64, tagB64, dataB64] = parts;
  } else if (parts.length === 4) {
    // v1: version:iv:tag:ciphertext (no key id)
    [, ivB64, tagB64, dataB64] = parts;
  } else {
    // Legacy (pre-versioning): iv:tag:ciphertext
    [ivB64, tagB64, dataB64] = parts;
  }
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted value.');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Parses a base64-encoded 32-byte key from an arbitrary env var name.
 * Used by the key-rotation script to load the OLD key distinctly from
 * CREDENTIALS_ENCRYPTION_KEY (the new/current key used everywhere else).
 */
export function loadKeyFromEnv(envVarName: string): Buffer {
  const secret = process.env[envVarName];
  if (!secret) {
    throw new Error(`${envVarName} is not set.`);
  }
  return parseKey(secret, envVarName);
}

/** Encrypts a value, or returns null/undefined unchanged (optional fields). */
export function encryptOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return encryptField(value);
}

export function decryptOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  try {
    return decryptField(value);
  } catch {
    return null;
  }
}

/** Masks a decrypted secret for display, e.g. "••••4821" for an account number. */
export function maskSecret(value: string, visibleTail = 4): string {
  if (value.length <= visibleTail) return '•'.repeat(value.length);
  return `${'•'.repeat(Math.max(4, value.length - visibleTail))}${value.slice(-visibleTail)}`;
}
