import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { expandHexWorld, HexWorldServiceError } from '@/lib/hex-world/service';

function errorResponse(error: unknown) {
  if (error instanceof HexWorldServiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error('POST /api/hex-world/expand error:', error);
  return NextResponse.json({ error: 'Failed to expand Land' }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;
    const { landId, expansionKey } = await request.json();
    if (!landId || !expansionKey) return NextResponse.json({ error: 'landId and expansionKey are required' }, { status: 400 });
    return NextResponse.json(await expandHexWorld(access.configId, landId, expansionKey));
  } catch (error) {
    return errorResponse(error);
  }
}
