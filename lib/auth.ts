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
      storage: 'localStorage',
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = input.toString();
        // Proxy token exchange and revocation through our backend APIs
        if (urlStr.endsWith('/oauth/token')) {
          // Parse x-www-form-urlencoded body to json to send to our proxy
          const rawParams = new URLSearchParams(init?.body as string);
          const bodyData = Object.fromEntries(rawParams);
          
          return globalThis.fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
          });
        }
        
        if (urlStr.endsWith('/oauth/revoke')) {
          const rawParams = new URLSearchParams(init?.body as string);
          const bodyData = Object.fromEntries(rawParams);
          
          return globalThis.fetch('/api/auth/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
          });
        }

        // Proxy "me" profile request through our backend to gain visibility into 401s
        if (urlStr.endsWith('/users/me')) {
          const headers = (init?.headers as any) || {};
          const auth = headers['Authorization'] || (typeof headers.get === 'function' ? headers.get('Authorization') : '');
          
          return globalThis.fetch('/api/auth/me', {
            headers: { 
              'Authorization': auth || '',
              'Accept': 'application/json'
            }
          });
        }
        
        // Let everything else pass through normally
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
      storage: 'localStorage',
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = input.toString();
        if (urlStr.endsWith('/oauth/token')) {
          const rawParams = new URLSearchParams(init?.body as string);
          return globalThis.fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(rawParams)),
          });
        }
        if (urlStr.endsWith('/oauth/revoke')) {
          const rawParams = new URLSearchParams(init?.body as string);
          return globalThis.fetch('/api/auth/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(rawParams)),
          });
        }
        if (urlStr.endsWith('/users/me')) {
          const headers = (init?.headers as any) || {};
          const auth = headers['Authorization'] || (typeof headers.get === 'function' ? headers.get('Authorization') : '');
          return globalThis.fetch('/api/auth/me', {
            headers: { 'Authorization': auth || '', 'Accept': 'application/json' }
          });
        }
        return globalThis.fetch(input, init);
      }
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
export async function getUser(): Promise<{ sub: string; name: string; email: string; picture: string; attributes: Record<string, any> } | null> {
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
      picture: user.avatar || '',
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
  await initAppKit();
  const client = getAppKit();
  await client.logout({
    post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
  });
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

    const tokens = client.getTokens();
    if (!tokens?.accessToken) return [];

    // Use our server-side proxy to avoid CORS (AppKit may not whitelist the app's origin)
    const res = await fetch('/api/circles', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` }
    });
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
