import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = 'components/hex-world/HexExploreInteractionPrompt.tsx';

test('Explore interaction prompt supports safe desktop E input and mobile interaction', async () => {
  let source = '';
  try { source = await readFile(path, 'utf8'); } catch {}
  assert.ok(source, 'HexExploreInteractionPrompt must exist');
  assert.match(source, /KeyE/);
  assert.match(source, /event\.repeat/);
  assert.match(source, /isContentEditable/);
  assert.match(source, /INPUT/);
  assert.match(source, /TEXTAREA/);
  assert.match(source, /SELECT/);
  assert.match(source, /min-h-\[44px\]/);
  assert.match(source, /onPointerDown/);
  assert.match(source, /stopPropagation/);
  assert.match(source, /Interact/);
  assert.doesNotMatch(source, /hexWorldAPI|performHomesteadLifeAction|fetch\(/);
});
