/** Review probes of commit 7c86026. All DB and mail I/O is replaced.
 * Defect-characterization assertions passing means reproduced, not fixed.
 * Mock row operations serialize synchronously, as atomic DB writes would;
 * explicit barriers expose legal gaps between separate route statements. */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
const m = vi.hoisted(() => ({
  prisma: {
    verificationToken: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    user: { findUnique: vi.fn() }, session: { create: vi.fn() },
  },
  configured: vi.fn(), send: vi.fn(), hashes: vi.fn(),
}));
vi.mock('@/src/lib/prisma', () => ({ prisma: m.prisma }));
vi.mock('@/src/lib/auth', () => ({ SESSION_COOKIE: 'tally_session' }));
vi.mock('@/src/lib/mail', () => ({ isEmailConfigured: m.configured, sendVerificationCodeEmail: m.send }));
vi.mock('@/src/lib/otp', async importOriginal => {
  const real = await importOriginal<typeof import('../../../src/lib/otp')>();
  return { hashCode: (email: string, code: string) => { m.hashes(email, code); return real.hashCode(email, code); } };
});
import { POST as send } from '../../../app/api/auth/send-code/route';
import { POST as verify } from '../../../app/api/auth/verify-code/route';
import { hashCode } from '../../../src/lib/otp';
const email = 'review@example.invalid';
const liveCode = '483927'; // Synthetic only; never sent to an external provider.
let ip = 0;
let currentIp = '';
const req = (body: unknown, address = currentIp) => new Request('http://localhost/api/auth/review', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': address }, body: JSON.stringify(body),
});
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}
function tokenState() {
  const state = { exists: true, attempts: 0, peak: 0 };
  const digest = hashCode(email, liveCode);
  m.hashes.mockClear();
  m.prisma.verificationToken.findFirst.mockImplementation(async () => state.exists ? { id: 'token', code: digest, attempts: state.attempts } : null);
  m.prisma.verificationToken.update.mockImplementation(async ({ data }) => {
    expect(data.attempts).toEqual({ increment: 1 });
    state.attempts += data.attempts.increment;
    state.peak = Math.max(state.peak, state.attempts);
    return { id: 'token', attempts: state.attempts };
  });
  m.prisma.verificationToken.deleteMany.mockImplementation(async () => {
    const count = Number(state.exists); state.exists = false; return { count };
  });
  return state;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('AUTH_SECRET', 'synthetic-review-only-secret');
  currentIp = `review-ip-${++ip}`;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  m.configured.mockReturnValue(true);
  m.send.mockResolvedValue(undefined);
  m.prisma.user.findUnique.mockResolvedValue({ id: 'user', name: 'Review', email, role: 'MEMBER' });
  m.prisma.verificationToken.findFirst.mockResolvedValue(null);
  m.prisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
  m.prisma.session.create.mockResolvedValue({ id: 'session' });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
it('F03: issuance uses randomInt range, stores 64 hex HMAC, and does not log/return raw OTP', async () => {
  const random = vi.spyOn(crypto, 'randomInt').mockImplementation(() => Number(liveCode));
  const response = await send(req({ email }));
  expect(response.status).toBe(200);
  expect(random).toHaveBeenCalledWith(100000, 1000000);
  const stored = m.prisma.verificationToken.create.mock.calls[0][0].data.code;
  expect(stored).toMatch(/^[a-f0-9]{64}$/);
  expect(stored).not.toMatch(/^\d{6}$/);
  expect(stored).toBe(hashCode(email, liveCode));
  expect(m.send).toHaveBeenCalledWith(email, liveCode);
  expect(await response.text()).not.toContain(liveCode);
  expect(console.log).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
});
it('F03: unavailable email returns 503 and issues neither code nor database writes', async () => {
  m.configured.mockReturnValue(false);
  const random = vi.spyOn(crypto, 'randomInt');
  const r = await send(req({ email }));
  expect(r.status).toBe(503); expect((await r.json()).message).toContain('RESEND_API_KEY');
  expect(random).not.toHaveBeenCalled(); expect(m.prisma.verificationToken.create).not.toHaveBeenCalled();
  expect(m.prisma.verificationToken.deleteMany).not.toHaveBeenCalled(); expect(m.send).not.toHaveBeenCalled();
});
it('F02 baseline: sequential guesses stop after five comparisons', async () => {
  tokenState();
  for (let i = 0; i < 20; i++) await verify(req({ email, code: '999999' }));
  expect(m.hashes).toHaveBeenCalledTimes(5); expect(m.prisma.verificationToken.update).toHaveBeenCalledTimes(5);
  expect(m.prisma.session.create).not.toHaveBeenCalled();
});
it('F02 STILL OPEN: 20 concurrent wrong requests compare 20 codes and increment beyond five', async () => {
  const state = tokenState();
  const responses = await Promise.all(Array.from({ length: 20 }, () => verify(req({ email, code: '999999' }))));
  expect(m.hashes).toHaveBeenCalledTimes(20);
  expect(state.peak).toBe(20);
  expect(responses.filter(r => r.status === 400)).toHaveLength(4);
  expect(responses.filter(r => r.status === 429)).toHaveLength(16);
  expect(m.prisma.session.create).not.toHaveBeenCalled();
});
it('F02 consumption: two simultaneous correct requests create exactly one session, loser gets 400', async () => {
  tokenState();
  const responses = await Promise.all([verify(req({ email, code: liveCode })), verify(req({ email, code: liveCode }))]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
  expect(m.prisma.session.create).toHaveBeenCalledTimes(1);
  expect((await responses.find(r => r.status === 400)!.json()).message).toContain('Invalid or expired');
});
it('F02 STILL OPEN: correct sixth guess succeeds after fifth wrong increment but before invalidation', async () => {
  const state = tokenState();
  for (let i = 0; i < 4; i++) await verify(req({ email, code: '999999' }));
  const reachedDelete = deferred(), releaseDelete = deferred();
  m.prisma.verificationToken.deleteMany.mockImplementationOnce(async () => {
    reachedDelete.resolve(); await releaseDelete.promise;
    const count = Number(state.exists); state.exists = false; return { count };
  });
  const fifth = verify(req({ email, code: '999999' }));
  await reachedDelete.promise;
  expect(state.attempts).toBe(5);
  const sixth = await verify(req({ email, code: liveCode }));
  releaseDelete.resolve(); await fifth;
  expect(sixth.status).toBe(200); expect(m.prisma.session.create).toHaveBeenCalledTimes(1);
});
it('F03 caveat: configured-secret absence falls back to a public, reconstructible HMAC key', () => {
  vi.stubEnv('AUTH_SECRET', ''); vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', '');
  const publicKey = crypto.createHmac('sha256', 'tally-otp-fallback-secret-set-AUTH_SECRET-in-production').update('tally-otp-v1').digest();
  const publicDigest = crypto.createHmac('sha256', publicKey).update(`${email}:${liveCode}`).digest('hex');
  expect(hashCode(email, liveCode)).toBe(publicDigest);
});
it('F03 caveat: raw provider errors containing the synthetic OTP are logged unredacted', async () => {
  vi.spyOn(crypto, 'randomInt').mockImplementation(() => Number(liveCode));
  m.send.mockRejectedValue(new Error(`Synthetic provider exception; request subject: ${liveCode} is your Tally sign-in code`));
  expect((await send(req({ email }))).status).toBe(502);
  const args = vi.mocked(console.error).mock.calls.flat().map(x => x instanceof Error ? x.message : String(x));
  expect(args.join(' ')).toContain(liveCode);
});
it('throttle: verify request 61 rejected before database/hash access, send has independent 20 budget', async () => {
  for (let i = 0; i < 60; i++) expect((await verify(req({ email, code: '999999' }))).status).toBe(400);
  expect((await verify(req({ email, code: '999999' }))).status).toBe(429);
  expect(m.prisma.verificationToken.findFirst).toHaveBeenCalledTimes(60);
  m.prisma.user.findUnique.mockResolvedValue(null);
  for (let i = 0; i < 20; i++) expect((await send(req({ email }))).status).toBe(200);
  expect((await send(req({ email }))).status).toBe(429);
  expect(m.prisma.user.findUnique).toHaveBeenCalledTimes(20);
});
import { Prisma } from '@prisma/client';
it('F02 boundary: correct fifth request succeeds after four wrong requests', async () => {
  tokenState();
  for (let i = 0; i < 4; i++) await verify(req({ email, code: '999999' }));
  expect((await verify(req({ email, code: liveCode }))).status).toBe(200);
  expect(m.prisma.session.create).toHaveBeenCalledTimes(1);
});
it('F02 deletion race: missing row during increment is a clean 400, not 500', async () => {
  tokenState();
  m.prisma.verificationToken.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Synthetic missing token', { code: 'P2025', clientVersion: '6.19.3' }));
  expect((await verify(req({ email, code: '999999' }))).status).toBe(400);
  expect(console.error).not.toHaveBeenCalled();
});
it('F03 legacy: a pre-upgrade plaintext row cannot authenticate as a digest', async () => {
  tokenState();
  m.prisma.verificationToken.findFirst.mockResolvedValue({ id: 'token', code: liveCode, attempts: 0 });
  expect((await verify(req({ email, code: liveCode }))).status).toBe(400);
  expect(m.prisma.session.create).not.toHaveBeenCalled();
});
