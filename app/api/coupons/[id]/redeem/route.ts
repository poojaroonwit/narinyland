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

    const result = await prisma.$transaction(async (tx) => {
      const existingCoupon = await tx.coupon.findFirst({
        where: { id, configId },
        select: {
          id: true,
          points: true,
          forPartner: true,
        },
      });

      if (!existingCoupon) {
        return { status: 'not_found' as const };
      }

      // Claim the reward exactly once. Concurrent/replayed requests see count=0
      // after the first successful transition and cannot award points again.
      const claimed = await tx.coupon.updateMany({
        where: {
          id,
          configId,
          isRedeemed: false,
        },
        data: {
          isRedeemed: true,
          redeemedAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        return { status: 'already_redeemed' as const };
      }

      if (existingCoupon.points > 0) {
        await tx.partner.updateMany({
          where: { configId, partnerId: existingCoupon.forPartner },
          data: {
            points: { increment: existingCoupon.points },
            lifetimePoints: { increment: existingCoupon.points },
          },
        });
      }

      const coupon = await tx.coupon.findUnique({ where: { id } });
      return { status: 'redeemed' as const, coupon };
    });

    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }
    if (result.status === 'already_redeemed') {
      return NextResponse.json({ error: 'Coupon already redeemed' }, { status: 409 });
    }

    await Promise.all([
      redis.del(`app_config:${configId}`),
      redis.del(`app_stats:${configId}`),
    ]);

    return NextResponse.json({ success: true, coupon: result.coupon });
  } catch (error) {
    console.error('Error redeeming coupon:', error);
    return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 });
  }
}
