import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function readSource(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');
}

test('Narinyland depends on the new AppKit headless SDK only', async () => {
  const [pkg, adapter] = await Promise.all([
    readSource('package.json'),
    readSource('lib/appkit-headless-server.ts'),
  ]);
  const parsed = JSON.parse(pkg) as { dependencies?: Record<string, string> };
  assert.equal(parsed.dependencies?.['@alphayard/appkit'], '1.7.0');
  assert.equal(parsed.dependencies?.['alphayard-appkit'], undefined);
  assert.match(adapter, /@alphayard\/appkit\/headless-auth/);
  assert.match(adapter, /createHeadlessAppKit/);
  assert.match(adapter, /storage:/);
});

test('credentials BFF delegates authentication policy and continuations to the SDK', async () => {
  const route = await readSource('app/api/auth/credentials/route.ts');
  assert.match(route, /runHeadlessAuthAction/);
  assert.match(route, /rejectCrossOrigin/);
  assert.doesNotMatch(route, /ACTION_PATHS/);
  assert.doesNotMatch(route, /\/api\/v1\/auth\/login/);
  assert.match(route, /appkit_access_token/);
  assert.match(route, /appkit_refresh_token/);
  assert.match(route, /createSession/);
  assert.match(route, /delete safeData\.accessToken/);
  assert.match(route, /delete safeData\.refreshToken/);
});

test('public auth config is obtained through the SDK adapter', async () => {
  const route = await readSource('app/api/auth/config/route.ts');
  assert.match(route, /getHeadlessAuthConfig/);
  assert.match(route, /NextResponse\.json/);
});

test('Narinyland auth UI owns credentials and renders SDK continuation states locally', async () => {
  const ui = await readSource('components/auth/NarinylandAuthPage.tsx');
  assert.match(ui, /\/api\/auth\/config/);
  assert.match(ui, /['"]mfa_required['"]/);
  assert.match(ui, /['"]email_verification_required['"]/);
  assert.match(ui, /password_reset_required/);
  assert.match(ui, /mfa_enrollment_required/);
  assert.match(ui, /recovery_codes/);
  assert.match(ui, /forgot-password/);
  assert.match(ui, /reset-password/);
  assert.doesNotMatch(ui, /launchAppKitLogin/);
});

test('legacy browser SDK construction is absent from the auth facade', async () => {
  const auth = await readSource('lib/auth.ts');
  assert.doesNotMatch(auth, /from ['"]alphayard-appkit['"]/);
  assert.doesNotMatch(auth, /new AppKit\(/);
  assert.doesNotMatch(auth, /sessionStorage/);
  assert.match(auth, /window\.location\.assign\(['"]\/login['"]\)/);
  assert.match(auth, /\/api\/auth\/profile/);
});

test('AppKit headless adapter supports client-owned social login and continuation', async () => {
  const adapter = await readSource('lib/appkit-headless-server.ts');
  assert.match(adapter, /getSocialLoginUrl/);
  assert.match(adapter, /continueSocialLogin/);
  assert.match(adapter, /social-continue/);
});

test('SSO start route allowlists configured AppKit providers and uses Narinyland callback', async () => {
  const route = await readSource('app/api/auth/sso/start/route.ts');
  assert.match(route, /getHeadlessAuthConfig/);
  assert.match(route, /getHeadlessSocialLoginUrl/);
  assert.match(route, /ensureOAuthRedirectUriConfigured/);
  assert.match(route, /providers/);
  assert.match(route, /auth\/social-complete/);
  assert.match(route, /Unsupported social sign-in provider/);
});

test('social callback consumes opaque AppKit code through the BFF and removes it from browser history', async () => {
  const callback = await readSource('app/auth/social-complete/page.tsx');
  assert.match(callback, /appkit_sso_code/);
  assert.match(callback, /history\.replaceState/);
  assert.match(callback, /\/api\/auth\/credentials/);
  assert.match(callback, /social-continue/);
  assert.doesNotMatch(callback, /accessToken|refreshToken/);
});

test('social callback bypasses AuthProvider until the one-time handoff is consumed', async () => {
  const boundary = await readSource('components/AuthBoundary.tsx');
  assert.match(boundary, /\/auth\/social-complete/);
});

test('Narinyland login renders only AppKit-configured social providers', async () => {
  const ui = await readSource('components/auth/NarinylandAuthPage.tsx');
  assert.match(ui, /providers/);
  assert.match(ui, /\/api\/auth\/sso\/start\?provider=/);
  assert.doesNotMatch(ui, /Other sign-in methods via AppKit/);
});

test('credentials BFF accepts social continuation and still strips AppKit tokens', async () => {
  const route = await readSource('app/api/auth/credentials/route.ts');
  assert.match(route, /social-continue/);
  assert.match(route, /stripSecrets/);
  assert.match(route, /delete safeData\.accessToken/);
  assert.match(route, /delete safeData\.refreshToken/);
});

test('AppKit server helper can append the exact OAuth redirect URI without replacing existing redirects', async () => {
  const server = await readSource('lib/appkit-server.ts');
  assert.match(server, /ensureOAuthRedirectUriConfigured/);
  assert.match(server, /oauthRedirectUris/);
  assert.match(server, /new Set/);
});
