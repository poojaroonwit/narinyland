import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ─── Helper: Calculate level from total XP (1 exp = 1 point) ────────
function calculateLevel(totalXP: number): { level: number; xpInCurrentLevel: number; xpForNextLevel: number } {
  const level = Math.min(50, Math.floor(totalXP / 100) + 1);
  const xpInCurrentLevel = totalXP % 100;
  const xpForNextLevel = 100; // Always 100 XP per level
  return { level, xpInCurrentLevel, xpForNextLevel };
}

// ─── Helper: Get total XP from both partners' lifetime points ────────
async function getTotalLifetimePoints(): Promise<number> {
  const partners = await prisma.partner.findMany({
    where: { configId: 'default' },
    select: { lifetimePoints: true }
  });
  return partners.reduce((sum, p) => sum + (p.lifetimePoints || 0), 0);
}

// ─── Helper: Get total spendable points ──────────────────────────────
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

import { redis } from '@/lib/redis';

// GET /api/stats
export async function GET() {
  try {
    // Check Cache
    const cached = await redis.get('app_stats');
    if (cached) return NextResponse.json(JSON.parse(cached));

    let stats = await prisma.loveStats.findUnique({
      where: { id: 'default' },
    });

    if (!stats) {
      stats = await prisma.loveStats.create({
        data: { id: 'default' },
      });
    }

    // Calculate level from LIFETIME points (cumulative XP)
    const totalLifetimePoints = await getTotalLifetimePoints();
    const totalSpendablePoints = await getTotalSpendablePoints();
    
    // Level is based on LIFETIME points
    const { level, xpInCurrentLevel, xpForNextLevel } = calculateLevel(totalLifetimePoints);

    // Sync level back to DB (optional, but good for caching)
    if (stats.level !== level || stats.xp !== xpInCurrentLevel) {
      await prisma.loveStats.update({
        where: { id: 'default' },
        data: { level, xp: xpInCurrentLevel }
      });
    }

    const partnerPoints = await getPartnerPoints();

    const response = {
      xp: xpInCurrentLevel,
      level,
      xpForNextLevel,
      totalXP: totalLifetimePoints,
      leaves: stats.leaves,
      points: totalSpendablePoints, // Spendable points
      partnerPoints // Individual points
    };

    // Cache (60s)
    await redis.setex('app_stats', 60, JSON.stringify(response));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
