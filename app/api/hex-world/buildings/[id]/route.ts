import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { HexWorldServiceError, removeHexBuilding, updateHexBuilding } from '@/lib/hex-world/service';

function errorResponse(error: unknown) {
  if (error instanceof HexWorldServiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error('/api/hex-world/buildings/[id] error:', error);
  return NextResponse.json({ error: 'Failed to update building' }, { status: 500 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;
    const { id } = await context.params;
    const body = await request.json();
    const { landId, anchorQ, anchorR, rotation } = body;
    if (!landId) return NextResponse.json({ error: 'landId is required' }, { status: 400 });
    if (anchorQ !== undefined && !Number.isInteger(anchorQ)) return NextResponse.json({ error: 'anchorQ must be an integer' }, { status: 400 });
    if (anchorR !== undefined && !Number.isInteger(anchorR)) return NextResponse.json({ error: 'anchorR must be an integer' }, { status: 400 });
    if (rotation !== undefined && !Number.isInteger(rotation)) return NextResponse.json({ error: 'rotation must be an integer' }, { status: 400 });
    return NextResponse.json(await updateHexBuilding(access.configId, landId, id, { anchorQ, anchorR, rotation }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const landId = body.landId;
    if (!landId) return NextResponse.json({ error: 'landId is required' }, { status: 400 });
    return NextResponse.json(await removeHexBuilding(access.configId, landId, id));
  } catch (error) {
    return errorResponse(error);
  }
}
