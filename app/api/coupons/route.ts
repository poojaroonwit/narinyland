import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { normalizeCouponPartner, normalizeCouponRewardPoints } from '@/lib/coupon-rewards';

// GET /api/coupons
export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const coupons = await prisma.coupon.findMany({
      where: { configId },
      orderBy: { createdAt: 'asc' },
    });

    const response = coupons.map((c) => ({
      id: c.id,
      title: c.title,
      emoji: c.emoji,
      desc: c.desc,
      color: c.color,
      for: c.forPartner,
      isRedeemed: c.isRedeemed,
      redeemedAt: c.redeemedAt,
      points: c.points,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

function readBoundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

// POST /api/coupons
export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid coupon payload' }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const title = readBoundedText(input.title, 120);
    const emoji = readBoundedText(input.emoji, 16);
    const desc = readBoundedText(input.desc, 500);
    const color = readBoundedText(input.color, 64);
    const forPartner = normalizeCouponPartner(input.forPartner);
    const points = normalizeCouponRewardPoints(input.points);

    if (!title || !emoji || !desc || !color || !forPartner || points === null) {
      return NextResponse.json({ error: 'Invalid coupon fields or reward points' }, { status: 400 });
    }

    const recipient = await prisma.partner.findFirst({
      where: { configId, partnerId: forPartner },
      select: { id: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: 'Coupon recipient not found' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        title,
        emoji,
        desc,
        color,
        points,
        forPartner,
        configId,
      },
    });

    await redis.del(`app_config:${configId}`);

    return NextResponse.json({
      id: coupon.id,
      title: coupon.title,
      emoji: coupon.emoji,
      desc: coupon.desc,
      color: coupon.color,
      for: coupon.forPartner,
      isRedeemed: coupon.isRedeemed,
      redeemedAt: coupon.redeemedAt,
      points: coupon.points,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
