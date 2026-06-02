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

  const ok = checks.database === 'ok' && checks.redis === 'ok';

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      ...checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
