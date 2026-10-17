import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getPurchasedItemDefinition, normalizePurchasedItemModelUrl } from '@/lib/purchased-item-catalog';
import { spendSharedPoints, StatsServiceError } from '@/lib/stats-service';
import { getErrorField } from '@/lib/errors';

function boundedCoordinate(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

async function createPaidItem(
  configId: string,
  data: { type: string; landId: string; x: number; y: number; z: number; rotation: number; modelUrl: string | null },
  price: number,
  requestId: string | null,
  retries = 2
) {
  try {
    return await prisma.$transaction(async (tx) => {
      if (requestId) {
        const existing = await tx.purchasedItem.findUnique({ where: { id: requestId } });
        if (existing) {
          if (existing.landId !== data.landId || existing.type !== data.type || existing.modelUrl !== data.modelUrl) throw new Error('Purchase request reused for a different item');
          return existing;
        }
      }
      await spendSharedPoints(tx, configId, price);
      return tx.purchasedItem.create({ data: { ...data, ...(requestId ? { id: requestId } : {}) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (retries > 0 && ['P2034', 'P2002'].includes(String(getErrorField(error, 'code')))) {
      return createPaidItem(configId, data, price, requestId, retries - 1);
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const landId = new URL(request.url).searchParams.get('landId');
    if (!landId) return NextResponse.json({ error: 'landId is required' }, { status: 400 });

    const land = await prisma.land.findFirst({ where: { id: landId, configId }, select: { id: true } });
    if (!land) return NextResponse.json({ error: 'Land not found' }, { status: 404 });

    const items = await prisma.purchasedItem.findMany({ where: { landId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const landId = typeof body.landId === 'string' ? body.landId : '';
    const requestId = typeof body.requestId === 'string' ? body.requestId : null;
    if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return NextResponse.json({ error: 'Invalid purchase request ID' }, { status: 400 });
    }
    const definition = getPurchasedItemDefinition(body.type);
    if (!definition || !landId) {
      return NextResponse.json({ error: 'Unknown shop item or missing landId' }, { status: 400 });
    }

    const land = await prisma.land.findFirst({ where: { id: landId, configId: access.configId }, select: { id: true } });
    if (!land) return NextResponse.json({ error: 'Land not found' }, { status: 404 });

    const modelUrl = normalizePurchasedItemModelUrl(definition, body.modelUrl, access.configId);
    if (definition.allowsCustomModel && !modelUrl) {
      return NextResponse.json({ error: 'A scoped uploaded model is required for this item' }, { status: 400 });
    }

    const item = await createPaidItem(access.configId, {
      type: definition.type,
      landId,
      x: boundedCoordinate(body.x, -100, 100, 0),
      y: boundedCoordinate(body.y, -20, 100, 0),
      z: boundedCoordinate(body.z, -100, 100, 0),
      rotation: boundedCoordinate(body.rotation, -Math.PI * 4, Math.PI * 4, 0),
      modelUrl,
    }, definition.price, requestId);

    await Promise.all([
      redis.del(`app_config:${access.configId}`),
      redis.del(`app_stats:${access.configId}`),
    ]).catch((error) => console.error('Purchase committed; cache invalidation pending:', error));

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof StatsServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating item:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to purchase item' }, { status: 500 });
  }
}
