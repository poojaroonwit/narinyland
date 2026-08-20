import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('schema defines additive hex persistence tied to Land', async () => {
  const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  for (const model of ['HexWorld', 'HexTile', 'HexBuilding', 'HexExpansion']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /hexWorld\s+HexWorld\?/);
  assert.match(schema, /@@unique\(\[worldId, q, r\]\)/);
  assert.match(schema, /@@unique\(\[worldId, expansionKey\]\)/);
});

test('hex migration is additive-only', async () => {
  const migration = await readFile(new URL('../prisma/migrations/20260820000000_add_hex_homestead/migration.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN)/i);
  assert.match(migration, /CREATE TABLE "HexWorld"/);
  assert.match(migration, /REFERENCES "Land"\("id"\)/);
});

test('phase 2 revision migration is additive-only', async () => {
  const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../prisma/migrations/20260820010000_add_hex_world_revision/migration.sql', import.meta.url), 'utf8');
  assert.match(schema, /revision\s+Int\s+@default\(0\)/);
  assert.match(migration, /ALTER TABLE "HexWorld"/);
  assert.match(migration, /ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0/);
  assert.doesNotMatch(migration, /DROP|DELETE|TRUNCATE/i);
});
