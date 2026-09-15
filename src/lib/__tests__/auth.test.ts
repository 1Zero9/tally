import { describe, it, expect, vi, beforeEach } from 'vitest';

// auth.ts's only external dependencies are the session cookie and Prisma —
// mock both so these tests exercise real request-identity logic without a
// database. See docs/technical-overview.md §3: getSessionUser() is the
// single source of truth for "who is making this request" on every route.
const findUnique = vi.fn();
const update = vi.fn();
vi.mock('@/src/lib/prisma', () => ({
  prisma: { session: { findUnique: (...args: unknown[]) => findUnique(...args), update: (...args: unknown[]) => update(...args) } },
}));

const getCookie = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: (...args: unknown[]) => getCookie(...args) })),
}));

import {
  getSessionUser,
  requireUser,
  requireHouseholdUser,
  requireAdmin,
  SESSION_COOKIE,
} from '../auth';

function makeSession(overrides: Partial<{
  expiresAt: Date;
  role: 'ADMIN' | 'MEMBER' | 'BACKUP_ADMIN';
  householdId: string | null;
}> = {}) {
  return {
    token: 'tok-1',
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    user: {
      id: 'user-1',
      name: 'Ada',
      email: 'ada@example.com',
      role: overrides.role ?? 'MEMBER',
      householdId: overrides.householdId === undefined ? 'household-1' : overrides.householdId,
    },
  };
}

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset().mockResolvedValue({});
  getCookie.mockReset();
});

describe('getSessionUser', () => {
  it('returns null when there is no session cookie', async () => {
    getCookie.mockReturnValue(undefined);
    expect(await getSessionUser()).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns null when the cookie token matches no session', async () => {
    getCookie.mockReturnValue({ value: 'missing-tok' });
    findUnique.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });

  it('returns null for an expired session, even if the row still exists', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ expiresAt: new Date(Date.now() - 1000) }));
    expect(await getSessionUser()).toBeNull();
  });

  it('maps a valid session to a SessionUser', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession());
    const user = await getSessionUser();
    expect(user).toEqual({
      id: 'user-1',
      name: 'Ada',
      email: 'ada@example.com',
      role: 'MEMBER',
      householdId: 'household-1',
    });
  });

  it('does not extend a session with plenty of remaining life', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    // 29 days left — comfortably above the 25-day refresh threshold.
    findUnique.mockResolvedValue(makeSession({ expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000) }));
    await getSessionUser();
    expect(update).not.toHaveBeenCalled();
  });

  it('slides the session forward once remaining life drops under the refresh threshold', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    // 10 days left — under the 25-day threshold, so it should be touched.
    findUnique.mockResolvedValue(makeSession({ expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }));
    await getSessionUser();
    expect(update).toHaveBeenCalledTimes(1);
    const call = update.mock.calls[0][0];
    expect(call.where).toEqual({ token: 'tok-1' });
    const newExpiry = call.data.expiresAt as Date;
    const expectedMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
    // Allow a little slack for time elapsed during the test itself.
    expect(Math.abs(newExpiry.getTime() - expectedMs)).toBeLessThan(5000);
  });

  it('reads the token from the documented session cookie name', async () => {
    getCookie.mockReturnValue(undefined);
    await getSessionUser();
    expect(getCookie).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it('does not let a failed session-refresh update reject the request', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }));
    update.mockRejectedValue(new Error('db unavailable'));
    // getSessionUser fires the refresh without awaiting it, so a rejected
    // update must not surface as an unhandled rejection or a thrown error
    // out of getSessionUser — the request is still allowed through.
    await expect(getSessionUser()).resolves.not.toBeNull();
  });
});

describe('requireUser', () => {
  it('rejects with 401 when there is no session', async () => {
    getCookie.mockReturnValue(undefined);
    const result = await requireUser();
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(401);
  });

  it('passes through any authenticated user, household or not', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ householdId: null }));
    const result = await requireUser();
    expect('user' in result).toBe(true);
    if ('user' in result) expect(result.user.householdId).toBeNull();
  });
});

describe('requireHouseholdUser', () => {
  it('rejects with 401 when there is no session', async () => {
    getCookie.mockReturnValue(undefined);
    const result = await requireHouseholdUser();
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(401);
  });

  it('rejects with 400 when the user has no household', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ householdId: null }));
    const result = await requireHouseholdUser();
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(400);
  });

  it('passes through a user who belongs to a household', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ householdId: 'household-1' }));
    const result = await requireHouseholdUser();
    expect('user' in result).toBe(true);
    if ('user' in result) expect(result.user.householdId).toBe('household-1');
  });
});

describe('requireAdmin', () => {
  it('rejects with 401 when there is no session', async () => {
    getCookie.mockReturnValue(undefined);
    const result = await requireAdmin();
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(401);
  });

  it('rejects with 400 when authenticated but no household (household check runs first)', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ householdId: null, role: 'MEMBER' }));
    const result = await requireAdmin();
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(400);
  });

  it('rejects a plain MEMBER with 403', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ role: 'MEMBER' }));
    const result = await requireAdmin();
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(403);
  });

  it('accepts ADMIN', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ role: 'ADMIN' }));
    const result = await requireAdmin();
    expect('user' in result).toBe(true);
  });

  it('accepts BACKUP_ADMIN with the same permission as ADMIN (documented parity)', async () => {
    getCookie.mockReturnValue({ value: 'tok-1' });
    findUnique.mockResolvedValue(makeSession({ role: 'BACKUP_ADMIN' }));
    const result = await requireAdmin();
    expect('user' in result).toBe(true);
  });
});
