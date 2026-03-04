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
          clientId = (config.clientId || clientId || '').trim();
          domain = (config.domain || domain || 'https://appkits.up.railway.app').trim();
          
          console.log('AppKit Config (Runtime Fetched):', { clientId: clientId ? `Available (${clientId.substring(0,8)}...)` : 'MISSING', domain });
        }
      } catch (err) {
        console.error('Failed to fetch runtime AppKit config:', err);
      }
    } else if (typeof window !== 'undefined') {
       clientId = (clientId || '').trim();
       domain = (domain || 'https://appkits.up.railway.app').trim();
       console.log('AppKit Config (Static):', { clientId: clientId ? 'Available' : 'MISSING', domain });
    }

    if (!domain) domain = 'https://appkits.up.railway.app';

    appKitInstance = new AppKit({
      clientId: clientId || '',
      domain: domain,
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      scopes: ['openid', 'profile', 'email'],
      storage: 'sessionStorage',
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = input.toString();
        // Proxy token exchange and revocation through our backend as usual, 
        // but now our backend will also set the HttpOnly cookies.
        if (urlStr.includes('/oauth/token')) {
          const rawParams = new URLSearchParams(init?.body as string);
          const bodyData = Object.fromEntries(rawParams);
          
          return globalThis.fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
          });
        }
        
        if (urlStr.includes('/oauth/revoke')) {
          const rawParams = new URLSearchParams(init?.body as string);
          const bodyData = Object.fromEntries(rawParams);
          
          return globalThis.fetch('/api/auth/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
          });
        }

        // Proxy "me" profile request
        if (urlStr.includes('/users/me')) {
          return globalThis.fetch('/api/auth/me');
        }
        
        return globalThis.fetch(input, init);
      }
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
    if (isInitializing) {
      console.warn('getAppKit called while initAppKit is in progress. This may result in using an uninitialized client.');
    } else {
      console.warn('getAppKit called before initAppKit started. Performing emergency synchronous fallback.');
    }
    // Emergency synchronous fallback
    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    const clientId = (process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '').trim();
    return new AppKit({
      clientId, 
      domain,
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      storage: 'sessionStorage'
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
    // If handleCallback fails because of stripped tokens, check our metadata cookie
    if (isAuthenticated()) {
      console.log('AppKit SDK reported callback error (likely due to stripped tokens), but session cookie is present. Considering success.');
      return true;
    }
    console.error('AppKit handleCallback error:', err);
    throw err;
  }
}

/**
 * Get the stored access token
 */
export function getAccessToken(): string | null {
  // In BFF mode, we don't return the raw access token to the frontend.
  // This helps enforce that all API calls must go through our backend.
  return null;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  // In BFF mode, we check for our non-HttpOnly metadata cookie
  return document.cookie.includes('narinyland_is_auth=true');
}

/**
 * Get stored user info (Async)
 */
export async function getUser(): Promise<{ sub: string; name: string; email: string; picture: string; attributes: Record<string, any> } | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!isAuthenticated()) return null;
    
    // Call our proxied "me" endpoint which uses the HttpOnly cookie
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    
    const user = await res.json();
    return {
      sub: user.id || user.sub,
      name: user.name || '',
      email: user.email || '',
      picture: user.avatar || user.picture || '',
      attributes: user.attributes || {}
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
  try {
    // Clear cookies on the server
    await fetch('/api/auth/logout', { method: 'POST' });
    
    // Also clear AppKit local storage state just in case
    await initAppKit();
    const client = getAppKit();
    await client.logout({
      post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
    });
  } catch (err) {
    console.error('Logout error:', err);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
/**
 * Get all circles/worlds the current user belongs to.
 * Proxied through our own backend to avoid CORS restrictions when calling
 * the AppKit API directly from the browser.
 */
export async function getUserCircles(): Promise<Array<{ id: string; name: string; description?: string; role: string; memberCount?: number; createdAt?: string }>> {
  try {
    if (typeof window === 'undefined') return [];
    await initAppKit();
    const client = getAppKit();
    if (!client.isAuthenticated()) return [];

    // Use our server-side proxy. The cookie will be attached automatically by the browser.
    const res = await fetch('/api/circles');
    if (!res.ok) return [];
    const data = await res.json();
    // API may return array directly or wrapped in { circles: [] }
    return Array.isArray(data) ? data : (data.circles || data.data || []);
  } catch (err) {
    console.error('getUserCircles error:', err);
    return [];
  }
}

/**
 * Update the current user's profile
 */
export async function updateProfile(data: { name?: string; avatar?: string; attributes?: Record<string, any> }): Promise<boolean> {
  try {
    await initAppKit();
    const client = getAppKit();
    
    const nameParts = data.name?.trim().split(/\s+/) || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    await client.updateProfile({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      avatar: data.avatar || undefined
    });

    if (data.attributes) {
      await client.updateAttributes(data.attributes);
    }
    
    return true;
  } catch (err) {
    console.error('AppKit updateProfile error:', err);
    return false;
  }
}
