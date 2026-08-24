import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const readJson = async (path: string) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));

const expectedSourceIds = [
  'leafy_grass', 'dirt', 'raked_dirt', 'rock_face', 'weathered_planks', 'plastered_wall', 'roof_tiles',
  'tree_small_02', 'shrub_03', 'fern_02', 'grass_medium_01', 'rock_moss_set_01', 'tree_stump_01', 'meadow',
].sort();

function filesFor(asset: any) {
  const files: any[] = [];
  for (const variant of Object.values(asset.variants ?? {}) as any[]) {
    if (variant.roles) files.push(...Object.values(variant.roles));
    if (variant.entry) files.push(variant.entry);
    if (Array.isArray(variant.includes)) files.push(...variant.includes);
    if (variant.hdr) files.push(variant.hdr);
  }
  return files;
}

test('PBR source catalog pins the approved asset set exactly', async () => {
  const catalog = await readJson('assets/hex-world/pbr-source-catalog.json');
  assert.equal(catalog.version, 1);
  assert.equal(catalog.provider, 'polyhaven');
  assert.deepEqual(catalog.assets.map((asset: any) => asset.sourceAssetId).sort(), expectedSourceIds);
  assert.match(catalog.userAgent, /NarinylandAssetResolver/);
});

test('resolved PBR manifest contains immutable file hashes and CC0 provenance', async () => {
  const manifest = await readJson('assets/hex-world/pbr-manifest.json');
  assert.equal(manifest.version, 1);
  assert.equal(manifest.provider, 'polyhaven');
  assert.equal(typeof manifest.resolvedAt, 'string');
  assert.ok(manifest.resolvedAt.length > 10);
  assert.deepEqual(manifest.assets.map((asset: any) => asset.sourceAssetId).sort(), expectedSourceIds);
  for (const asset of manifest.assets) {
    assert.equal(asset.license, 'CC0');
    assert.match(asset.sourcePage, /^https:\/\/polyhaven\.com\/a\//);
    assert.match(asset.filesHash, /^[a-f0-9]{40}$/);
    const files = filesFor(asset);
    assert.ok(files.length > 0, `${asset.id} must resolve at least one file`);
    for (const file of files) {
      assert.match(file.url, /^https:\/\/dl\.polyhaven\.org\//);
      assert.match(file.md5, /^[a-f0-9]{32}$/);
      assert.match(file.sha256, /^[a-f0-9]{64}$/);
      assert.ok(Number.isInteger(file.size) && file.size > 0);
      assert.match(file.out, /^[a-z0-9_./-]+$/i);
      assert.equal(file.out.includes('..'), false);
    }
  }
});
