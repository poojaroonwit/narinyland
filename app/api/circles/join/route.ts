import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addCircleMemberViaServer } from '@/lib/appkit-server';

/**
 * POST /api/circles/join
 * Adds the user to a circle in AppKit and ensures a local AppConfig +
 * default Land exist so the app can store data for this world.
 */
export async function POST(req: NextRequest) {
  try {
    const { circleId, userId } = await req.json();

    if (!circleId || !userId) {
      return NextResponse.json(
        { error: 'circleId and userId are required' },
        { status: 400 }
      );
    }

    // 1. Add member in AppKit (skip for local fallback IDs)
    if (!circleId.startsWith('world_')) {
      try {
        await addCircleMemberViaServer(circleId, userId);
      } catch (err: any) {
        console.warn('AppKit addMember failed:', err.message);
        // Continue anyway — the user may already be a member
      }
    }

    // 2. Ensure a local AppConfig row exists for this circle
    await prisma.appConfig.upsert({
      where: { id: circleId },
      create: { id: circleId },
      update: {},
    });

    // 3. Ensure at least one Land exists
    const existingLands = await prisma.land.findMany({
      where: { configId: circleId },
    });

    if (existingLands.length === 0) {
      await prisma.land.create({
        data: {
          name: 'Main Land',
          isActive: true,
          configId: circleId,
        },
      });
    }

    return NextResponse.json({ success: true, circleId });
  } catch (err: any) {
    console.error('POST /api/circles/join error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
