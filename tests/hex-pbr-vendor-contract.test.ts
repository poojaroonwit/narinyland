import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PBR resolver is maintenance-only and resolves exact Poly Haven metadata with a unique User-Agent', async () => {
  const resolver = await source('scripts/resolve-hex-pbr-manifest.mjs');
  assert.match(resolver, /api\.polyhaven\.com\/files\//);
  assert.match(resolver, /api\.polyhaven\.com\/info\//);
  assert.match(resolver, /User-Agent/);
  assert.match(resolver, /sha256/);
  assert.match(resolver, /record\.include/);
  assert.doesNotMatch(resolver, /Math\.random/);
});

test('PBR vendor uses only the resolved manifest and fails on checksum mismatch', async () => {
  const vendor = await source('scripts/vendor-hex-pbr-assets.mjs');
  assert.match(vendor, /pbr-manifest\.json/);
  assert.match(vendor, /createHash\(['"]sha256['"]\)/);
  assert.match(vendor, /PBR_ASSET_CHECKSUM_MISMATCH/);
  assert.match(vendor, /PBR_ASSET_MANIFEST_UNRESOLVED/);
  assert.match(vendor, /\.tmp-/);
  assert.match(vendor, /rename\(/);
  assert.doesNotMatch(vendor, /api\.polyhaven\.com/);
});
