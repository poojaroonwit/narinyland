import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function readSource(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');
}

test('AppKit headless adapter supports client-owned social login and continuation', async () => {
  const adapter = await readSource('lib/appkit-headless-server.ts');
  assert.match(adapter, /getSocialLoginUrl/);
  assert.match(adapter, /continueSocialLogin/);
  assert.match(adapter, /social-continue/);
});

test('SSO start route allowlists configured AppKit providers and uses an exact Narinyland callback', async () => {
  const route = await readSource('app/api/auth/sso/start/route.ts');
  assert.match(route, /getHeadlessAuthConfig/);
  assert.match(route, /getHeadlessSocialLoginUrl/);
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
