import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { buyLeaf, StatsServiceError } from '@/lib/stats-service';

export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    return NextResponse.json(await buyLeaf(access.configId));
  } catch (error) {
    if (error instanceof StatsServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Error adding leaf:', error);
    return NextResponse.json({ error: 'Failed to add leaf' }, { status: 500 });
  }
}
