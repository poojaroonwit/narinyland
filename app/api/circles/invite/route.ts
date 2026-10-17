import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import { userCanSeeCircleWithToken, requireCircleAdmin } from '@/lib/circle-access';
import { addCircleMemberViaServer, getCircleMembersViaServer } from '@/lib/appkit-server';

const SAFE_ID = /^[A-Za-z0-9_.-]{1,128}$/;

// Administrators explicitly grant membership to a known AppKit user.
// A world code alone never grants access to a private shared world.
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (session.error || !session.userId || !session.token) {
      return NextResponse.json({ error: 'Sign in with AppKit to manage world access.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { circleId?: unknown; targetUserId?: unknown };
    const circleId = typeof body.circleId === 'string' ? body.circleId.trim() : '';
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
    if (!SAFE_ID.test(circleId) || !SAFE_ID.test(targetUserId)) {
      return NextResponse.json({ error: 'Valid world and AppKit user IDs are required.' }, { status: 400 });
    }
    if (!await userCanSeeCircleWithToken(session.token, circleId)) {
      return NextResponse.json({ error: 'You do not have access to this world.' }, { status: 403 });
    }
    const denied = await requireCircleAdmin(circleId, session.userId);
    if (denied) return denied;

    await addCircleMemberViaServer(circleId, targetUserId, 'member');
    const freshMembers = await getCircleMembersViaServer(circleId, true);
    const verified = freshMembers.some((member) => member.userId === targetUserId);
    return NextResponse.json({
      success: true,
      status: verified ? 'active' : 'awaiting_verification',
      circleId,
      targetUserId,
    });
  } catch (error) {
    console.error('World member access grant failed:', error);
    return NextResponse.json({ error: 'Could not grant partner access. Check the AppKit user ID and try again.' }, { status: 502 });
  }
}
