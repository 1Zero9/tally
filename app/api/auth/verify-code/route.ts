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

// Returned whenever a token is no longer usable for any reason once we've
// already read it — budget exhausted, expired since the initial read, or
// already consumed by a concurrent request. Deliberately IDENTICAL whether
// the guess that triggered it was actually correct or not: a wrong guess
// that lands after exhaustion and a correct guess that lands after
// exhaustion must be indistinguishable to the client, or the response text
// itself becomes an oracle for "was my last guess actually right".
const TOO_MANY_ATTEMPTS = {
  status: 'error' as const,
  message: 'Too many incorrect attempts. Please request a new code.',
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
    // could be concurrently consuming or incrementing this exact row, or
    // it could have expired in the meantime) — so the code comparison
    // above is only ever used to pick a branch, never to decide the
    // outcome by itself. Every branch below re-validates "is this token
    // still within its guess budget AND not expired" as part of the SAME
    // atomic write that accepts or records the guess, using a WHERE clause
    // Postgres evaluates against the row's true current state at the
    // instant the statement runs — not the possibly-stale value we read
    // above. This is what actually closes the race a naive "increment,
    // then separately check/delete" approach doesn't: a correct code
    // arriving the instant after the 5th wrong guess is recorded, but
    // before that guess's own cleanup runs, must still be rejected, and
    // only re-checking the budget (and expiry) at write-time does that.
    const isCorrect = outstanding.code === hashCode(email, code);
    const stillValid = { id: outstanding.id, attempts: { lt: MAX_ATTEMPTS }, expiresAt: { gt: new Date() } };

    if (isCorrect) {
      const consumed = await prisma.verificationToken.deleteMany({ where: stillValid });
      if (consumed.count === 0) {
        // Exhausted, expired, or already consumed by a concurrent request —
        // respond exactly like an exhausted wrong guess (see TOO_MANY_ATTEMPTS'
        // own comment): never let the response text reveal that THIS
        // particular guess actually happened to be correct.
        return NextResponse.json(TOO_MANY_ATTEMPTS, { status: 429 });
      }
    } else {
      const recorded = await prisma.verificationToken.updateMany({
        where: stillValid,
        data: { attempts: { increment: 1 } },
      });
      if (recorded.count === 0) {
        // Already exhausted/expired/consumed by a concurrent request —
        // this guess was never actually counted against the budget.
        return NextResponse.json(TOO_MANY_ATTEMPTS, { status: 429 });
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
