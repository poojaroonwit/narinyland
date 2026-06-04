import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addCircleMemberViaServer } from '@/lib/appkit-server';
import { getAuthSession } from '@/lib/auth-server';
import { getErrorMessage } from '@/lib/errors';

/**
 * POST /api/circles/join
 * Adds the user to a circle in AppKit and ensures a local AppConfig +
 * default Land exist so the app can store data for this world.
 */
export async function POST(req: NextRequest) {
  try {
    const { circleId, userId } = await req.json();

    if (!circleId || typeof circleId !== 'string') {
      return NextResponse.json(
        { error: 'circleId is required' },
        { status: 400 }
      );
    }

    if (circleId.length > 128 || !/^[A-Za-z0-9_.-]+$/.test(circleId)) {
      return NextResponse.json({ error: 'Invalid circleId' }, { status: 400 });
    }

    const session = await getAuthSession(req);
    if (session.error || !session.userId) {
      return NextResponse.json({ error: session.error || 'unauthorized' }, { status: session.status || 401 });
    }

    if (userId && userId !== session.userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // 1. Add member in AppKit (skip for local fallback IDs)
    if (!circleId.startsWith('world_')) {
      try {
        await addCircleMemberViaServer(circleId, session.userId);
      } catch (err: unknown) {
        console.warn('AppKit addMember failed:', getErrorMessage(err));
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

    await prisma.partner.upsert({
      where: {
        configId_partnerId: {
          configId: circleId,
          partnerId: session.userId,
        },
      },
      create: {
        partnerId: session.userId,
        userId: session.userId,
        name: 'Partner',
        avatar: '',
        configId: circleId,
      },
      update: { userId: session.userId },
    });

    return NextResponse.json({ success: true, circleId });
  } catch (err: unknown) {
    console.error('POST /api/circles/join error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
