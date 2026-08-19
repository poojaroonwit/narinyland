import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('all hex mutation routes require config access', async () => {
  for (const path of [
    '../app/api/hex-world/buildings/route.ts',
    '../app/api/hex-world/buildings/[id]/route.ts',
    '../app/api/hex-world/expand/route.ts',
  ]) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /requireConfigAccess/);
    assert.match(source, /isConfigAccessDenied/);
  }
});

test('place route accepts server-safe fields only', async () => {
  const source = await readFile(new URL('../app/api/hex-world/buildings/route.ts', import.meta.url), 'utf8');
  assert.match(source, /landId, buildingKey, anchorQ, anchorR, rotation/);
  assert.doesNotMatch(source, /const \{[^}]*footprint/);
  assert.doesNotMatch(source, /const \{[^}]*pointCost/);
  assert.doesNotMatch(source, /const \{[^}]*unlocked/);
});

test('hex browser API preserves stable error codes', async () => {
  const source = await readFile(new URL('../services/hex-world-api.ts', import.meta.url), 'utf8');
  assert.match(source, /class HexWorldApiError/);
  assert.match(source, /payload\.code/);
  assert.match(source, /X-Circle-Id/);
});
