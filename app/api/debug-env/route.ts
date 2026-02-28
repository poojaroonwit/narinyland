import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_APPKIT_DOMAIN: process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'NOT_FOUND',
    NEXT_PUBLIC_APPKIT_CLIENT_ID: process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID ? 'FOUND (starts with ' + process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID.substring(0, 4) + '...)' : 'NOT_FOUND',
    APPKIT_CLIENT_SECRET: process.env.APPKIT_CLIENT_SECRET ? 'FOUND' : 'NOT_FOUND',
    NODE_ENV: process.env.NODE_ENV,
    TIMESTAMP: new Date().toISOString()
  });
}
