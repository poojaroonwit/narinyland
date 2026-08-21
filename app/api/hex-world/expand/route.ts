import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { expandHexWorld, HexWorldServiceError, moveHexExpansion } from '@/lib/hex-world/service';

function errorResponse(error: unknown) {
  if (error instanceof HexWorldServiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error('/api/hex-world/expand error:', error);
  return NextResponse.json({ error: 'Failed to update Land expansion' }, { status: 500 });
}

function validCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= 10000;
}

export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;
    const { landId, expansionKey, anchorQ, anchorR } = await request.json();
    if (!landId || !expansionKey || !validCoord(anchorQ) || !validCoord(anchorR)) {
      return NextResponse.json({ error: 'landId, expansionKey, anchorQ and anchorR are required' }, { status: 400 });
    }
    return NextResponse.json(await expandHexWorld(access.configId, landId, expansionKey, anchorQ, anchorR));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;
    const { landId, expansionKey, anchorQ, anchorR } = await request.json();
    if (!landId || !expansionKey || !validCoord(anchorQ) || !validCoord(anchorR)) {
      return NextResponse.json({ error: 'landId, expansionKey, anchorQ and anchorR are required' }, { status: 400 });
    }
    return NextResponse.json(await moveHexExpansion(access.configId, landId, expansionKey, anchorQ, anchorR));
  } catch (error) {
    return errorResponse(error);
  }
}
