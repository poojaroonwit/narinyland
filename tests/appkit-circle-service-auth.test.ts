import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('../lib/appkit-server.ts', import.meta.url);

test('circle writes use the supported AppKit application-admin service surface', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /scope: 'applications:view applications:edit'/);
  assert.match(source, /requireServiceToken\(\)/);
  assert.match(source, /\/api\/v1\/admin\/applications\/\$\{applicationId\}\/circles/);
  assert.doesNotMatch(source, /\? `\$\{baseUrl\}\/api\/v1\/circles/);
});

test('service auth failures preserve AppKit OAuth diagnostics', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /'error_description', 'message', 'detail', 'error'/);
  assert.match(source, /throw new Error\(result\.error \|\| 'AppKit service authentication failed'\)/);
  assert.doesNotMatch(source, /throw new Error\('Missing authentication token'\)/);
});

test('application identity is resolved from client credentials instead of assuming OAuth client id', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /record\.application_id \|\| record\.applicationId/);
  assert.match(source, /resolvedAppKitApplicationId = tokenApplicationId/);
  assert.match(source, /const applicationId = requireApplicationId\(\)/);
  assert.doesNotMatch(source, /process\.env\.UNIBOX_APP_ID \|\|\s*APPKIT_CLIENT_ID/);
  assert.match(source, /service token is not bound to an application/i);
});

test('read-only AppKit calls can use the application id learned from the token exchange', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const applicationId = resolvedAppKitApplicationId/);
  assert.match(source, /\/api\/v1\/admin\/applications\/\$\{applicationId\}\/branding/);
  assert.match(source, /\/api\/v1\/admin\/applications\/\$\{applicationId\}\/circles\/\$\{circleId\}\/members/);
});

test('SSO launch URL sync uses the supported application update method instead of PATCH', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const start = source.indexOf('export async function ensureSsoLaunchUrlConfigured');
  const end = source.indexOf('// ─── Branding', start);
  assert.ok(start >= 0 && end > start, 'could not isolate ensureSsoLaunchUrlConfigured');
  const syncSource = source.slice(start, end);

  assert.match(syncSource, /method:\s*'PUT'/);
  assert.doesNotMatch(syncSource, /method:\s*'PATCH'/);
});
