import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getStats } from '@/lib/stats-service';

export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    return NextResponse.json(await getStats(access.configId));
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
