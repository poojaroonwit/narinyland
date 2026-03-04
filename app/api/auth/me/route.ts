import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';

export async function GET(req: Request) {
  try {
    let { token, error, status } = await getAuthSession(req);
    
    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    if (domain.endsWith('/')) domain = domain.slice(0, -1);
    
    // Helper to call AppKit /users/me
    const fetchMe = (t: string) => fetch(`${domain}/api/v1/users/me`, {
      headers: { 'Authorization': `Bearer ${t}`, 'Accept': 'application/json' },
    });

    let response = await fetchMe(token);

    // --- PROACTIVE SELF-HEALING: RETRY ON 401 ---
    if (response.status === 401) {
      console.log('BFF /me: Access token rejected by AppKit (401). Attempting proactive refresh...');
      const { refreshSession } = await import('@/lib/auth-server');
      const refreshed = await refreshSession();
      
      if (refreshed) {
        const { cookies } = await import('next/headers');
        token = (await cookies()).get('appkit_access_token')?.value || '';
        if (token) {
          console.log('BFF /me: Refresh succeeded, retrying original request...');
          response = await fetchMe(token);
        }
      }
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('BFF /me: AppKit rejected the session token:', { status: response.status, data });
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('BFF /me: Unexpected proxy failure:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
