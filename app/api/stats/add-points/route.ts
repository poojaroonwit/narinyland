import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

async function getTotalSpendablePoints(configId: string): Promise<number> {
  const partners = await prisma.partner.findMany({
    where: { configId },
    select: { points: true }
  });
  return partners.reduce((sum, p) => sum + (p.points || 0), 0);
}

import { redis } from '@/lib/redis';

// POST /api/stats/add-points
export async function POST(request: Request) {
    try {
        const access = await requireConfigAccess(request);
        if (isConfigAccessDenied(access)) return access.response;

        const { configId } = access;
        const cacheKey = `app_stats:${configId}`;
        const body = await request.json();
        const { amount } = body;
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Add to partner1 by default
        await prisma.partner.updateMany({
            where: { configId, partnerId: 'partner1' },
            data: {
              points: { increment: amount },
              lifetimePoints: { increment: amount }
            }
        });

        // Invalidate stats cache
        await redis.del(cacheKey);

        const total = await getTotalSpendablePoints(configId);
        return NextResponse.json({ points: total });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to add points' }, { status: 500 });
    }
}
