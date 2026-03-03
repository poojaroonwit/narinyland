import { NextResponse } from 'next/server';

const APPKIT_DOMAIN = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';

/**
 * Get a service-level token using client_credentials grant.
 * Used for admin operations (creating circles, adding members).
 */
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

// GET /api/circles — proxy to list user's circles (uses Bearer token from frontend)
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${APPKIT_DOMAIN}/api/v1/circles`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch circles' }, { status: 500 });
  }
}

// POST /api/circles — create a new circle (world)
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  const body = await request.json();
  const { name, description, userId } = body;

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  // Try with service token first; fall back to user's token
  const serviceToken = await getServiceToken();
  const bearerToken = serviceToken ? `Bearer ${serviceToken}` : authHeader;

  try {
    // Create the circle
    const createRes = await fetch(`${APPKIT_DOMAIN}/api/v1/circles`, {
      method: 'POST',
      headers: {
        Authorization: bearerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      // If circle creation isn't available via API, generate a local UUID-based world
      if (createRes.status === 404 || createRes.status === 405) {
        const localId = `world_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        return NextResponse.json({ id: localId, name, description, role: 'owner', isLocal: true });
      }
      return NextResponse.json({ error: err.message || 'Failed to create circle' }, { status: createRes.status });
    }

    const circle = await createRes.json();

    // Add the creator as owner/admin if userId provided
    if (userId && circle.id) {
      await fetch(`${APPKIT_DOMAIN}/api/v1/circles/${circle.id}/members`, {
        method: 'POST',
        headers: {
          Authorization: bearerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: 'owner' }),
      }).catch(() => {});
    }

    return NextResponse.json(circle);
  } catch (err) {
    // Fallback: generate a local world ID if AppKit circle creation fails
    const localId = `world_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    return NextResponse.json({ id: localId, name, description, role: 'owner', isLocal: true });
  }
}
