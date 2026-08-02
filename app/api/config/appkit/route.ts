import { NextResponse } from 'next/server';
import { ensureSsoLaunchUrlConfigured, getAppKitApplicationId } from '@/lib/appkit-server';
import { getBoundarySsoLaunchUrl } from '@/lib/boundary-sso';

export const dynamic = 'force-dynamic';

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return null;
}

export async function GET(req: Request) {
  const clientId = readEnv('NEXT_PUBLIC_APPKIT_CLIENT_ID', 'APPKIT_CLIENT_ID');
  const domain = readEnv('NEXT_PUBLIC_APPKIT_DOMAIN', 'APPKIT_DOMAIN') || 'https://appkits.up.railway.app';
  const applicationId = getAppKitApplicationId();
  const ssoLaunchUrl = getBoundarySsoLaunchUrl(req);

  void ensureSsoLaunchUrlConfigured(ssoLaunchUrl).catch((err) => {
    console.warn('Runtime AppKit config ssoLaunchUrl sync failed:', err);
  });

  return NextResponse.json({
    clientId,
    domain,
    applicationId,
    ssoLaunchUrl,
    configured: Boolean(clientId),
  });
}
