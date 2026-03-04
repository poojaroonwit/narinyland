import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';

export async function GET(req: Request) {
  try {
    const { token, error, status } = await getAuthSession(req);
    
    if (error || !token) {
      console.warn('BFF /me: No session found:', { error, status });
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    
    console.log('BFF /me: Fetching user info from AppKit...');
    const response = await fetch(`${domain}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('BFF /me: AppKit rejected the session token:', { status: response.status, data });
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('BFF /me: Unexpected proxy failure:', error);
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    );
  }
}
