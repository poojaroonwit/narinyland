import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

const DEFAULT_AVATARS = ['👩', '👨', '🧑', '👧', '👦', '🧒'];

/**
 * POST /api/partners/sync
 * Registers or updates the current logged-in user as a Partner in this circle.
 * Reads user identity from the HttpOnly cookie + Redis session cache.
 * Automatically assigns the user to an unclaimed partner slot, or creates a new one.
 */
export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId, userId: sub } = access;

    // 2. Look up user info from Redis session cache
    const sessionRaw = await redis.get(`user_session:${sub}`);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;

    // Allow body fallback for name/avatar in case Redis cache is cold
    let bodyName: string | undefined;
    let bodyAvatar: string | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      bodyName = body.name;
      bodyAvatar = body.avatar;
    } catch {}

    const userName = session?.name || bodyName || 'Partner';
    const userAvatar = bodyAvatar; // only use body avatar if explicitly provided

    // 3. Check if this user already has a partner slot in this circle
    const existing = await prisma.partner.findFirst({
      where: {
        configId,
        OR: [{ userId: sub }, { partnerId: sub }, { id: sub }],
      },
    });

    if (existing) {
      // Update name if it changed (don't override avatar unless provided)
      const updateData: any = { name: userName, userId: existing.userId || sub };
      if (userAvatar) updateData.avatar = userAvatar;

      const updated = await prisma.partner.update({
        where: { id: existing.id },
        data: updateData,
      });

      return NextResponse.json({
        partnerId: updated.partnerId,
        name: updated.name,
        avatar: updated.avatar,
      });
    }

    // 4. No existing slot — find the first unclaimed partner slot (userId is null)
    const unclaimed = await prisma.partner.findFirst({
      where: { configId, userId: null },
      orderBy: { partnerId: 'asc' },
    });

    if (unclaimed) {
      const updated = await prisma.partner.update({
        where: { id: unclaimed.id },
        data: {
          name: userName,
          ...(userAvatar ? { avatar: userAvatar } : {}),
          userId: sub,
        },
      });

      return NextResponse.json({
        partnerId: updated.partnerId,
        name: updated.name,
        avatar: updated.avatar,
      });
    }

    // 5. All existing slots are claimed — create a new partner slot
    const allPartners = await prisma.partner.findMany({
      where: { configId },
      orderBy: { partnerId: 'asc' },
    });

    // Generate next sequential partnerId (partner1, partner2, partner3, ...)
    const existingNums = allPartners
      .map((p) => {
        const m = p.partnerId.match(/^partner(\d+)$/);
        return m ? parseInt(m[1]) : 0;
      })
      .filter(Boolean);
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const newPartnerId = `partner${nextNum}`;
    const defaultAvatar = userAvatar || DEFAULT_AVATARS[(nextNum - 1) % DEFAULT_AVATARS.length];

    const created = await prisma.partner.create({
      data: {
        partnerId: newPartnerId,
        name: userName,
        avatar: defaultAvatar,
        userId: sub,
        configId,
      },
    });

    return NextResponse.json({
      partnerId: created.partnerId,
      name: created.name,
      avatar: created.avatar,
    });
  } catch (error) {
    console.error('POST /api/partners/sync error:', error);
    return NextResponse.json({ error: 'Failed to sync partner' }, { status: 500 });
  }
}
