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
  assert.match(adapter, /storage:\s*['"]memory['"]/);
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
