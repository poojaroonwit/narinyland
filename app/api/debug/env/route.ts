import { NextResponse } from 'next/server';

export async function GET() {
  const secret = process.env.APPKIT_CLIENT_SECRET || '';
  const clientId = process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';
  const domain = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || '';
  
  return NextResponse.json({
    env: {
      NEXT_PUBLIC_APPKIT_CLIENT_ID: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
      NEXT_PUBLIC_APPKIT_DOMAIN: domain || 'MISSING',
      APPKIT_CLIENT_SECRET_SET: !!secret,
      APPKIT_CLIENT_SECRET_PREFIX: secret ? secret.substring(0, 4) : 'N/A',
      NODE_ENV: process.env.NODE_ENV,
    }
  });
}
