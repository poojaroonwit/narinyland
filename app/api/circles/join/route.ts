import { NextResponse } from 'next/server';
import { getServiceToken, getAppKitDomain } from '@/lib/appkit-server';

// POST /api/circles/join — join an existing circle by ID
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  const body = await request.json();
  const { circleId, userId } = body;

  if (!circleId) return NextResponse.json({ error: 'circleId is required' }, { status: 400 });
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  // For local world IDs (not AppKit circles), just return success — data is stored in Prisma
  if (circleId.startsWith('world_')) {
    return NextResponse.json({ success: true, circleId });
  }

  const domain = getAppKitDomain();
  const serviceToken = await getServiceToken();
  const bearerToken = serviceToken ? `Bearer ${serviceToken}` : authHeader;

  console.log(`User ${userId} attempting to join circle ${circleId}...`);

  try {
    const res = await fetch(`${domain}/api/v1/circles/${circleId}/members`, {
      method: 'POST',
      headers: {
        Authorization: bearerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, role: 'member' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('AppKit join circle failed:', {
        status: res.status,
        error: err.message || err.error_description || JSON.stringify(err)
      });
      
      // 409 = already a member, which is fine
      if (res.status === 409) return NextResponse.json({ success: true, circleId });
      
      // 400 Bad Request — could be because user is already member but coded as error, 
      // or invalid userId format.
      return NextResponse.json({ error: err.message || 'Failed to join circle' }, { status: res.status });
    }

    console.log(`Success: User ${userId} joined circle ${circleId}`);
    return NextResponse.json({ success: true, circleId });
  } catch (err: any) {
    console.error('Join circle exception:', err);
    return NextResponse.json({ error: 'Failed to join circle due to server error' }, { status: 500 });
  }
}

