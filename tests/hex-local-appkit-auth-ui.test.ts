import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function readSource(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');
}

test('local login and signup pages keep the Narinyland app world style', async () => {
  const [loginPage, signupPage, authUi] = await Promise.all([
    readSource('app/login/page.tsx'),
    readSource('app/signup/page.tsx'),
    readSource('components/auth/NarinylandAuthPage.tsx'),
  ]);

  assert.match(loginPage, /NarinylandAuthPage/);
  assert.match(loginPage, /mode="login"/);
  assert.match(signupPage, /NarinylandAuthPage/);
  assert.match(signupPage, /mode="signup"/);
  assert.match(authUi, /HexWorld3D/);
  assert.match(authUi, /createLandingHexWorldSnapshot/);
  assert.match(authUi, /Welcome back to your world\./);
  assert.match(authUi, /Create your little world\./);
  assert.match(authUi, /\/api\/auth\/credentials/);
  assert.match(authUi, /\/api\/auth\/config/);
  assert.match(authUi, /step === 'mfa'/);
  assert.match(authUi, /step === 'verify-email'/);
  assert.match(authUi, /step === 'forgot-password'/);
  assert.match(authUi, /step === 'reset-password'/);
  assert.match(authUi, /secured by AppKit SDK/);
  assert.doesNotMatch(authUi, /launchAppKitLogin/);
});

test('local credentials use the AppKit headless SDK behind the BFF', async () => {
  const [route, adapter] = await Promise.all([
    readSource('app/api/auth/credentials/route.ts'),
    readSource('lib/appkit-headless-server.ts'),
  ]);

  assert.match(route, /rejectCrossOrigin/);
  assert.match(route, /runHeadlessAuthAction/);
  assert.doesNotMatch(route, /ACTION_PATHS/);
  assert.doesNotMatch(route, /\/api\/v1\/auth\/login/);
  assert.match(adapter, /createHeadlessAppKit/);
  assert.match(adapter, /loginWithCredentials/);
  assert.match(adapter, /auth\.signup/);
  assert.match(adapter, /auth\.requestMfa/);
  assert.match(adapter, /auth\.verifyMfa/);
  assert.match(adapter, /auth\.verifyEmail/);
  assert.match(route, /appkit_access_token/);
  assert.match(route, /appkit_refresh_token/);
  assert.match(route, /narinyland_is_auth/);
  assert.match(route, /narinyland_sub/);
  assert.match(route, /delete safeData\.accessToken/);
  assert.match(route, /delete safeData\.refreshToken/);
});

test('entry and protected-route navigation use one Next 16 proxy and Narinyland login', async () => {
  const [authFacade, boundary, proxy, middleware, landing] = await Promise.all([
    readSource('lib/auth.ts'),
    readSource('components/AuthBoundary.tsx'),
    readSource('proxy.ts'),
    readSource('middleware.ts'),
    readSource('components/landing/LandingWorldExperience.tsx'),
  ]);

  assert.match(authFacade, /window\.location\.assign\(['"]\/login['"]\)/);
  assert.doesNotMatch(authFacade, /buildAuthUrl/);
  assert.doesNotMatch(authFacade, /new AppKit\(/);
  assert.match(boundary, /['"]\/login['"]/);
  assert.match(boundary, /['"]\/signup['"]/);
  assert.match(proxy, /NextResponse\.redirect\(loginUrl\)/);
  assert.match(proxy, /new URL\(['"]\/login['"]/);
  assert.match(proxy, /['"]\/garden\/:path\*['"]/);
  assert.match(proxy, /['"]\/onboarding\/:path\*['"]/);
  assert.match(proxy, /['"]\/board\/:path\*['"]/);
  assert.equal(middleware, '');
  assert.match(landing, /import \{ login \} from ['"]@\/lib\/auth['"]/);
});
