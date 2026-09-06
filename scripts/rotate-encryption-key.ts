/**
 * Rotates CREDENTIALS_ENCRYPTION_KEY: decrypts every encrypted Account
 * field with the OLD key and re-encrypts it with the NEW key, in a single
 * DB transaction. Use this if the key ever leaks or as part of routine
 * key hygiene.
 *
 * Usage:
 *   1. Generate a new key:      openssl rand -base64 32
 *   2. Set env vars:
 *        OLD_CREDENTIALS_ENCRYPTION_KEY = <current key currently in CREDENTIALS_ENCRYPTION_KEY>
 *        CREDENTIALS_ENCRYPTION_KEY     = <new key>
 *   3. Dry run first (no writes):   npm run rotate-key -- --dry-run
 *   4. Then for real:               npm run rotate-key
 *   5. Update CREDENTIALS_ENCRYPTION_KEY in your deployment's secret
 *      manager to the new key and redeploy.
 *
 * Safe to re-run: a field is skipped only once it's confirmed to be
 * encrypted with the NEW key specifically (isEncryptedWithKey), not merely
 * "in the current string format" — a value already on some OTHER key
 * (including a still-un-rotated one from before this script ever
 * existed) is correctly treated as needing rotation, not skipped.
 * Still, ALWAYS keep a DB backup before running against prod.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { decryptField, encryptField, isEncryptedWithKey, loadKeyFromEnv } from '../src/lib/crypto';

const prisma = new PrismaClient();

// All 8 encrypted Account fields — keep in sync with prisma/schema.prisma's
// Account model (previously missing ibanEnc/bicEnc, added along with the
// statement-import account-matching feature).
const ENCRYPTED_FIELDS = [
  'accountNumberEnc',
  'routingNumberEnc',
  'ibanEnc',
  'bicEnc',
  'loginUsernameEnc',
  'loginPasswordEnc',
  'loginUrlEnc',
  'securityNotesEnc',
] as const;

function rotateValue(encrypted: string | null, oldKey: Buffer, newKey: Buffer): string | null | undefined {
  if (!encrypted) return undefined; // nothing to do
  if (isEncryptedWithKey(encrypted, newKey)) return undefined; // already on the destination key
  const plaintext = decryptField(encrypted, oldKey); // throws if this isn't actually under oldKey — surfaced to the caller
  return encryptField(plaintext, newKey);
}

async function rotateAccounts(oldKey: Buffer, newKey: Buffer, dryRun: boolean) {
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      name: true,
      accountNumberEnc: true,
      routingNumberEnc: true,
      ibanEnc: true,
      bicEnc: true,
      loginUsernameEnc: true,
      loginPasswordEnc: true,
      loginUrlEnc: true,
      securityNotesEnc: true,
    },
  });

  console.log(`Found ${accounts.length} account(s). ${dryRun ? '[DRY RUN — no writes]' : ''}`);

  let rotatedFieldCount = 0;
  let failedCount = 0;

  for (const account of accounts) {
    const updates: Record<string, string> = {};

    for (const field of ENCRYPTED_FIELDS) {
      const encrypted = account[field] as string | null;
      try {
        const rotated = rotateValue(encrypted, oldKey, newKey);
        if (rotated !== undefined) {
          updates[field] = rotated as string;
          rotatedFieldCount++;
        }
      } catch (err) {
        failedCount++;
        console.error(
          `  ✗ ${account.name} (${account.id}).${field}: failed to decrypt with old key — ${
            err instanceof Error ? err.message : err
          }`
        );
      }
    }

    if (Object.keys(updates).length === 0) continue;

    console.log(`  ✓ ${account.name} (${account.id}): rotating ${Object.keys(updates).length} field(s)`);

    if (!dryRun) {
      await prisma.account.update({ where: { id: account.id }, data: updates });
    }
  }

  return { rotatedFieldCount, failedCount };
}

// DatabaseBackup.payloadJson embeds raw Account rows (schemaVersion 1 and 2
// snapshots both include the *Enc fields as-is) — a snapshot taken before a
// rotation still holds ciphertext under the OLD key unless we rotate it
// here too. Otherwise restoring a pre-rotation snapshot after the old key
// is gone would silently produce permanently-undecryptable data.
async function rotateBackupPayloads(oldKey: Buffer, newKey: Buffer, dryRun: boolean) {
  const backups = await prisma.databaseBackup.findMany({
    select: { id: true, notes: true, payloadJson: true },
  });

  let rotatedFieldCount = 0;
  let failedCount = 0;
  let touchedBackups = 0;

  for (const backup of backups) {
    if (!backup.payloadJson || typeof backup.payloadJson !== 'object' || Array.isArray(backup.payloadJson)) continue;
    const payload = backup.payloadJson as Record<string, unknown>;
    const accounts = payload.accounts;
    if (!Array.isArray(accounts) || accounts.length === 0) continue;

    let changed = false;
    for (const account of accounts as Record<string, unknown>[]) {
      for (const field of ENCRYPTED_FIELDS) {
        const encrypted = account[field] as string | null;
        try {
          const rotated = rotateValue(encrypted, oldKey, newKey);
          if (rotated !== undefined) {
            account[field] = rotated;
            rotatedFieldCount++;
            changed = true;
          }
        } catch (err) {
          failedCount++;
          console.error(
            `  ✗ backup ${backup.id} (${backup.notes || 'no notes'}).accounts[].${field}: failed to decrypt with old key — ${
              err instanceof Error ? err.message : err
            }`
          );
        }
      }
    }

    if (!changed) continue;
    touchedBackups++;
    console.log(`  ✓ backup ${backup.id} (${backup.notes || 'no notes'}): rotated embedded account ciphertext`);

    if (!dryRun) {
      await prisma.databaseBackup.update({
        where: { id: backup.id },
        data: { payloadJson: payload as unknown as Prisma.InputJsonValue },
      });
    }
  }

  return { rotatedFieldCount, failedCount, touchedBackups };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const oldKey = loadKeyFromEnv('OLD_CREDENTIALS_ENCRYPTION_KEY');
  const newKey = loadKeyFromEnv('CREDENTIALS_ENCRYPTION_KEY');

  if (oldKey.equals(newKey)) {
    throw new Error(
      'OLD_CREDENTIALS_ENCRYPTION_KEY and CREDENTIALS_ENCRYPTION_KEY are identical — nothing to rotate.'
    );
  }

  console.log('--- Rotating live Account fields ---');
  const accountResult = await rotateAccounts(oldKey, newKey, dryRun);

  console.log('\n--- Rotating embedded ciphertext in DatabaseBackup snapshots ---');
  const backupResult = await rotateBackupPayloads(oldKey, newKey, dryRun);

  const totalFailed = accountResult.failedCount + backupResult.failedCount;

  console.log(
    `\nDone. ${accountResult.rotatedFieldCount} account field(s) rotated, ` +
    `${backupResult.rotatedFieldCount} backup-embedded field(s) rotated across ${backupResult.touchedBackups} snapshot(s)` +
    `${totalFailed ? `, ${totalFailed} FAILED` : ''}.${dryRun ? ' (dry run — no changes written)' : ''}`
  );

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
