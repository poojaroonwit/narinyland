import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return null;
}

export async function GET() {
  const clientId = readEnv('NEXT_PUBLIC_APPKIT_CLIENT_ID', 'APPKIT_CLIENT_ID');
  const domain = readEnv('NEXT_PUBLIC_APPKIT_DOMAIN', 'APPKIT_DOMAIN') || 'https://appkits.up.railway.app';

  return NextResponse.json({
    clientId,
    domain,
    configured: Boolean(clientId),
  });
}
