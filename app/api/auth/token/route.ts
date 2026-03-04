import { NextResponse } from 'next/server';

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

    return NextResponse.json(data);

  } catch (error) {
    console.error('Token proxy error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to proxy token request' },
      { status: 500 }
    );
  }
}
