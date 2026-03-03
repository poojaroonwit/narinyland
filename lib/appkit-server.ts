import { NextResponse } from 'next/server';

const APPKIT_DOMAIN = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';
const APPKIT_CLIENT_ID = process.env.APPKIT_CLIENT_ID || process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';
const APPKIT_CLIENT_SECRET = process.env.APPKIT_CLIENT_SECRET || '';

/**
 * Get a service-level accessToken using client_credentials grant.
 */
export async function getServiceToken(): Promise<string | null> {
  if (!APPKIT_CLIENT_ID || !APPKIT_CLIENT_SECRET) {
    console.warn('AppKit Service Token requested but APPKIT_CLIENT_ID/SECRET missing');
    return null;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: APPKIT_CLIENT_ID,
      client_secret: APPKIT_CLIENT_SECRET,
      // Using broad scopes to ensure we have permission for groups/circles
      scope: 'manage:all manage:groups circles:manage',
    });

    const res = await fetch(`${APPKIT_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('AppKit service token exchange failed:', err);
      return null;
    }
    
    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.error('AppKit getServiceToken error:', err);
    return null;
  }
}

/**
 * Get the AppKit Domain
 */
export function getAppKitDomain() {
  return APPKIT_DOMAIN;
}

/**
 * Get the AppKit Client ID (Application ID)
 */
export function getAppKitClientId() {
  return APPKIT_CLIENT_ID;
}
