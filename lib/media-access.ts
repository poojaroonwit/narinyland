import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { getConfigIdFromStorageKey } from '@/lib/media-key';

type LegacyMediaAccessEnv = {
  NODE_ENV?: string;
  ALLOW_LEGACY_UNSCOPED_MEDIA?: string;
};

export function allowUnscopedLegacyMediaAccess(env: LegacyMediaAccessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' || env.ALLOW_LEGACY_UNSCOPED_MEDIA === 'true';
}

export async function getStorageKeyConfigIds(key: string): Promise<string[]> {
  const scopedConfigId = getConfigIdFromStorageKey(key);
  if (scopedConfigId) return [scopedConfigId];

  const [memories, timelineEvents, letters] = await Promise.all([
    prisma.memory.findMany({ where: { s3Key: key }, select: { configId: true } }),
    prisma.timelineEvent.findMany({
      where: { OR: [{ mediaS3Key: key }, { mediaS3Keys: { has: key } }] },
      select: { configId: true },
    }),
    prisma.loveLetter.findMany({
      where: { mediaS3Key: key },
      select: { from: { select: { configId: true } } },
    }),
  ]);

  return Array.from(new Set([
    ...memories.map((memory) => memory.configId),
    ...timelineEvents.map((event) => event.configId),
    ...letters.map((letter) => letter.from.configId),
  ]));
}

export async function requireStorageKeyAccess(request: Request, key: string): Promise<NextResponse | null> {
  const configIds = await getStorageKeyConfigIds(key);
  if (configIds.length === 0) {
    if (allowUnscopedLegacyMediaAccess()) return null;
    return NextResponse.json({ error: 'legacy_media_requires_migration' }, { status: 403 });
  }

  const session = await getAuthSession(request);
  if (session.error || !session.userId) {
    return NextResponse.json(
      { error: session.error || 'unauthorized' },
      { status: session.status || 401 }
    );
  }

  const isNameLogin = session.user?.authSource === 'name-login';
  const membership = await prisma.partner.findFirst({
    where: {
      configId: { in: configIds },
      OR: isNameLogin
        ? [{ id: session.userId }, { userId: session.userId }]
        : [{ userId: session.userId }],
    },
    select: { id: true },
  });

  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return null;
}
