import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'unauthorized', error_description: 'Missing Authorization header' }, { status: 401 });
    }

    const domain = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';
    
    // Call the AppKit server-side to get user info.
    // This bypasses any client-side CORS or preflight issues and allows us to log errors.
    const response = await fetch(`${domain}/api/v1/users/me`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('AppKit /users/me proxy error:', {
        status: response.status,
        data,
        authHeader: authHeader.substring(0, 20) + '...',
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
