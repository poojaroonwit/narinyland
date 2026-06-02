import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import { getConfigId } from '@/lib/get-config-id';
import prisma from '@/lib/prisma';

type GrantedConfigAccess = {
  configId: string;
  userId: string;
  isSoft: boolean;
};

type DeniedConfigAccess = {
  response: NextResponse;
};

export type ConfigAccess = GrantedConfigAccess | DeniedConfigAccess;

export function isConfigAccessDenied(access: ConfigAccess): access is DeniedConfigAccess {
  return 'response' in access;
}

/**
 * Confirms the signed-in user belongs to the requested circle/config.
 * The implicit default config remains allowed for legacy sessions until all
 * existing data is migrated into explicit circles.
 */
export async function requireConfigAccess(request: Request): Promise<ConfigAccess> {
  const session = await getAuthSession(request);

  if (session.error || !session.userId) {
    return {
      response: NextResponse.json(
        { error: session.error || 'unauthorized' },
        { status: session.status || 401 }
      ),
    };
  }

  const configId = getConfigId(request);
  const rawCircleId = request.headers.get('X-Circle-Id')?.trim();

  if (configId === 'default' && !rawCircleId) {
    return { configId, userId: session.userId, isSoft: !!session.isSoft };
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
    return {
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }

  return { configId, userId: session.userId, isSoft: !!session.isSoft };
}
