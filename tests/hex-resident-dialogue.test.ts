import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeHomesteadLifeState } from '@/lib/homestead-life-engine';

async function loadDialogue() {
  try {
    return await import('@/lib/hex-world/resident-dialogue');
  } catch {
    assert.fail('Resident dialogue module must exist');
  }
}

test('resident dialogue is deterministic and returns exactly one context line', async () => {
  const { getResidentDialogue } = await loadDialogue();
  const state = normalizeHomesteadLifeState({ day: 3, season: 'spring', weather: 'rainy', timeMinutes: 540 });
  const first = getResidentDialogue({ residentId: 'partner-1', state });
  const second = getResidentDialogue({ residentId: 'partner-1', state });
  assert.equal(first.line, second.line);
  assert.ok(first.line.trim().length > 0);
  assert.equal(Array.isArray((first as unknown as { lines?: unknown }).lines), false);
});

test('pet dialogue reflects chosen pet and authoritative daily pet-time availability', async () => {
  const { getResidentDialogue } = await loadDialogue();
  const state = normalizeHomesteadLifeState({ day: 4, animals: { pet: { kind: 'cat', interactedDay: null } } });
  const available = getResidentDialogue({ residentId: 'pet', petKind: 'cat', state });
  assert.equal(available.title, 'Cat');
  assert.equal(available.primaryVerb, 'Pet');
  assert.equal(available.canPetTime, true);

  state.animals.pet.interactedDay = state.day;
  assert.equal(getResidentDialogue({ residentId: 'pet', petKind: 'cat', state }).canPetTime, false);
});

test('partner and child dialogue mirror existing family-time daily eligibility', async () => {
  const { getResidentDialogue } = await loadDialogue();
  const state = normalizeHomesteadLifeState({ day: 5 });
  assert.equal(getResidentDialogue({ residentId: 'partner-2', state }).canFamilyTime, true);
  state.daily.familyTime = true;
  assert.equal(getResidentDialogue({ residentId: 'child', state }).canFamilyTime, false);
});
