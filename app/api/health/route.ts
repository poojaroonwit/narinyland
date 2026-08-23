import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  // PostgreSQL is authoritative and required. Redis is an acceleration/undo
  // dependency with explicit graceful fallbacks, so its outage must not make
  // Railway evict an otherwise usable application instance.
  const serving = checks.database === 'ok';
  const fullyHealthy = serving && checks.redis === 'ok';

  return NextResponse.json(
    {
      status: fullyHealthy ? 'ok' : serving ? 'degraded' : 'error',
      ...checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: serving ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
