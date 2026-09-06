import { decryptOptional } from './crypto';

export type FieldMatch = 'match' | 'mismatch' | 'not_set' | 'no_data';

export interface ExtractedAccountFields {
  accountNumber?: string | null;
  sortCode?: string | null;
  iban?: string | null;
  bic?: string | null;
}

export interface EncryptedAccountFields {
  accountNumberEnc: string | null;
  routingNumberEnc: string | null;
  ibanEnc: string | null;
  bicEnc: string | null;
}

export interface AccountFieldMatches {
  accountNumber: FieldMatch;
  routingNumber: FieldMatch;
  iban: FieldMatch;
  bic: FieldMatch;
}

function normalize(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function compareField(extracted: string | null | undefined, encStored: string | null): FieldMatch {
  if (!encStored) return 'not_set';
  if (!extracted) return 'no_data';
  const stored = decryptOptional(encStored);
  if (!stored) return 'no_data';
  const normExtracted = normalize(extracted);
  const normStored = normalize(stored);
  if (!normExtracted || !normStored) return 'no_data';
  // Statements often mask all but the last few digits, so only compare the
  // tail that's realistically printed on both sides.
  const tailLen = Math.min(4, normExtracted.length, normStored.length);
  return normExtracted.slice(-tailLen) === normStored.slice(-tailLen) ? 'match' : 'mismatch';
}

/**
 * Compares account-level details read off an uploaded statement against one
 * account's encrypted stored details, field by field — without ever
 * returning the decrypted stored value itself, only a match signal. Shared
 * by the single-account compare endpoint (confirm what was already picked)
 * and the cross-reference endpoint (scan every account to suggest one).
 */
export function matchAccountFields(
  extracted: ExtractedAccountFields,
  account: EncryptedAccountFields
): AccountFieldMatches {
  return {
    accountNumber: compareField(extracted.accountNumber, account.accountNumberEnc),
    routingNumber: compareField(extracted.sortCode, account.routingNumberEnc),
    iban: compareField(extracted.iban, account.ibanEnc),
    bic: compareField(extracted.bic, account.bicEnc),
  };
}
