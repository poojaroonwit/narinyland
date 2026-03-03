import { NextResponse } from 'next/server';
import { getServiceToken, getAppKitDomain, getAppKitClientId } from '@/lib/appkit-server';

// GET /api/circles — proxy to list user's circles (uses Bearer token from frontend)
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const domain = getAppKitDomain();
  try {
    const res = await fetch(`${domain}/api/v1/circles`, {
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

  const domain = getAppKitDomain();
  const clientId = getAppKitClientId();
  const serviceToken = await getServiceToken();
  const bearerToken = serviceToken ? `Bearer ${serviceToken}` : authHeader;

  try {
    // Attempt Admin API first (recommended for backend-to-backend creation)
    let createRes = await fetch(`${domain}/api/v1/admin/applications/${clientId}/circles`, {
      method: 'POST',
      headers: {
        Authorization: bearerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description, circleType: 'world' }),
    });

    // Fallback to standard User API if Admin API is not the right fit or 404
    if (!createRes.ok && (createRes.status === 404 || createRes.status === 405)) {
      createRes = await fetch(`${domain}/api/v1/circles`, {
        method: 'POST',
        headers: {
          Authorization: bearerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });
    }

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      console.error('AppKit circle creation failed:', err);
      
      // If circle creation is truly unavailable, return a local fallback ONLY if strictly necessary
      // but log it clearly so we know it's not a real AppKit circle.
      if (createRes.status === 404 || createRes.status === 405 || createRes.status === 403) {
         const localId = `world_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
         console.warn(`Falling back to local world ID: ${localId}`);
         return NextResponse.json({ id: localId, name, description, role: 'owner', isLocal: true });
      }
      
      return NextResponse.json({ error: err.message || 'Failed to create circle' }, { status: createRes.status });
    }

    const circle = await createRes.json();

    // Add the creator as owner if userId provided and not already done by the API
    if (userId && circle.id) {
      await fetch(`${domain}/api/v1/circles/${circle.id}/members`, {
        method: 'POST',
        headers: {
          Authorization: bearerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: 'owner' }),
      }).catch(e => console.error('Failed to add owner to new circle:', e));
    }

    return NextResponse.json(circle);
  } catch (err) {
    console.error('Circle creation exception:', err);
    const localId = `world_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    return NextResponse.json({ id: localId, name, description, role: 'owner', isLocal: true });
  }
}

