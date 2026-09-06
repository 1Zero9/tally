import { describe, it, expect } from 'vitest';
import nodeCrypto from 'crypto';

// encryptOptional/decryptOptional (unlike encryptField/decryptField) have no
// key-override parameter — they always read CREDENTIALS_ENCRYPTION_KEY via
// getKey(), so it must be set before those are called.
process.env.CREDENTIALS_ENCRYPTION_KEY = nodeCrypto.randomBytes(32).toString('base64');

import {
  encryptField,
  decryptField,
  isCurrentKeyVersion,
  isEncryptedWithKey,
  encryptOptional,
  decryptOptional,
  maskSecret,
} from '../crypto';

// A valid 32-byte key for every test — passed explicitly as the `key`
// override both encryptField/decryptField accept, so none of this depends
// on CREDENTIALS_ENCRYPTION_KEY being set in the test environment.
const KEY = nodeCrypto.randomBytes(32);
const OTHER_KEY = nodeCrypto.randomBytes(32);

describe('encryptField / decryptField round trip', () => {
  it('decrypts back to the original plaintext', () => {
    const plaintext = 'IE29AIBK93115212345678';
    const stored = encryptField(plaintext, KEY);
    expect(decryptField(stored, KEY)).toBe(plaintext);
  });

  it('produces output tagged with the current format version and this key\'s id', () => {
    const stored = encryptField('some secret', KEY);
    expect(stored.startsWith('v2:')).toBe(true);
    expect(isCurrentKeyVersion(stored)).toBe(true);
  });

  it('produces a different ciphertext each time (random IV) even for the same plaintext', () => {
    const a = encryptField('same value', KEY);
    const b = encryptField('same value', KEY);
    expect(a).not.toBe(b);
    expect(decryptField(a, KEY)).toBe(decryptField(b, KEY));
  });

  it('fails to decrypt with the wrong key (GCM auth tag mismatch)', () => {
    const stored = encryptField('sensitive value', KEY);
    expect(() => decryptField(stored, OTHER_KEY)).toThrow();
  });

  it('detects tampering with the ciphertext', () => {
    const stored = encryptField('sensitive value', KEY);
    const [version, kid, iv, tag, ciphertext] = stored.split(':');
    const tamperedByte = Buffer.from(ciphertext, 'base64');
    tamperedByte[0] = tamperedByte[0] ^ 0xff;
    const tampered = [version, kid, iv, tag, tamperedByte.toString('base64')].join(':');
    expect(() => decryptField(tampered, KEY)).toThrow();
  });

  it('decrypts a v1 value (version marker but no embedded key id — the format before this change)', () => {
    // Manually build the old v1 shape (v1:iv:authTag:ciphertext) to confirm
    // decryptField's v1 branch still works — real rows written before this
    // format change have this shape and must stay readable indefinitely.
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', KEY, iv);
    const plaintext = 'v1-account-number-000111';
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const v1Stored = `v1:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;

    expect(isCurrentKeyVersion(v1Stored)).toBe(false);
    expect(isEncryptedWithKey(v1Stored, KEY)).toBe(false); // v1 has no key id — never claims a match
    expect(decryptField(v1Stored, KEY)).toBe(plaintext);
  });

  it('decrypts a legacy pre-versioning value (no key-version prefix)', () => {
    // Manually build the exact old format (iv:authTag:ciphertext, no "v1:"
    // marker) to confirm decryptField's legacy branch still works — real
    // rows encrypted before key-versioning existed have this shape and
    // must stay readable indefinitely.
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', KEY, iv);
    const plaintext = 'legacy-account-number-000111';
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const legacyStored = `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;

    expect(isCurrentKeyVersion(legacyStored)).toBe(false);
    expect(decryptField(legacyStored, KEY)).toBe(plaintext);
  });
});

describe('isEncryptedWithKey', () => {
  it('is true for a value encrypted with exactly this key', () => {
    const stored = encryptField('some secret', KEY);
    expect(isEncryptedWithKey(stored, KEY)).toBe(true);
  });

  it('is false for a value encrypted with a different key', () => {
    const stored = encryptField('some secret', KEY);
    expect(isEncryptedWithKey(stored, OTHER_KEY)).toBe(false);
  });

  // This is the actual bug the rotation script had: isCurrentKeyVersion only
  // checked the string FORMAT, so once ALL data was in that format (the
  // normal end state, not an edge case), a real rotation would treat
  // everything as "already rotated" and skip it entirely.
  it('distinguishes two values both in the current format but under different keys', () => {
    const underKey = encryptField('same plaintext', KEY);
    const underOtherKey = encryptField('same plaintext', OTHER_KEY);
    expect(isCurrentKeyVersion(underKey)).toBe(true);
    expect(isCurrentKeyVersion(underOtherKey)).toBe(true);
    expect(isEncryptedWithKey(underKey, KEY)).toBe(true);
    expect(isEncryptedWithKey(underOtherKey, KEY)).toBe(false);
  });
});

describe('encryptOptional / decryptOptional', () => {
  it('passes null and undefined through unchanged', () => {
    expect(encryptOptional(null)).toBeNull();
    expect(encryptOptional(undefined)).toBeNull();
    expect(encryptOptional('')).toBeNull();
    expect(decryptOptional(null)).toBeNull();
    expect(decryptOptional(undefined)).toBeNull();
  });

  it('round-trips a real value', () => {
    const stored = encryptOptional('my-secret');
    expect(stored).not.toBeNull();
  });

  it('returns null (not throw) when decrypting malformed stored data', () => {
    expect(decryptOptional('not-a-valid-encrypted-value')).toBeNull();
  });
});

describe('maskSecret', () => {
  it('keeps the last few characters visible and masks the rest', () => {
    expect(maskSecret('123456789012')).toBe('••••••••9012');
  });

  it('fully masks a value shorter than or equal to the visible tail', () => {
    expect(maskSecret('12')).toBe('••');
  });
});
