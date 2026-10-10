import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('Narinyland login always exposes AppKit SSO independently of social provider config', () => {
  const page = read('app/login/page.tsx');
  const entry = read('components/auth/AppKitSsoEntry.tsx');
  assert.match(page, /AppKitSsoEntry/);
  assert.match(entry, /Continue with AppKit/);
  assert.match(entry, /\/api\/auth\/sso\/appkit\/start/);

  const authUi = read('components/auth/NarinylandAuthPage.tsx');
  assert.match(authUi, /socialProviders\.length > 0/);
});

test('AppKit SSO start uses authorization code with PKCE and an exact server callback', () => {
  const start = read('app/api/auth/sso/appkit/start/route.ts');
  assert.match(start, /response_type/);
  assert.match(start, /code_challenge/);
  assert.match(start, /code_challenge_method/);
  assert.match(start, /S256/);
  assert.match(start, /\/api\/auth\/sso\/appkit\/callback/);
  assert.match(start, /ensureOAuthRedirectUriConfigured/);
});

test('AppKit SSO callback validates state server-side and never exposes OAuth tokens to browser JavaScript', () => {
  const callback = read('app/api/auth/sso/appkit/callback/route.ts');
  assert.match(callback, /code_verifier/);
  assert.match(callback, /validateAppKitAccessToken/);
  assert.match(callback, /createSession/);
  assert.match(callback, /appkit_access_token/);
  assert.match(callback, /httpOnly:\s*true/);
  assert.doesNotMatch(callback, /NextResponse\.json\([^)]*access_token/s);
});

test('AppKit SSO uses the registered interactive client, not the service client', () => {
  const helper = read('lib/appkit-oauth-redirect.ts');
  const start = read('app/api/auth/sso/appkit/start/route.ts');
  const callback = read('app/api/auth/sso/appkit/callback/route.ts');
  assert.match(helper, /getAppKitInteractiveOAuthClientId/);
  assert.match(helper, /oauthClientId/);
  assert.match(start, /getAppKitInteractiveOAuthClientId\(callback\)/);
  assert.match(start, /response\.cookies\.set\(CLIENT_COOKIE, clientId, common\)/);
  assert.doesNotMatch(start, /NEXT_PUBLIC_APPKIT_CLIENT_ID/);
  assert.match(callback, /cookieStore\.get\(CLIENT_COOKIE\)/);
  assert.match(callback, /const oauthClientId = storedClientId;/);
  assert.doesNotMatch(callback, /APPKIT_CLIENT_SECRET/);
});

test('Provider errors are distinguished from cancellation and flow cookies use the correct path', () => {
  const callback = read('app/api/auth/sso/appkit/callback/route.ts');
  const entry = read('components/auth/AppKitSsoEntry.tsx');
  assert.match(callback, /oauthError === 'invalid_scope'/);
  assert.match(callback, /FLOW_COOKIE_PATH/);
  assert.match(callback, /maxAge: 0/);
  assert.match(entry, /appkit_sso_invalid_scope/);
});
