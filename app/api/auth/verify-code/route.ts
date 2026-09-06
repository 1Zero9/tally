import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { SESSION_COOKIE } from '@/src/lib/auth';
import { hashCode } from '@/src/lib/otp';
import { isRateLimited, getClientIp } from '@/src/lib/rateLimit';
import crypto from 'crypto';

const INVALID_OR_EXPIRED = {
  status: 'error' as const,
  message: 'Invalid or expired verification code. Please request a new one.',
};

// Max wrong-code guesses allowed per issued code before it's invalidated.
// A 6-digit code has 1,000,000 combinations — without a cap, an attacker
// could brute-force it within the 15-minute expiry window.
const MAX_ATTEMPTS = 5;

// A looser per-IP budget than send-code's — legitimate typo retries are
// expected here — but still caps how many different emails' codes one
// source can throw guesses at, on top of the per-token MAX_ATTEMPTS cap.
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_REQUESTS = 60;

export async function POST(request: Request) {
  try {
    if (isRateLimited(`verify-code:${getClientIp(request)}`, IP_WINDOW_MS, IP_MAX_REQUESTS)) {
      return NextResponse.json(
        { status: 'error', message: 'Too many requests. Please wait a while before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const code = (body.code || '').trim();

    if (!email || !code) {
      return NextResponse.json(
        { status: 'error', message: 'Email and verification code are required.' },
        { status: 400 }
      );
    }

    // Look up any outstanding (unexpired) code for this email first, so we can
    // tell a wrong code apart from an expired/nonexistent one and rate-limit guesses.
    const outstanding = await prisma.verificationToken.findFirst({
      where: { email, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!outstanding) {
      return NextResponse.json(INVALID_OR_EXPIRED, { status: 400 });
    }

    // `outstanding` may be stale by the time we act on it (another request
    // could be concurrently consuming or incrementing this exact row) — so
    // the code comparison above is only ever used to pick a branch, never
    // to decide the outcome by itself. Every branch below re-validates
    // "is this token still within its guess budget" as part of the SAME
    // atomic write that accepts or records the guess, using a WHERE clause
    // Postgres evaluates against the row's true current state at the
    // instant the statement runs — not the possibly-stale value we read
    // above. This is what actually closes the race a naive "increment,
    // then separately check/delete" approach doesn't: a correct code
    // arriving the instant after the 5th wrong guess is recorded, but
    // before that guess's own cleanup runs, must still be rejected, and
    // only re-checking the budget at write-time (not at read-time) does that.
    const isCorrect = outstanding.code === hashCode(email, code);

    if (isCorrect) {
      const consumed = await prisma.verificationToken.deleteMany({
        where: { id: outstanding.id, attempts: { lt: MAX_ATTEMPTS } },
      });
      if (consumed.count === 0) {
        // Either already consumed by a concurrent request, or the guess
        // budget was already exhausted at the true moment of consumption —
        // never confirm which, to a client, either way.
        return NextResponse.json(INVALID_OR_EXPIRED, { status: 400 });
      }
    } else {
      const recorded = await prisma.verificationToken.updateMany({
        where: { id: outstanding.id, attempts: { lt: MAX_ATTEMPTS } },
        data: { attempts: { increment: 1 } },
      });
      if (recorded.count === 0) {
        // Already exhausted (or consumed/gone) by a concurrent request —
        // this guess was never actually counted against the budget.
        return NextResponse.json(
          { status: 'error', message: 'Too many incorrect attempts. Please request a new code.' },
          { status: 429 }
        );
      }
      // Read-after-write purely to word the response — never a decision
      // point for whether the guess counted; the write above already
      // enforced that atomically regardless of what this read sees.
      const fresh = await prisma.verificationToken.findUnique({ where: { id: outstanding.id }, select: { attempts: true } });
      if (!fresh || fresh.attempts >= MAX_ATTEMPTS) {
        // Budget just now exhausted — clean up proactively so the row
        // doesn't linger; deleteMany is a safe no-op if it's already gone.
        await prisma.verificationToken.deleteMany({ where: { id: outstanding.id } });
        return NextResponse.json(
          { status: 'error', message: 'Too many incorrect attempts. Please request a new code.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { status: 'error', message: 'Incorrect verification code.' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'User account not found.' },
        { status: 404 }
      );
    }

    // Create session in PostgreSQL
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      status: 'ok',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set secure cookie
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: unknown) {
    console.error('Failed to verify code:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Verification failed') },
      { status: 500 }
    );
  }
}
