import { AppKit } from 'alphayard-appkit';

/**
 * AlphaYard AppKit Authentication Library
 */

let appKitInstance: AppKit | null = null;

let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Asynchronously initialize the AppKit client
 * This fetches the Client ID from the server at runtime, bypassing Next.js build-time injection issues on Railway.
 */
export async function initAppKit(): Promise<void> {
  if (appKitInstance) return;
  if (isInitializing && initPromise) return initPromise;
  
  isInitializing = true;
  initPromise = (async () => {
    let domain = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || '';
    let clientId = process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';

    // If variables failed to inject during the build step, fetch them at runtime from our API
    if (typeof window !== 'undefined' && (!clientId || !domain)) {
      try {
        const res = await fetch('/api/config/appkit');
        if (res.ok) {
          const config = await res.json();
          clientId = config.clientId || clientId;
          domain = config.domain || domain || 'https://appkits.up.railway.app';
          
          console.log('AppKit Config (Runtime Fetched):', { clientId: clientId ? `Available (${clientId.substring(0,8)}...)` : 'MISSING', domain });
        }
      } catch (err) {
        console.error('Failed to fetch runtime AppKit config:', err);
      }
    } else if (typeof window !== 'undefined') {
       console.log('AppKit Config (Build-time):', { clientId: clientId ? 'Available' : 'MISSING' });
    }

    if (!domain) domain = 'https://appkits.up.railway.app';

    appKitInstance = new AppKit({
      clientId: clientId || '',
      domain: domain,
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      scopes: ['openid', 'profile', 'email'],
      storage: 'localStorage'
    });
    
    isInitializing = false;
  })();

  return initPromise;
}

/**
 * Synchronous getter for AppKit client. 
 * Must call `await initAppKit()` at least once before using this.
 */
export function getAppKit(): AppKit {
  if (!appKitInstance) {
    console.warn('getAppKit called before initAppKit completed. Falling back to build-time environment variables.');
    // Emergency synchronous fallback
    const domain = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';
    const clientId = process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';
    return new AppKit({
      clientId, 
      domain,
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      storage: 'localStorage'
    });
  }
  return appKitInstance;
}

/**
 * Start the login/signup flow
 */
export async function login(): Promise<void> {
  await initAppKit();
  const client = getAppKit();
  await client.login();
}

/**
 * Handle the OAuth callback
 */
export async function handleCallback(): Promise<boolean> {
  try {
    await initAppKit();
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
    await initAppKit();
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
  await initAppKit();
  const client = getAppKit();
  await client.logout({
    post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
  });
}
