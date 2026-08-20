import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const KEYS = ['home', 'storage', 'workshop', 'tree', 'flower_patch', 'pond', 'bench', 'lamp', 'fence', 'stone_path', 'garden_patch'] as const;

test('premium model modules cover every MVP building key exactly once', async () => {
  const paths = [
    '../components/hex-world/models/HexStructureModels.tsx',
    '../components/hex-world/models/HexNatureModels.tsx',
    '../components/hex-world/models/HexDecorModels.tsx',
  ];
  const source = (await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), 'utf8').catch(() => '')))).join('\n');
  for (const key of KEYS) {
    const matches = source.match(new RegExp(`case ['"]${key}['"]`, 'g')) ?? [];
    assert.equal(matches.length, 1, `${key} must be authored exactly once`);
  }
});

test('core building visuals dispatch locally and do not require remote model urls', async () => {
  const dispatcher = await readFile(new URL('../components/hex-world/HexBuildingModels.tsx', import.meta.url), 'utf8');
  assert.match(dispatcher, /HexStructureModel/);
  assert.match(dispatcher, /HexNatureModel/);
  assert.match(dispatcher, /HexDecorModel/);
  assert.doesNotMatch(dispatcher, /modelUrl|fetch\(|GLTFLoader|useGLTF/);
});
