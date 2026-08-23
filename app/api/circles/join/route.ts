import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getAuthSession, refreshSession } from '@/lib/auth-server';
import { ensureActiveLand } from '@/lib/config-access';
import { userCanSeeCircleWithToken } from '@/lib/circle-access';
import { getErrorMessage } from '@/lib/errors';

/**
 * POST /api/circles/join
 * Provision local Narinyland data only after AppKit proves the authenticated
 * user already belongs to/can see the requested circle. This route never uses
 * the application service token to self-add an arbitrary user to a circle.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { circleId?: unknown; userId?: unknown };
    const circleId = typeof body.circleId === 'string' ? body.circleId.trim() : '';
    if (!circleId || circleId.length > 128 || !/^[A-Za-z0-9_.-]+$/.test(circleId)) {
      return NextResponse.json({ error: 'Invalid circleId' }, { status: 400 });
    }

    const session = await getAuthSession(req);
    if (session.error || !session.userId) {
      return NextResponse.json({ error: session.error || 'unauthorized' }, { status: session.status || 401 });
    }
    if (body.userId && body.userId !== session.userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    let token = session.token;
    if (!token && await refreshSession()) {
      token = (await cookies()).get('appkit_access_token')?.value;
    }
    if (!token) {
      return NextResponse.json({ error: 'appkit_reauthentication_required' }, { status: 401 });
    }

    const isCircleMember = await userCanSeeCircleWithToken(token, circleId);
    if (!isCircleMember) {
      return NextResponse.json(
        { error: 'forbidden', error_description: 'An AppKit invitation or existing membership is required.' },
        { status: 403 }
      );
    }

    await prisma.appConfig.upsert({
      where: { id: circleId },
      create: { id: circleId },
      update: {},
    });
    await ensureActiveLand(circleId);

    await prisma.partner.upsert({
      where: { configId_partnerId: { configId: circleId, partnerId: session.userId } },
      create: {
        partnerId: session.userId,
        userId: session.userId,
        name: session.user?.name || 'Partner',
        avatar: session.user?.avatar || '',
        configId: circleId,
      },
      update: {
        userId: session.userId,
        ...(session.user?.name ? { name: session.user.name } : {}),
        ...(session.user?.avatar ? { avatar: session.user.avatar } : {}),
      },
    });

    return NextResponse.json({ success: true, circleId });
  } catch (err: unknown) {
    console.error('POST /api/circles/join error:', getErrorMessage(err));
    return NextResponse.json({ error: 'Failed to join circle' }, { status: 500 });
  }
}
