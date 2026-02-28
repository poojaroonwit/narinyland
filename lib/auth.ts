import { AppKit } from 'alphayard-appkit';

/**
 * AlphaYard AppKit Authentication Library
 */

let appKitInstance: AppKit | null = null;

/**
 * Lazy initializer for AppKit client to ensure environment variables are captured
 */
export function getAppKit(): AppKit {
  if (!appKitInstance) {
    const domain = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';
    const clientId = process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';
    
    if (typeof window !== 'undefined') {
      console.log('AppKit SDK Initialization:', {
        domain,
        clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
        location: window.location.href
      });
      
      if (!clientId) {
        console.error('CRITICAL: NEXT_PUBLIC_APPKIT_CLIENT_ID is missing in the browser!');
      }
    }

    appKitInstance = new AppKit({
      clientId: clientId,
      domain: domain,
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      scopes: ['openid', 'profile', 'email'],
      storage: 'localStorage'
    });
  }
  return appKitInstance;
}

/**
 * Start the login/signup flow
 */
export async function login(): Promise<void> {
  const client = getAppKit();
  await client.login();
}

/**
 * Handle the OAuth callback
 */
export async function handleCallback(): Promise<boolean> {
  try {
    const client = getAppKit();
    await client.handleCallback();
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
  const client = getAppKit();
  const tokens = client.getTokens();
  return tokens?.accessToken || null;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return getAppKit().isAuthenticated();
}

/**
 * Get stored user info (Async)
 */
export async function getUser(): Promise<{ sub: string; name: string; email: string; picture: string } | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const client = getAppKit();
    if (!client.isAuthenticated()) return null;
    const user = await client.getUser();
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
  const client = getAppKit();
  await client.logout({
    post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
  });
}
