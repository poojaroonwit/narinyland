import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Explore prompt supports Interact Talk and Pet verbs without weakening E-key safety', async () => {
  const source = await readFile(new URL('../components/hex-world/HexExploreInteractionPrompt.tsx', import.meta.url), 'utf8');
  assert.match(source, /target\.kind\s*===\s*['"]resident['"]/);
  assert.match(source, /Talk/);
  assert.match(source, /Pet/);
  assert.match(source, /event\.code\s*!==\s*['"]KeyE['"]/);
  assert.match(source, /event\.repeat/);
  assert.match(source, /isEditableTarget/);
  assert.match(source, /min-h-\[44px\]/);
});

test('resident conversation card uses one deterministic line and existing Homestead actions', async () => {
  const source = await readFile(new URL('../components/hex-world/HexResidentConversationCard.tsx', import.meta.url), 'utf8');
  assert.match(source, /getResidentDialogue/);
  assert.match(source, /dialogue\.line/);
  assert.doesNotMatch(source, /dialogue\.lines/);
  assert.match(source, /type:\s*['"]pet_time['"]/);
  assert.match(source, /type:\s*['"]family_time['"]/);
  assert.match(source, /Escape/);
  assert.match(source, /onClose/);
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /openai|anthropic|llm/i);
});

test('overlay keeps resident conversation mutually exclusive with other blocking surfaces', async () => {
  const source = await readFile(new URL('../components/hex-world/HexGameplayOverlay.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexResidentConversationCard/);
  assert.match(source, /residentConversation/);
  assert.match(source, /touchControlsEnabled[\s\S]*residentConversation/);
  assert.match(source, /closePrimarySheets[\s\S]*residentConversation/);
});
