import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

// POST /api/stats/quest-complete
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questText, completedBy } = body;

    await prisma.questLog.create({
      data: {
        questText,
        completedBy,
      },
    });

    const stats = await prisma.loveStats.update({
      where: { id: 'default' },
      data: {
        questsCompleted: { increment: 1 },
      },
    });

    // Recalculate level
    const totalLifetimePoints = await getTotalLifetimePoints();
    const { level, xpInCurrentLevel } = calculateLevel(totalLifetimePoints);

    return NextResponse.json({
      xp: xpInCurrentLevel,
      level,
      totalXP: totalLifetimePoints,
      questsCompleted: stats.questsCompleted,
    });
  } catch (error) {
    console.error('Error completing quest:', error);
    return NextResponse.json({ error: 'Failed to complete quest' }, { status: 500 });
  }
}
