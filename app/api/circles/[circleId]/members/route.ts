import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import { getCircleMembersViaServer } from '@/lib/appkit-server';
import prisma from '@/lib/prisma';
import { getErrorMessage } from '@/lib/errors';

async function userCanAccessCircle(circleId: string, userId: string, isNameLogin: boolean): Promise<boolean> {
  const membership = await prisma.partner.findFirst({
    where: {
      configId: circleId,
      OR: isNameLogin ? [{ id: userId }, { userId }] : [{ userId }],
    },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { circleId } = await params;
  try {
    const session = await getAuthSession(req);
    if (session.error || !session.userId) {
      return NextResponse.json({ error: session.error || 'unauthorized' }, { status: session.status || 401 });
    }

    const isNameLogin = session.user?.authSource === 'name-login';
    if (!(await userCanAccessCircle(circleId, session.userId, isNameLogin))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const members = await getCircleMembersViaServer(circleId);
    return NextResponse.json({ success: true, members });
  } catch (err: unknown) {
    console.error(`GET /api/circles/${circleId}/members error:`, getErrorMessage(err));
    return NextResponse.json({ error: 'Failed to load circle members' }, { status: 500 });
  }
}
