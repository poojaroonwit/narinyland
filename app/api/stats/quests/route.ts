import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/stats/quests
export async function GET() {
  try {
    const quests = await prisma.questLog.findMany({
      orderBy: { completedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(quests);
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
  }
}
