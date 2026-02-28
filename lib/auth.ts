/**
 * AlphaYard AppKit Authentication Library
 * Handles OAuth2 Authorization Code flow with PKCE
 */

const DOMAIN = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app';
const CLIENT_ID = process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';

// Storage keys
const TOKEN_KEY = 'appkit_access_token';
const REFRESH_TOKEN_KEY = 'appkit_refresh_token';
const CODE_VERIFIER_KEY = 'appkit_code_verifier';
const STATE_KEY = 'appkit_state';
const USER_KEY = 'appkit_user';

// ─── PKCE Helpers ────────────────────────────────────────────────────

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, length);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
}

// ─── Auth Functions ──────────────────────────────────────────────────

/**
 * Get the current redirect URI based on the window location
 */
function getRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/auth/callback`;
}

/**
 * Start the login/signup flow — redirects the user to AppKit's hosted auth page
 */
export async function login(): Promise<void> {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  // Store PKCE verifier and state for the callback
  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${DOMAIN}/oauth/authorize?${params.toString()}`;
}

/**
 * Handle the OAuth callback — exchange the authorization code for tokens
 */
export async function handleCallback(code: string, state: string): Promise<boolean> {
  // Verify state
  const storedState = sessionStorage.getItem(STATE_KEY);
  if (state !== storedState) {
    throw new Error('Invalid state parameter — possible CSRF attack.');
  }

  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please try logging in again.');
  }

  // Exchange code for tokens
  const response = await fetch(`${DOMAIN}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      redirect_uri: getRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Token exchange failed' }));
    throw new Error(error.error_description || error.error || 'Token exchange failed');
  }

  const tokens = await response.json();

  // Store tokens
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
  if (tokens.id_token) {
    // Decode the ID token payload to get user info
    try {
      const payload = JSON.parse(atob(tokens.id_token.split('.')[1]));
      localStorage.setItem(USER_KEY, JSON.stringify({
        sub: payload.sub,
        name: payload.name || payload.preferred_username || '',
        email: payload.email || '',
        picture: payload.picture || '',
      }));
    } catch { /* ignore decode errors */ }
  }

  // Clean up session storage
  sessionStorage.removeItem(CODE_VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);

  return true;
}

/**
 * Get the stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Get stored user info
 */
export function getUser(): { sub: string; name: string; email: string; picture: string } | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Logout — clear tokens and redirect to login
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login';
}
