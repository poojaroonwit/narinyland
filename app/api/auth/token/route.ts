import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    const clientSecret = (process.env.APPKIT_CLIENT_SECRET || '').trim();

    if (!clientSecret) {
      console.error('APPKIT_CLIENT_SECRET is missing or empty on the server');
      return NextResponse.json(
        { error: 'server_error', error_description: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Prepare the form data to send to AppKit
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    
    // Inject the client secret
    params.append('client_secret', clientSecret);

    console.log('Proxying token request to AppKit...', { 
      grant_type: body.grant_type, 
      client_id: body.client_id,
      domain
    });

    const response = await fetch(`${domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('AppKit token exchange error:', {
          status: response.status,
          data,
          clientId: body.client_id
        });
        return NextResponse.json(data, { status: response.status });
    }

    // --- BFF IMPLEMENTATION ---
    // Set the access token as an HttpOnly, Secure, SameSite cookie
    const cookieStore = await cookies();
    
    if (data.access_token) {
      cookieStore.set('appkit_access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.expires_in || 3600, // Default to 1 hour
        path: '/',
      });
    }

    if (data.refresh_token) {
      cookieStore.set('appkit_refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 3600, // 30 days
        path: '/',
      });
    }

    // Set a non-HttpOnly metadata cookie for frontend UI logic
    cookieStore.set('narinyland_is_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 3600,
      path: '/',
    });

    // We still return data to the frontend so the SDK can complete its internal flow,
    // but the sensitive parts are now also securely in cookies.
    return NextResponse.json(data);

  } catch (error) {
    console.error('Token proxy error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to proxy token request' },
      { status: 500 }
    );
  }
}
