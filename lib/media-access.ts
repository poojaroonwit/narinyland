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

export async function requireStorageKeyAccess(request: Request, key: string): Promise<NextResponse | null> {
  const configId = getConfigIdFromStorageKey(key);

  if (!configId) {
    if (allowUnscopedLegacyMediaAccess()) return null;

    return NextResponse.json(
      { error: 'legacy_media_requires_migration' },
      { status: 403 }
    );
  }

  const session = await getAuthSession(request);
  if (session.error || !session.userId) {
    return NextResponse.json(
      { error: session.error || 'unauthorized' },
      { status: session.status || 401 }
    );
  }

  const membership = await prisma.partner.findFirst({
    where: {
      configId,
      OR: [
        { id: session.userId },
        { userId: session.userId },
        { partnerId: session.userId },
      ],
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return null;
}
