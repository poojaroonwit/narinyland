import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { HexWorldServiceError } from '@/lib/hex-world/service';
import { undoHexWorldMutation } from '@/lib/hex-world/undo-service';

function errorResponse(error: unknown) {
  if (error instanceof HexWorldServiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error('POST /api/hex-world/undo error:', error);
  return NextResponse.json({ error: 'Failed to undo building change' }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;
    const body = await request.json();
    const { landId, undoToken } = body;
    if (!landId || !undoToken || typeof undoToken !== 'string') {
      return NextResponse.json({ error: 'landId and undoToken are required' }, { status: 400 });
    }
    return NextResponse.json(await undoHexWorldMutation(
      { configId: access.configId, landId, userId: access.userId },
      undoToken,
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
