import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('appkit_access_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'unauthorized', error_description: 'No session cookie found' }, { status: 401 });
    }

    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    
    // Call the AppKit server-side to get user info.
    const response = await fetch(`${domain}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('AppKit /users/me proxy error:', {
        status: response.status,
        data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('User info proxy catch error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to proxy user info request' },
      { status: 500 }
    );
  }
}
