# Tally 1.60.1 auth re-review

Target: `7c86026`, reviewed 2026-09-06 against [the 1.60.0 findings](../1.60.0/REVIEW.md). The checkout started clean at the requested commit. Only review evidence was added; product version and implementation were not changed.

## Decision

**F02 remains P1/open. Do not advance to F07–F09 under the requested “both confirmed resolved” condition.** The increment lost-update bug is fixed, and correct-code double consumption is fixed, but the five-guess security boundary is still bypassable under concurrency.

**F03's original CSPRNG and direct code-logging defects are fixed.** New issuance stores an HMAC digest and missing email configuration fails closed. The stronger claims “secret-protected in every configuration” and “no possible error log contains a code” are not established: there is a public fallback key and raw provider exceptions are logged.

## Results against the requested checks

| Check | Result | Evidence |
|---|---|---|
| CSPRNG generation | Confirmed | Route calls `crypto.randomInt(100000, 1000000)`; spy checks exact bounds |
| New `VerificationToken.code` is not a plain OTP | Confirmed for new issuance | Captured create payload is 64 hexadecimal characters equal to the email-bound HMAC; only the mocked delivery call receives the synthetic plaintext |
| No success-path log contains the code | Confirmed in test; direct logger removed in source | All log/warn/error spies remain unused for successful configured issuance; response excludes OTP |
| No log anywhere can contain a live code | Not guaranteed | Raw delivery errors are passed to console.error; a synthetic exception carrying the submitted email subject exposes the synthetic OTP in captured logs |
| Missing email configuration | Confirmed | Known user without cooldown receives 503 with RESEND_API_KEY guidance; no generation, token deletion/creation or delivery call |
| Sequential wrong guesses | Confirmed | 20 sequential requests result in exactly five hash comparisons/updates |
| ~20 concurrent wrong guesses, strict five-guess cap | **Failed** | 20 comparisons, peak attempts 20 under a legal interleaving; four 400 and sixteen 429 responses |
| Correct code after limit reached | **Failed** | Sixth request succeeds after fifth wrong increment and before invalidation delete executes |
| Two simultaneous correct submissions | Confirmed at route/model level | Exactly one 200, one clean 400, one session.create call |
| Correct fifth request after four wrong ones | Confirmed | One session created |
| Concurrent row deletion during increment | Confirmed | Prisma P2025 maps to clean 400, no error log |
| Verify-code IP throttling | Confirmed in one instance | Requests 1–60 reach lookup; request 61 is 429 before lookup/hash |
| Shared throttle implementation | Confirmed | Both routes use rateLimit.ts; send has an independent 20-request allowance under its own key prefix |
| Legacy plaintext token use | Rejected | Plain pre-upgrade value fails HMAC comparison; no session created |

The twelve probes use actual route handlers, actual HMAC computation, actual rate limiter and Prisma-shaped atomic row mocks. They do **not** connect to PostgreSQL or send email. All twelve characterization tests pass; several deliberately assert a remaining defect. They are not twelve security acceptance passes.

## P1: F02 compares before reserving an allowed attempt

Location: `app/api/auth/verify-code/route.ts:48–66,77–82,98`.

Every request reads the token and compares its digest at line 57 **before** incrementing the wrong-attempt counter. All twenty requests can therefore read an outstanding token and evaluate their candidates. Atomic increments preserve all counts, but an unbounded `update({where:{id}, data:{attempts:{increment:1}}})` neither reserves one of five allowed guesses nor excludes exhausted rows.

The concurrent probe synchronously serializes each mocked row update (so no increment is lost), while allowing all reads/comparisons to run before deletions. Attempts reach 20. This is a valid schedule for separate awaited database operations; the comment claiming exact cap enforcement is incorrect. A 429 response does not mean the candidate was never checked.

A stronger reproduction establishes actual authentication past the limit:

1. Submit four wrong requests sequentially: attempts = 4.
2. Submit a fifth wrong request. Its atomic UPDATE completes: attempts = 5.
3. Hold that request immediately before its separate invalidation DELETE takes effect.
4. Submit the correct code as request six. The route reads the still-present token, does not test attempts, matches the digest and deletes by ID alone.
5. Exactly one session is created and request six returns 200. Releasing request five completes its already-too-late invalidation.

The test barrier represents a scheduling gap between independent SQL statements, not database loss or a non-atomic update. Real PostgreSQL reproduction remains useful to validate a fix, but is not needed to reject the “never more than five guesses” claim once this legal handler interleaving exists.

**Required correction:** make limit checking, comparison, counter mutation/consumption and ideally session creation one serialized token operation. One approach is a transaction with a row lock, rechecking expiry and attempts after obtaining the lock; another is a carefully specified bounded atomic reservation protocol. Do not merely check the stale `outstanding.attempts` value or add a cap check after comparison. Include exhausted/expired conditions in any successful consumption protocol.

Acceptance must include twenty wrong requests, a correct candidate beyond the boundary, mixed correct/wrong races, same-correct-code races, expiration while waiting and transaction failure. Capture comparisons/admitted attempts, not only final status codes or final persisted count.

## Correct-code double consumption is fixed

Location: `app/api/auth/verify-code/route.ts:98–100`.

The two-request test gives both requests a valid token snapshot. Atomic delete returns count 1 to one request and count 0 to the other. Only count 1 proceeds to session creation. Results are 200/400 with exactly one session call, and the loser receives the intended invalid-or-expired message rather than a server error.

This resolves the duplicate-session subcase. It does not resolve the exhaustion race described above. Token consumption and session creation are still separate operations: a session creation failure can consume the code without logging the user in; that availability issue was not the requested duplicate-consumption assertion.

## F03: successful-path fix verified, with two residual caveats

### New writes contain the digest, not the OTP

Location: `app/api/auth/send-code/route.ts:80,87–90` and `src/lib/otp.ts:38–44`.

Source search found one issuance create path. It uses the CSPRNG and persists hashCode(email, code). Runtime assertions verified the correct HMAC payload, a non-six-digit representation, delivery argument and lack of success-path output. The raw code intentionally appears in the outgoing email subject/text/HTML; that is the delivery channel, not database storage or an application log.

This does not prove that every historical database row is a digest. The commit contains no migration or blanket purge of old plaintext tokens; issuing another code clears that email's old tokens, but expired old rows may remain. The new verifier rejects a legacy plaintext token. We did not inspect production tables or log retention. Historical logs containing pre-fix codes are not retroactively removed (and those codes expire).

The existing unit test asserting that a particular digest does not contain the six-digit code as a substring is not a universal property: a hexadecimal digest can contain any short decimal substring by coincidence. The meaningful assertion is that the stored value is the full keyed digest and is not the plaintext token.

### P2: absent secrets use a publicly known fallback

Location: `src/lib/otp.ts:21,25–35`.

When both environment secrets are absent, the app proceeds using a string published in source. A probe independently derives the same HMAC from that public string. Under that configuration, database-read access plus the public code is enough to enumerate the six-digit search space; the promised second secret is absent. The warning does not supply protection. Production configuration was not inspected, so this is conditional, not a claim that production currently uses the fallback.

**Correction:** fail issuance with a configuration error if no sufficiently strong configured secret exists. A missing real secret must not downgrade to a public one. Document lifecycle of outstanding OTPs when changing the secret.

### Logging guarantee: raw delivery exceptions remain unredacted

Location: `app/api/auth/send-code/route.ts:98,110`.

The explicit code logger is gone. However, the catch logs the entire provider exception. The fault-injection probe supplies an exception containing the synthetic outbound subject; the console capture then contains the synthetic code. This demonstrates the absence of a redaction boundary. It is **not evidence that the installed Resend SDK normally includes email contents in errors**, and no real provider logs were inspected.

To claim “no log anywhere contains a live code,” log a bounded error classification/status or explicitly sanitize the provider error, rather than forwarding arbitrary payloads. Likewise use opaque client-facing errors instead of raw internal exception messages.

## Throttling assessment

Both routes use `src/lib/rateLimit.ts` with distinct prefixes: `send-code:` (20 per ten minutes) and `verify-code:` (60 per ten minutes). The verify budget is now present and tested before body/DB processing. It is shared code, **not one combined 20-request budget**.

The limiter remains in-memory per instance, resets on cold start, and depends on trusted proxy IP headers. It does not enforce a deployment-wide allowance. The twenty-request race fits within the verify limit anyway, so throttling does not cure F02. No distributed-limit claim is made.

## Validation and scope

- Existing suite: 104 tests passed in seven files.
- Review probes: 12 passed; see [output](auth-results.txt) and [source](auth.probe.ts).
- Production build, type checking and lint: final results recorded in [validation](validation.txt).
- Build command: `npx next build`; migration-bearing `npm run build` was not used.
- No production DB queries, OTP issuance, actual mail delivery, migrations, restore or rotation were performed by the probes.
- The locally referenced Next.js docs directory is still absent, as documented in the prior review. This change only adds Vitest review artifacts and documentation; no Next API implementation was changed.
- An initial parallel typecheck collided with build-generated `.next/types` cleanup; it was rerun sequentially. A test-spy typing error involving randomInt's overloaded signature was corrected before final validation. Neither was a product defect.

Reproduce from repo root:

```sh
npx vitest run --config docs/reviews/1.60.1/vitest.config.mts
npm test
npx next build
npx tsc --noEmit
npm run lint
```

The `.probe.ts` filename keeps characterization cases out of the default regression suite. Replace defect assertions with desired acceptance assertions when F02 is corrected. The v1.60.0 probes remain historical evidence and should not be treated as current acceptance tests.

## Next batch

F07, F08 and F09 remain pending. No repair work was started because the user explicitly conditioned that batch on **both** auth findings being confirmed resolved, and F02 failed re-verification. The next auth correction should be re-tested before proceeding to restore-field preservation, complete/consistent backup restoration and key-ID-aware rotation.
