import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import { getCircleMembersViaServer } from '@/lib/appkit-server';
import prisma from '@/lib/prisma';

async function userCanAccessCircle(circleId: string, userId: string): Promise<boolean> {
  const membership = await prisma.partner.findFirst({
    where: {
      configId: circleId,
      OR: [{ id: userId }, { userId }, { partnerId: userId }],
    },
    select: { id: true },
  });
  return !!membership;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { circleId } = await params;
  try {
    const { token, userId, error, status } = await getAuthSession(req);
    if (error || !token || !userId) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    if (!(await userCanAccessCircle(circleId, userId))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Fetch members via server SDK (admin token)
    const members = await getCircleMembersViaServer(circleId);

    return NextResponse.json({ success: true, members });
  } catch (err: any) {
    console.error(`GET /api/circles/${circleId}/members error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
