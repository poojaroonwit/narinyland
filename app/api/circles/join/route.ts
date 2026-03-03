import { NextResponse } from 'next/server';

const APPKIT_DOMAIN = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';

async function getServiceToken(): Promise<string | null> {
  const clientId = process.env.APPKIT_CLIENT_ID || process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';
  const clientSecret = process.env.APPKIT_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return null;

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'manage:groups',
    });
    const res = await fetch(`${APPKIT_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

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

  const serviceToken = await getServiceToken();
  const bearerToken = serviceToken ? `Bearer ${serviceToken}` : authHeader;

  try {
    const res = await fetch(`${APPKIT_DOMAIN}/api/v1/circles/${circleId}/members`, {
      method: 'POST',
      headers: {
        Authorization: bearerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, role: 'member' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // 409 = already a member, which is fine
      if (res.status === 409) return NextResponse.json({ success: true, circleId });
      return NextResponse.json({ error: err.message || 'Failed to join circle' }, { status: res.status });
    }

    return NextResponse.json({ success: true, circleId });
  } catch {
    return NextResponse.json({ error: 'Failed to join circle' }, { status: 500 });
  }
}
