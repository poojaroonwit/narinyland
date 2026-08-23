import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import { getConfigId, getExplicitConfigId } from '@/lib/get-config-id';
import prisma from '@/lib/prisma';

type GrantedConfigAccess = {
  configId: string;
  userId: string;
  isSoft: boolean;
  authSource?: 'appkit' | 'name-login';
};

type DeniedConfigAccess = { response: NextResponse };
export type ConfigAccess = GrantedConfigAccess | DeniedConfigAccess;

export function isConfigAccessDenied(access: ConfigAccess): access is DeniedConfigAccess {
  return 'response' in access;
}

export async function ensureActiveLand(configId: string): Promise<boolean> {
  const lands = await prisma.land.findMany({
    where: { configId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, isActive: true },
  });

  if (lands.length === 0) {
    await prisma.land.create({ data: { name: 'Main Land', isActive: true, configId } });
    return true;
  }

  if (!lands.some((land) => land.isActive)) {
    await prisma.land.update({ where: { id: lands[0].id }, data: { isActive: true } });
    return true;
  }

  return false;
}

function allowsLegacyDefaultAccess(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_LEGACY_DEFAULT_CONFIG === 'true';
}

/**
 * Confirms the authenticated user belongs to the requested circle/config.
 * AppKit identities must be explicitly bound through Partner.userId. A
 * human-readable/client-controlled partnerId is never accepted as AppKit
 * identity proof. The gated local name-login mode may match Partner.id.
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
  const explicitConfigId = getExplicitConfigId(request);
  if (configId === 'default' && !explicitConfigId && allowsLegacyDefaultAccess()) {
    return {
      configId,
      userId: session.userId,
      isSoft: !!session.isSoft,
      authSource: session.user?.authSource,
    };
  }

  const isNameLogin = session.user?.authSource === 'name-login';
  const membership = await prisma.partner.findFirst({
    where: {
      configId,
      OR: isNameLogin
        ? [{ id: session.userId }, { userId: session.userId }]
        : [{ userId: session.userId }],
    },
    select: { id: true },
  });

  if (!membership) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }

  return {
    configId,
    userId: session.userId,
    isSoft: !!session.isSoft,
    authSource: session.user?.authSource,
  };
}
