import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { pickCustomCategoryColors, isBuiltinCategory, CATEGORIES } from '@/src/data/categories';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Returns a clean #rrggbb string, or null if the input isn't a valid hex colour. */
function cleanHex(raw: unknown): string | null {
  return typeof raw === 'string' && HEX.test(raw.trim()) ? raw.trim().toLowerCase() : null;
}

export async function GET() {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const categories = await prisma.category.findMany({
      where: { householdId: auth.user.householdId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ status: 'ok', categories });
  } catch (error: unknown) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const householdId = auth.user.householdId;

    const icon = typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim().slice(0, 40) : null;
    const color = cleanHex(body.color);
    const bgColor = cleanHex(body.bgColor);
    const borderColor = cleanHex(body.borderColor);

    // --- Appearance override for a built-in category ------------------------
    const builtinKey = typeof body.builtinKey === 'string' ? body.builtinKey.trim() : '';
    if (builtinKey) {
      if (!isBuiltinCategory(builtinKey)) {
        return NextResponse.json({ status: 'error', message: 'Unknown built-in category' }, { status: 400 });
      }
      const base = CATEGORIES[builtinKey];
      // A household can rename a built-in; blank/whitespace resets to canonical.
      const rawName = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : undefined;
      const name = rawName !== undefined ? (rawName || base.name) : undefined;
      if (name && name.toLowerCase() !== base.name.toLowerCase()) {
        const lower = name.toLowerCase();
        const canonicalClash = Object.values(CATEGORIES).some(
          (c) => c.id !== builtinKey && c.name.toLowerCase() === lower,
        );
        const rowClash = await prisma.category.findFirst({
          where: { householdId, name: { equals: name, mode: 'insensitive' }, NOT: { builtinKey } },
        });
        if (canonicalClash || rowClash) {
          return NextResponse.json({ status: 'error', message: 'Another category already has that name' }, { status: 409 });
        }
      }
      const override = await prisma.category.upsert({
        where: { householdId_builtinKey: { householdId: householdId!, builtinKey } },
        create: {
          householdId,
          builtinKey,
          name: name ?? base.name,
          icon: icon ?? base.icon,
          color: color ?? base.color,
          bgColor: bgColor ?? base.bgColor,
          borderColor: borderColor ?? base.borderColor,
          createdById: auth.user.id,
        },
        update: {
          ...(name !== undefined ? { name } : {}),
          ...(icon ? { icon } : {}),
          ...(color ? { color } : {}),
          ...(bgColor ? { bgColor } : {}),
          ...(borderColor ? { borderColor } : {}),
        },
      });
      return NextResponse.json({ status: 'ok', category: override });
    }

    // --- Standalone custom category ---------------------------------------
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
    if (!name) {
      return NextResponse.json({ status: 'error', message: 'Category name is required' }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: { householdId, builtinKey: null, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      return NextResponse.json({ status: 'ok', category: existing });
    }

    const existingCount = await prisma.category.count({ where: { householdId, builtinKey: null } });
    const autoColors = pickCustomCategoryColors(existingCount);

    const category = await prisma.category.create({
      data: {
        name,
        icon: icon ?? 'Tag',
        color: color ?? autoColors.color,
        bgColor: bgColor ?? autoColors.bgColor,
        borderColor: borderColor ?? autoColors.borderColor,
        householdId,
        createdById: auth.user.id,
      },
    });

    return NextResponse.json({ status: 'ok', category });
  } catch (error: unknown) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to create category') },
      { status: 500 }
    );
  }
}
