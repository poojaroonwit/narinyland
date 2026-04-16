import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import { getCircleMembersViaServer } from '@/lib/appkit-server';

export async function GET(
  req: NextRequest,
  { params }: { params: { circleId: string } }
) {
  try {
    const { circleId } = await params;

    let { token, error, status } = await getAuthSession(req);
    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    // Fetch members via server SDK (admin token)
    const members = await getCircleMembersViaServer(circleId);

    return NextResponse.json({ success: true, members });
  } catch (err: any) {
    console.error(`GET /api/circles/${params.circleId}/members error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
