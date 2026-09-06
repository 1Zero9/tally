import { describe, it, expect } from 'vitest';
import nodeCrypto from 'crypto';

// encryptOptional (used to build fixtures below) always reads
// CREDENTIALS_ENCRYPTION_KEY via getKey(), so it must be set before crypto
// or accountMatching are imported — same pattern as crypto.test.ts.
process.env.CREDENTIALS_ENCRYPTION_KEY = nodeCrypto.randomBytes(32).toString('base64');

import { encryptOptional } from '../crypto';
import { matchAccountFields } from '../accountMatching';

const account = (overrides: { accountNumber?: string; sortCode?: string; iban?: string; bic?: string } = {}) => ({
  accountNumberEnc: encryptOptional(overrides.accountNumber ?? null),
  routingNumberEnc: encryptOptional(overrides.sortCode ?? null),
  ibanEnc: encryptOptional(overrides.iban ?? null),
  bicEnc: encryptOptional(overrides.bic ?? null),
});

describe('matchAccountFields', () => {
  it('reports "match" when the tail of an extracted value matches the stored value', () => {
    const stored = account({ accountNumber: '12345678', sortCode: '90-12-34', iban: 'IE29AIBK93115212345678', bic: 'AIBKIE2D' });
    const result = matchAccountFields(
      { accountNumber: '••••5678', sortCode: '901234', iban: 'IE29 AIBK 9311 5212 3456 78', bic: 'AIBKIE2D' },
      stored
    );
    expect(result).toEqual({ accountNumber: 'match', routingNumber: 'match', iban: 'match', bic: 'match' });
  });

  it('reports "mismatch" when the tail differs', () => {
    const stored = account({ accountNumber: '12345678' });
    const result = matchAccountFields({ accountNumber: '99999999' }, stored);
    expect(result.accountNumber).toBe('mismatch');
  });

  it('reports "not_set" when the account has nothing saved for a field', () => {
    const stored = account({});
    const result = matchAccountFields({ accountNumber: '12345678' }, stored);
    expect(result.accountNumber).toBe('not_set');
  });

  it('reports "no_data" when the statement had nothing extracted but the account has a value saved', () => {
    const stored = account({ accountNumber: '12345678' });
    const result = matchAccountFields({ accountNumber: null }, stored);
    expect(result.accountNumber).toBe('no_data');
  });

  it('compares each field independently', () => {
    const stored = account({ accountNumber: '12345678', sortCode: '90-12-34' });
    const result = matchAccountFields({ accountNumber: '12345678', sortCode: '00-00-00' }, stored);
    expect(result.accountNumber).toBe('match');
    expect(result.routingNumber).toBe('mismatch');
  });
});
