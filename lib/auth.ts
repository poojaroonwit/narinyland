import { AppKit } from 'alphayard-appkit';

/**
 * AlphaYard AppKit Authentication Library
 */

const DOMAIN = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';
const CLIENT_ID = process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';

// Initialize the AppKit client
export const appKit = new AppKit({
  clientId: CLIENT_ID,
  domain: DOMAIN,
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
  scopes: ['openid', 'profile', 'email'],
  storage: 'localStorage'
});

if (typeof window !== 'undefined') {
  console.log('AppKit Config (Client-Side):', {
    DOMAIN,
    CLIENT_ID: CLIENT_ID ? 'Available' : 'MISSING',
    raw_env: process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID
  });
}

/**
 * Start the login/signup flow
 */
export async function login(): Promise<void> {
  if (!CLIENT_ID) {
    console.warn('AppKit Client ID is missing. Attempting login anyway...');
  }
  await appKit.login();
}

/**
 * Handle the OAuth callback
 */
export async function handleCallback(): Promise<boolean> {
  try {
    await appKit.handleCallback();
    return true;
  } catch (err) {
    console.error('AppKit handleCallback error:', err);
    throw err;
  }
}

/**
 * Get the stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const tokens = appKit.getTokens();
  return tokens?.accessToken || null;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return appKit.isAuthenticated();
}

/**
 * Get stored user info (Async)
 */
export async function getUser(): Promise<{ sub: string; name: string; email: string; picture: string } | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!isAuthenticated()) return null;
    const user = await appKit.getUser();
    return {
      sub: user.id,
      name: user.name || '',
      email: user.email || '',
      picture: user.avatar || ''
    };
  } catch (err) {
    console.error('AppKit getUser error:', err);
    return null;
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  await appKit.logout({
    post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
  });
}
