import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { updateCircleViaServer, deleteCircleViaServer } from '@/lib/appkit-server';
import { redis } from '@/lib/redis';
import { getErrorMessage } from '@/lib/errors';
import { requireCircleAdmin } from '@/lib/circle-access';

function validCircleId(circleId: string) {
  return Boolean(circleId) && circleId !== 'undefined' && circleId.length <= 128 && /^[A-Za-z0-9_.-]+$/.test(circleId);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { circleId } = await params;
  try {
    if (!validCircleId(circleId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    const session = await getAuthSession(req);
    if (session.error || !session.userId) {
      return NextResponse.json({ error: session.error || 'unauthorized' }, { status: session.status || 401 });
    }
    const adminRejection = await requireCircleAdmin(circleId, session.userId);
    if (adminRejection) return adminRejection;

    const body = await req.json().catch(() => ({})) as { name?: unknown; description?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 240) : undefined;
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    await updateCircleViaServer(circleId, { name, description }, session.token);
    const config = await prisma.appConfig.update({
      where: { id: circleId },
      data: { appName: name },
    }).catch(() => null);
    await redis.del(`app_config:${circleId}`).catch(() => {});
    return NextResponse.json({ success: true, circleId, name, config });
  } catch (err: unknown) {
    console.error(`PUT /api/circles/${circleId} error:`, getErrorMessage(err));
    return NextResponse.json({ error: 'Failed to update circle' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { circleId } = await params;
  try {
    if (!validCircleId(circleId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    const session = await getAuthSession(req);
    if (session.error || !session.userId) {
      return NextResponse.json({ error: session.error || 'unauthorized' }, { status: session.status || 401 });
    }
    const adminRejection = await requireCircleAdmin(circleId, session.userId);
    if (adminRejection) return adminRejection;

    await deleteCircleViaServer(circleId, session.token);
    await prisma.appConfig.delete({ where: { id: circleId } }).catch((error: unknown) => {
      console.warn(`Local AppConfig cleanup skip: ${getErrorMessage(error)}`);
    });
    await redis.del(`app_config:${circleId}`).catch(() => {});

    return NextResponse.json({ success: true, message: 'World deleted and data cleaned up' });
  } catch (err: unknown) {
    console.error(`DELETE /api/circles/${circleId} error:`, getErrorMessage(err));
    return NextResponse.json({ error: 'Failed to delete circle' }, { status: 500 });
  }
}
