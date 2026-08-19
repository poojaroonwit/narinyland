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

test('admin circle requests use the explicit application id rather than assuming the OAuth client id', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const APPKIT_APPLICATION_ID =/);
  assert.match(source, /const applicationId = requireApplicationId\(\)/);
  assert.match(source, /APPKIT_APPLICATION_ID\/branding/);
});
