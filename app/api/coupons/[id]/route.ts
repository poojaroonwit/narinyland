import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { normalizeCouponPartner, normalizeCouponRewardPoints } from '@/lib/coupon-rewards';

type CouponUpdateBody = {
  title?: string;
  emoji?: string;
  desc?: string;
  color?: string;
  forPartner?: string;
  points?: number;
};

// PUT /api/coupons/[id]
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const params = await props.params;
    const id = params.id;
    const { configId } = access;
    const body = (await request.json()) as CouponUpdateBody;
    const points = body.points === undefined ? undefined : normalizeCouponRewardPoints(body.points);
    const recipient = body.forPartner === undefined ? undefined : normalizeCouponPartner(body.forPartner);
    const textFields: Array<[keyof Pick<CouponUpdateBody, 'title' | 'emoji' | 'desc' | 'color'>, number]> = [
      ['title', 120], ['emoji', 16], ['desc', 500], ['color', 64],
    ];
    if (points === null || recipient === null || textFields.some(([key, limit]) =>
      body[key] !== undefined && (typeof body[key] !== 'string' || !body[key]?.trim() || body[key]!.trim().length > limit)
    )) return NextResponse.json({ error: 'Invalid coupon fields or reward points' }, { status: 400 });
    if (recipient && !(await prisma.partner.findFirst({ where: { configId, partnerId: recipient }, select: { id: true } }))) {
      return NextResponse.json({ error: 'Coupon recipient not found' }, { status: 400 });
    }

    const existingCoupon = await prisma.coupon.findFirst({
      where: { id, configId },
      select: { id: true },
    });
    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }
    
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        title: body.title?.trim(),
        emoji: body.emoji?.trim(),
        desc: body.desc?.trim(),
        color: body.color?.trim(),
        forPartner: recipient,
        points,
      } satisfies Prisma.CouponUpdateInput
    });

    await redis.del(`app_config:${configId}`).catch((error) => console.error('Coupon committed; cache invalidation pending:', error));

    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

// DELETE /api/coupons/[id]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const params = await props.params;
    const id = params.id;
    const { configId } = access;

    const existingCoupon = await prisma.coupon.findFirst({
      where: { id, configId },
      select: { id: true },
    });
    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await prisma.coupon.delete({ where: { id } });
    await redis.del(`app_config:${configId}`).catch((error) => console.error('Coupon committed; cache invalidation pending:', error));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
