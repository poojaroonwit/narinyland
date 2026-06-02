import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

// PUT /api/coupons/[id]/redeem
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
        isRedeemed: true,
        redeemedAt: new Date(),
      },
    });

    // Add points to the partner who owns this coupon
    if (coupon.points > 0) {
      await prisma.partner.updateMany({
        where: { configId, partnerId: coupon.forPartner },
        data: {
          points: { increment: coupon.points },
          lifetimePoints: { increment: coupon.points }
        }
      });
    }

    await Promise.all([
      redis.del(`app_config:${configId}`),
      redis.del(`app_stats:${configId}`),
    ]);

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error('Error redeeming coupon:', error);
    return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 });
  }
}
