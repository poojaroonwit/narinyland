import { AppKit } from 'alphayard-appkit';

/**
 * AlphaYard AppKit Authentication Library
 * Using the Official SDK for more reliable endpoint handling
 */

// Hardcoded fallback for narinyland if env vars are missing
const DEFAULT_DOMAIN = 'https://appkits.up.railway.app';
const DEFAULT_CLIENT_ID = '132bb02d-212b-43dc-b74c-79a42f4dbffa';

const DOMAIN = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 
               process.env.EXT_PUBLIC_APPKIT_DOMAIN || 
               DEFAULT_DOMAIN;

const CLIENT_ID = process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || 
                  process.env.EXT_PUBLIC_APPKIT_CLIENT_ID || 
                  DEFAULT_CLIENT_ID;

if (typeof window !== 'undefined') {
  console.log('AppKit Debug Initialization:', {
    domain: DOMAIN,
    clientId: CLIENT_ID ? 'Available' : 'MISSING',
    source: process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID ? 'NEXT_PUBLIC' : 
            process.env.EXT_PUBLIC_APPKIT_CLIENT_ID ? 'EXT_PUBLIC' : 'Hardcoded Fallback'
  });
}

// Initialize the AppKit client
export const appKit = new AppKit({
  clientId: CLIENT_ID,
  domain: DOMAIN,
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
  scopes: ['openid', 'profile', 'email'],
  storage: 'localStorage'
});

/**
 * Start the login/signup flow
 */
export async function login(): Promise<void> {
  if (!CLIENT_ID) {
    console.error('AppKit Client ID is missing. Please check your environment variables.');
    alert('Configuration error: APP_ID is missing.');
    return;
  }
  
  // Use the SDK's login method which handles redirect + PKCE
  await appKit.login();
}

/**
 * Handle the OAuth callback
 */
export async function handleCallback(code: string, state: string): Promise<boolean> {
  // Use the SDK's handleCallback method
  // Note: the SDK might already read code/state from the URL if not provided,
  // but we pass them for clarity if our page already parsed them.
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
  // Use the SDK's getTokens method or just read from localStorage directly
  // The SDK stores it with a specific key.
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
 * Get stored user info
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
 * Logout — clear tokens and redirect to login
 */
export async function logout(): Promise<void> {
  await appKit.logout({
    post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
  });
}
