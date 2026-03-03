import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getConfigId } from '@/lib/get-config-id';

function calculateLevel(totalXP: number): { level: number; xpInCurrentLevel: number; xpForNextLevel: number } {
  const level = Math.min(50, Math.floor(totalXP / 100) + 1);
  const xpInCurrentLevel = totalXP % 100;
  const xpForNextLevel = 100;
  return { level, xpInCurrentLevel, xpForNextLevel };
}

async function getTotalLifetimePoints(configId: string): Promise<number> {
  const partners = await prisma.partner.findMany({
    where: { configId },
    select: { lifetimePoints: true }
  });
  return partners.reduce((sum, p) => sum + (p.lifetimePoints || 0), 0);
}

async function getTotalSpendablePoints(configId: string): Promise<number> {
  const partners = await prisma.partner.findMany({
    where: { configId },
    select: { points: true }
  });
  return partners.reduce((sum, p) => sum + (p.points || 0), 0);
}

async function getPartnerPoints(configId: string): Promise<{ partner1: number; partner2: number }> {
    const partners = await prisma.partner.findMany({
        where: { configId },
        select: { partnerId: true, points: true }
    });
    return {
        partner1: partners.find(p => p.partnerId === 'partner1')?.points || 0,
        partner2: partners.find(p => p.partnerId === 'partner2')?.points || 0
    };
}

// POST /api/stats/add-leaf
export async function POST(request: Request) {
  const configId = getConfigId(request);
  const cacheKey = `app_stats:${configId}`;
  try {
    const COST_PER_LEAF = 100;

    const stats = await prisma.loveStats.findUnique({ where: { id: configId } });
    if (!stats) return NextResponse.json({ error: 'Stats not found' }, { status: 404 });

    // Check SPENDABLE points for cost
    const totalSpendablePoints = await getTotalSpendablePoints(configId);
    if (totalSpendablePoints < COST_PER_LEAF) {
      return NextResponse.json({ error: 'Not enough points (combined)' }, { status: 400 });
    }

    // Deduct from spendable points only (Richest pays first)
    const partners = await prisma.partner.findMany({
        where: { configId },
        orderBy: { points: 'desc' }
    });

    let remainingCost = COST_PER_LEAF;
    for (const p of partners) {
        if (remainingCost <= 0) break;
        const deduct = Math.min(p.points, remainingCost);
        if (deduct > 0) {
            await prisma.partner.update({
                where: { id: p.id },
                data: { 
                  points: { decrement: deduct }
                  // NO decrement to lifetimePoints!
                }
            });
            remainingCost -= deduct;
        }
    }

    const prevLevel = stats.level;

    // Recalculate level (based on LIFETIME points, which haven't changed)
    const totalLifetimePoints = await getTotalLifetimePoints(configId);
    const newTotalSpendable = await getTotalSpendablePoints(configId);

    const { level: currentLevel, xpInCurrentLevel } = calculateLevel(totalLifetimePoints);

    const updated = await prisma.loveStats.update({
      where: { id: configId },
      data: {
        leaves: { increment: 1 },
        xp: xpInCurrentLevel,
        level: currentLevel
      }
    });

    const partnerPoints = await getPartnerPoints(configId);

    // Invalidate stats cache
    await redis.del(cacheKey);

    return NextResponse.json({
      success: true,
      leaves: updated.leaves,
      points: newTotalSpendable,
      partnerPoints,
      xp: xpInCurrentLevel,
      level: currentLevel,
      totalXP: totalLifetimePoints,
      leveledUp: currentLevel > prevLevel
    });

  } catch (error) {
    console.error('Error adding leaf:', error);
    return NextResponse.json({ error: 'Failed to add leaf' }, { status: 500 });
  }
}
