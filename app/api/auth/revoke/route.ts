import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const domain = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';
    const clientSecret = process.env.APPKIT_CLIENT_SECRET;

    if (!clientSecret) {
      console.error('APPKIT_CLIENT_SECRET is missing on the server');
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

    const response = await fetch(`${domain}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    // Revoke response is often empty
    let data = {};
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch(e) { /* ignore */ }
    }

    if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Revoke token proxy error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to proxy revoke token request' },
      { status: 500 }
    );
  }
}
