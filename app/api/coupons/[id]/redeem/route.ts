import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT /api/coupons/[id]/redeem
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;

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
        where: { configId: 'default', partnerId: coupon.forPartner },
        data: { 
          points: { increment: coupon.points },
          lifetimePoints: { increment: coupon.points }
        }
      });
    }

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error('Error redeeming coupon:', error);
    return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 });
  }
}
