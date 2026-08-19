import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { HexWorldServiceError, placeHexBuilding } from '@/lib/hex-world/service';
import type { HexRotation } from '@/lib/hex-world/types';

function errorResponse(error: unknown) {
  if (error instanceof HexWorldServiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error('POST /api/hex-world/buildings error:', error);
  return NextResponse.json({ error: 'Failed to place building' }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;
    const body = await request.json();
    const { landId, buildingKey, anchorQ, anchorR, rotation } = body;
    if (!landId || !buildingKey || !Number.isInteger(anchorQ) || !Number.isInteger(anchorR) || !Number.isInteger(rotation)) {
      return NextResponse.json({ error: 'landId, buildingKey, anchorQ, anchorR and rotation are required' }, { status: 400 });
    }
    return NextResponse.json(await placeHexBuilding(access.configId, landId, {
      buildingKey,
      anchorQ,
      anchorR,
      rotation: rotation as HexRotation,
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
