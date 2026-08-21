import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function readSource(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');
}

test('local login and signup pages use the Narinyland app world style', async () => {
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
  assert.match(authUi, /step === 'mfa'/);
  assert.match(authUi, /step === 'verify-email'/);
});

test('local credentials stay server-side while AppKit remains the auth backend', async () => {
  const route = await readSource('app/api/auth/credentials/route.ts');

  assert.match(route, /rejectCrossOrigin/);
  assert.match(route, /getAppKitApplicationId/);
  assert.match(route, /x-app-id/);
  assert.match(route, /\/api\/v1\/auth\/login/);
  assert.match(route, /\/api\/v1\/auth\/register/);
  assert.match(route, /\/api\/v1\/auth\/mfa\/request/);
  assert.match(route, /\/api\/v1\/auth\/mfa\/verify/);
  assert.match(route, /\/api\/v1\/auth\/email-verification\/verify/);
  assert.match(route, /appkit_access_token/);
  assert.match(route, /appkit_refresh_token/);
  assert.match(route, /narinyland_is_auth/);
  assert.match(route, /narinyland_sub/);
  assert.match(route, /delete safeData\.accessToken/);
  assert.match(route, /delete safeData\.refreshToken/);
});

test('entry and protected-route navigation use the local login page', async () => {
  const [authFacade, boundary, middleware, landing] = await Promise.all([
    readSource('lib/auth-local.ts'),
    readSource('components/AuthBoundary.tsx'),
    readSource('middleware.ts'),
    readSource('components/landing/LandingWorldExperience.tsx'),
  ]);

  assert.match(authFacade, /window\.location\.assign\(['"]\/login['"]\)/);
  assert.match(authFacade, /loginWithAppKit/);
  assert.match(boundary, /['"]\/login['"]/);
  assert.match(boundary, /['"]\/signup['"]/);
  assert.match(middleware, /NextResponse\.redirect\(loginUrl\)/);
  assert.match(middleware, /new URL\(['"]\/login['"]/);
  assert.match(landing, /import \{ login \} from ['"]@\/lib\/auth['"]/);
});
