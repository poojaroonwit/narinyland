import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/coupons
export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { configId: 'default' },
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

// POST /api/coupons
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, emoji, desc, color, forPartner, points } = body;

    const coupon = await prisma.coupon.create({
      data: {
        title,
        emoji,
        desc,
        color,
        points: points || 0,
        forPartner: forPartner || 'partner1',
        configId: 'default',
      },
    });

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
