import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashCode, isOtpSecretConfigured } from '../otp';

// hashCode() reads process.env fresh on every call (no module-level key
// caching), so mutating these between tests is enough — no need to
// re-import the module.
const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET;
const ORIGINAL_ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY;

describe('hashCode', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-one';
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_AUTH_SECRET === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET;
    if (ORIGINAL_ENCRYPTION_KEY === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    else process.env.CREDENTIALS_ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY;
  });

  it('is deterministic for the same email/code pair', () => {
    expect(hashCode('user@example.com', '123456')).toBe(hashCode('user@example.com', '123456'));
  });

  it('differs for a different code', () => {
    expect(hashCode('user@example.com', '123456')).not.toBe(hashCode('user@example.com', '654321'));
  });

  it('differs for a different email, same code', () => {
    expect(hashCode('a@example.com', '123456')).not.toBe(hashCode('b@example.com', '123456'));
  });

  it('produces a 64-character hex digest, not the plaintext code', () => {
    // A substring check (e.g. not.toContain('123456')) isn't a real
    // guarantee — a hex digest can coincidentally contain any short decimal
    // run. The actual property that matters is the *shape*: this is a full
    // SHA-256 digest, structurally nothing like a 6-digit code.
    expect(hashCode('user@example.com', '123456')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a different digest when AUTH_SECRET changes', () => {
    const withFirstSecret = hashCode('user@example.com', '123456');
    process.env.AUTH_SECRET = 'test-secret-two';
    const withSecondSecret = hashCode('user@example.com', '123456');
    expect(withFirstSecret).not.toBe(withSecondSecret);
  });

  it('falls back to CREDENTIALS_ENCRYPTION_KEY when AUTH_SECRET is unset', () => {
    delete process.env.AUTH_SECRET;
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'some-base64-looking-key';
    // Just confirm it doesn't throw and stays deterministic either way.
    expect(hashCode('user@example.com', '123456')).toBe(hashCode('user@example.com', '123456'));
  });

  it('throws — never falls back to a public hardcoded secret — with neither configured', () => {
    delete process.env.AUTH_SECRET;
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(() => hashCode('user@example.com', '123456')).toThrow(/AUTH_SECRET/);
  });
});

describe('isOtpSecretConfigured', () => {
  afterEach(() => {
    if (ORIGINAL_AUTH_SECRET === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET;
    if (ORIGINAL_ENCRYPTION_KEY === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    else process.env.CREDENTIALS_ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY;
  });

  it('is true when AUTH_SECRET is set', () => {
    process.env.AUTH_SECRET = 'test-secret';
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(isOtpSecretConfigured()).toBe(true);
  });

  it('is true when only CREDENTIALS_ENCRYPTION_KEY is set', () => {
    delete process.env.AUTH_SECRET;
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-key';
    expect(isOtpSecretConfigured()).toBe(true);
  });

  it('is false when neither is set', () => {
    delete process.env.AUTH_SECRET;
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(isOtpSecretConfigured()).toBe(false);
  });
});
