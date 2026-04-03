import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCircleMembersViaServer } from '@/lib/appkit-server';
import { getAuthSession } from '@/lib/auth-server';

/**
 * GET /api/circles/[circleId]/members
 *
 * Returns the circle members from AppKit merged with local Partner records.
 * Each item: { userId, name, avatar, role, partnerId? }
 *
 * partnerId is set when the AppKit user has a matching Partner row in our DB
 * (matched via the userId field added to the Partner model).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { error, status } = await getAuthSession(req);
  if (error) {
    return NextResponse.json({ error }, { status: status || 401 });
  }

  const { circleId } = await params;

  // 1. Fetch real AppKit members
  const appkitMembers = await getCircleMembersViaServer(circleId);

  // 2. Fetch local Partner records for this circle (to get partnerId linkage)
  const localPartners = await prisma.partner.findMany({
    where: { configId: circleId },
    select: { partnerId: true, userId: true, name: true, avatar: true },
  });

  // Build userId → local partner map
  const byUserId = new Map(
    localPartners
      .filter((p) => p.userId)
      .map((p) => [p.userId!, p])
  );

  // 3. If AppKit returned members, merge them with local data
  if (appkitMembers.length > 0) {
    const merged = appkitMembers.map((m) => {
      const local = byUserId.get(m.userId);
      return {
        userId: m.userId,
        name: local?.name || m.name,
        avatar: local?.avatar || m.avatar || '👤',
        role: m.role,
        partnerId: local?.partnerId ?? null,
      };
    });
    return NextResponse.json(merged);
  }

  // 4. Fallback: return local Partner records (with or without userId)
  const fallback = localPartners.map((p) => ({
    userId: p.userId ?? null,
    name: p.name,
    avatar: p.avatar,
    role: 'member',
    partnerId: p.partnerId,
  }));

  return NextResponse.json(fallback);
}
