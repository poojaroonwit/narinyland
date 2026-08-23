import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getStats } from '@/lib/stats-service';

/**
 * Legacy compatibility endpoint.
 *
 * Point awards must originate from server-authoritative game actions. Older
 * clients may still POST here while refreshing their HUD, so preserve the
 * authenticated response shape without accepting a caller-controlled reward.
 */
export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    return NextResponse.json(await getStats(access.configId));
  } catch (error) {
    console.error('Error refreshing points:', error);
    return NextResponse.json({ error: 'Failed to refresh points' }, { status: 500 });
  }
}
