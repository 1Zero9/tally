import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { isEmailConfigured, sendVerificationCodeEmail } from '@/src/lib/mail';
import { hashCode, isOtpSecretConfigured } from '@/src/lib/otp';
import { isRateLimited, getClientIp } from '@/src/lib/rateLimit';

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

// Coarse per-IP throttle, in addition to the per-email cooldown below — caps
// how many different email addresses a single source can probe in a short
// window. In-memory only (best-effort within one server instance; resets on
// redeploy/cold-start on serverless), but combined with the per-email
// cooldown and the verify-code attempt cap it meaningfully raises the bar
// for a single instance without adding infra dependencies.
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_REQUESTS = 20;

function isIpRateLimited(ip: string): boolean {
  return isRateLimited(`send-code:${ip}`, IP_WINDOW_MS, IP_MAX_REQUESTS);
}

// This app is single-tenant / invite-only: nobody can self-register. A code
// is only ever issued to an email that already exists as a User record
// (created by an admin via the "Share workspace" invite flow). We still
// return a generic success-shaped message either way so this endpoint can't
// be used to enumerate which emails have accounts.
const GENERIC_MESSAGE = 'If that email has access, a verification code has been sent.';

export async function POST(request: Request) {
  try {
    if (isIpRateLimited(getClientIp(request))) {
      return NextResponse.json(
        { status: 'error', message: 'Too many requests. Please wait a while before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { status: 'error', message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether the account exists — just look like success.
      return NextResponse.json({ status: 'ok', message: GENERIC_MESSAGE });
    }

    // Basic anti-spam: refuse to issue a new code if one was just sent.
    const recent = await prisma.verificationToken.findFirst({
      where: { email, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return NextResponse.json(
        { status: 'error', message: 'A code was already sent. Please wait a moment before requesting another.' },
        { status: 429 }
      );
    }

    // A passwordless app can't function without a real delivery channel —
    // fail loudly here rather than silently falling back to logging the
    // live code (which used to happen below; never do that).
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { status: 'error', message: 'Sign-in email isn’t configured yet. Ask an admin to set RESEND_API_KEY.' },
        { status: 503 }
      );
    }

    // Likewise, never silently hash codes with a secret known from reading
    // this app's own source — that provides no real protection at all.
    if (!isOtpSecretConfigured()) {
      return NextResponse.json(
        { status: 'error', message: 'Sign-in isn’t fully configured yet. Ask an admin to set AUTH_SECRET.' },
        { status: 503 }
      );
    }

    // Generate a 6-digit numeric OTP using a CSPRNG (not Math.random).
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Store only a keyed digest — never the live code — so reading this
    // table alone (a DB dump, a support person, a compromised log) can't
    // reveal a usable sign-in code. See src/lib/otp.ts.
    await prisma.verificationToken.deleteMany({ where: { email } });
    await prisma.verificationToken.create({
      data: {
        email,
        code: hashCode(email, code),
        expiresAt,
      },
    });

    try {
      await sendVerificationCodeEmail(email, code);
    } catch (emailError: unknown) {
      // Never log the raw exception — a provider error can plausibly echo
      // back parts of the outbound message (subject/body), which contains
      // the live code. Log only a bounded, safe classification instead.
      const errorType = emailError instanceof Error ? emailError.constructor.name : typeof emailError;
      console.error(`Failed to send verification email (error type: ${errorType})`);
      return NextResponse.json(
        { status: 'error', message: 'Failed to send the verification email. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: `A verification code has been sent to ${email}.`,
    });
  } catch (error: unknown) {
    console.error('Failed to send code:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to send code') },
      { status: 500 }
    );
  }
}
