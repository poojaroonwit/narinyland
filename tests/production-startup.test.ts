import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('production startup never runs destructive cleanup', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.doesNotMatch(dockerfile, /cleanup-db\.cjs/);
  assert.match(dockerfile, /CMD \["sh", "-c", "npx prisma migrate deploy && node server\.js"\]/);
});
