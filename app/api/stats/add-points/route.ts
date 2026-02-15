import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function getTotalSpendablePoints(): Promise<number> {
  const partners = await prisma.partner.findMany({
    where: { configId: 'default' },
    select: { points: true }
  });
  return partners.reduce((sum, p) => sum + (p.points || 0), 0);
}

import { redis } from '@/lib/redis';

// POST /api/stats/add-points
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount } = body;
        if (!amount || typeof amount !== 'number') return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

        // Add to partner1 by default
        await prisma.partner.updateMany({
            where: { configId: 'default', partnerId: 'partner1' },
            data: { 
              points: { increment: amount },
              lifetimePoints: { increment: amount } // Increment total earned too
            }
        });

        // Invalidate stats cache
        await redis.del('app_stats');

        const total = await getTotalSpendablePoints();
        return NextResponse.json({ points: total });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to add points' }, { status: 500 });
    }
}
