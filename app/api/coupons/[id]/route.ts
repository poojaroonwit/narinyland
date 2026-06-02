import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

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
    const body = await request.json();

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
        title: body.title,
        emoji: body.emoji,
        desc: body.desc,
        color: body.color,
        forPartner: body.forPartner,
        points: body.points,
        redeemedAt: body.redeemedAt ? new Date(body.redeemedAt) : undefined,
      } as any
    });

    await redis.del(`app_config:${configId}`);

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
    await redis.del(`app_config:${configId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
