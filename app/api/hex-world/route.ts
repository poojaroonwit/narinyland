import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getOrCreateHexWorldSnapshot, HexWorldServiceError } from '@/lib/hex-world/service';

function errorResponse(error: unknown) {
  if (error instanceof HexWorldServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error('GET /api/hex-world error:', error);
  return NextResponse.json({ error: 'Failed to load HexWorld' }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;
    const landId = new URL(request.url).searchParams.get('landId');
    if (!landId) return NextResponse.json({ error: 'landId is required' }, { status: 400 });
    return NextResponse.json(await getOrCreateHexWorldSnapshot(access.configId, landId));
  } catch (error) {
    return errorResponse(error);
  }
}
