import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

    if (outstanding.code !== hashCode(email, code)) {
      // Atomic increment (a single SQL UPDATE ... SET attempts = attempts + 1)
      // rather than a read-then-write — Postgres serializes concurrent
      // updates to the same row, so this holds the cap exactly even under
      // many simultaneous wrong guesses, unlike a separate read+increment+write.
      let updated;
      try {
        updated = await prisma.verificationToken.update({
          where: { id: outstanding.id },
          data: { attempts: { increment: 1 } },
        });
      } catch (err: unknown) {
        // A concurrent guess already pushed this row past MAX_ATTEMPTS and
        // deleted it between our findFirst and this update — same outcome
        // as never having found it, not a server error.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          return NextResponse.json(INVALID_OR_EXPIRED, { status: 400 });
        }
        throw err;
      }
      if (updated.attempts >= MAX_ATTEMPTS) {
        // Invalidate the code entirely after too many wrong guesses — the
        // user must request a fresh one rather than keep guessing.
        // deleteMany (not delete): a safe no-op if another concurrent
        // request already removed this same row.
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

    // Consume the token atomically — deleteMany reports how many rows it
    // actually removed, so if a concurrent request with the same correct
    // code already consumed it, this one backs off instead of also
    // succeeding (which would otherwise let one code mint two sessions).
    const consumed = await prisma.verificationToken.deleteMany({ where: { id: outstanding.id } });
    if (consumed.count === 0) {
      return NextResponse.json(INVALID_OR_EXPIRED, { status: 400 });
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
