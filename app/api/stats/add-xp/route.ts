import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

// ─── Duplicate Helper needed for Recalculation (or export from route.ts if possible, but duplication is safer for now)
function calculateLevel(totalXP: number): { level: number; xpInCurrentLevel: number; xpForNextLevel: number } {
  const level = Math.min(50, Math.floor(totalXP / 100) + 1);
  const xpInCurrentLevel = totalXP % 100;
  const xpForNextLevel = 100;
  return { level, xpInCurrentLevel, xpForNextLevel };
}

async function getTotalLifetimePoints(): Promise<number> {
  const partners = await prisma.partner.findMany({
    where: { configId: 'default' },
    select: { lifetimePoints: true }
  });
  return partners.reduce((sum, p) => sum + (p.lifetimePoints || 0), 0);
}

async function getTotalSpendablePoints(): Promise<number> {
  const partners = await prisma.partner.findMany({
    where: { configId: 'default' },
    select: { points: true }
  });
  return partners.reduce((sum, p) => sum + (p.points || 0), 0);
}

async function getPartnerPoints(): Promise<{ partner1: number; partner2: number }> {
    const partners = await prisma.partner.findMany({
        where: { configId: 'default' },
        select: { partnerId: true, points: true }
    });
    return {
        partner1: partners.find(p => p.partnerId === 'partner1')?.points || 0,
        partner2: partners.find(p => p.partnerId === 'partner2')?.points || 0
    };
}

// PUT /api/stats/add-xp
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { amount, partnerId } = body; 

    let targetPartnerId = partnerId || 'partner1';

    // Increment BOTH spendable points and lifetime points
    await prisma.partner.updateMany({
        where: { configId: 'default', partnerId: targetPartnerId },
        data: { 
          points: { increment: amount || 0 },
          lifetimePoints: { increment: amount || 0 }
        }
    });

    let stats = await prisma.loveStats.findUnique({ where: { id: 'default' } });
    if (!stats) stats = await prisma.loveStats.create({ data: { id: 'default' } });

    const prevLevel = stats.level;

    // Recalculate level from LIFETIME points
    const totalLifetimePoints = await getTotalLifetimePoints();
    const totalSpendablePoints = await getTotalSpendablePoints();
    
    const { level: newLevel, xpInCurrentLevel, xpForNextLevel } = calculateLevel(totalLifetimePoints);

    const updated = await prisma.loveStats.update({
      where: { id: 'default' },
      data: {
        xp: xpInCurrentLevel,
        level: newLevel,
        leaves: stats.leaves
      },
    });

    const partnerPoints = await getPartnerPoints();

    // Invalidate stats cache
    await redis.del('app_stats');

    return NextResponse.json({
      xp: xpInCurrentLevel,
      level: newLevel,
      xpForNextLevel,
      totalXP: totalLifetimePoints,
      leaves: updated.leaves,
      points: totalSpendablePoints,
      partnerPoints,
      leveledUp: newLevel > prevLevel,
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    return NextResponse.json({ error: 'Failed to add XP' }, { status: 500 });
  }
}
