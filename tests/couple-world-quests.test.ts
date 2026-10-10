import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCoupleQuestView,
  coupleDayKey,
  coupleQuestChapter,
  dailyCoupleQuests,
} from '../lib/couple-world/quests';

const members = [{ id: 'partner-a', name: 'A' }, { id: 'partner-b', name: 'B' }];
const dayKey = '2026-10-10';

test('each circle gets a deterministic, balanced daily adventure deck', () => {
  const first = dailyCoupleQuests('world-1', dayKey);
  assert.deepEqual(first, dailyCoupleQuests('world-1', dayKey));
  assert.equal(first.length, 3);
  assert.deepEqual(first.map((quest) => quest.category), ['discover', 'dream', 'care']);
  assert.equal(new Set(first.map((quest) => quest.key)).size, 3);
  assert.equal(coupleDayKey(new Date('2026-10-10T23:30:00.000Z')), dayKey);
});

test('a single answer stays private until both distinct partners have answered', () => {
  const quest = dailyCoupleQuests('world-1', dayKey)[0];
  const entries = [{ dayKey, questKey: quest.key, partnerId: 'partner-a', answer: 'SECRET A' }];
  const stateA = buildCoupleQuestView('world-1', dayKey, members, 'partner-a', entries);
  const stateB = buildCoupleQuestView('world-1', dayKey, members, 'partner-b', entries);
  assert.equal(stateA.quests[0].mineDone, true);
  assert.equal(stateA.quests[0].partnerDone, false);
  assert.equal(stateB.quests[0].mineDone, false);
  assert.equal(stateB.quests[0].partnerDone, true);
  assert.deepEqual(stateA.quests[0].answers, []);
  assert.deepEqual(stateB.quests[0].answers, []);
  assert.equal(JSON.stringify(stateB).includes('SECRET A'), false);
  assert.equal(stateB.completedMoments, 0);
});

test('both partners completing a quest lights exactly one story lantern', () => {
  const quest = dailyCoupleQuests('world-1', dayKey)[0];
  const entries = [
    { dayKey, questKey: quest.key, partnerId: 'partner-a', answer: 'SECRET A' },
    { dayKey, questKey: quest.key, partnerId: 'partner-b', answer: 'SECRET B' },
  ];
  const state = buildCoupleQuestView('world-1', dayKey, members, 'partner-b', entries);
  assert.equal(state.completedMoments, 1);
  assert.equal(state.chapter.title, 'Blossom Path');
  assert.equal(state.quests[0].revealed, true);
  assert.deepEqual(state.quests[0].answers, [
    { name: 'A', answer: 'SECRET A' }, { name: 'B', answer: 'SECRET B' },
  ]);
  assert.equal(state.quests[1].revealed, false);
});

test('a solo world cannot reveal answers or manufacture shared milestones', () => {
  const quest = dailyCoupleQuests('world-1', dayKey)[0];
  const state = buildCoupleQuestView('world-1', dayKey, [members[0]], 'partner-a',
    [{ dayKey, questKey: quest.key, partnerId: 'partner-a', answer: 'Solo' }]);
  assert.equal(state.completedMoments, 0);
  assert.equal(state.quests[0].revealed, false);
});

test('nonmember access and 3-person worlds cannot use two-person adventures', () => {
  assert.throws(() => buildCoupleQuestView('world-1', dayKey, members, 'attacker', []));
  assert.throws(() => buildCoupleQuestView('world-1', dayKey,
    [...members, { id: 'partner-c', name: 'C' }], 'partner-a', []));
});

test('story chapters grow without daily streak penalties', () => {
  assert.equal(coupleQuestChapter(0).title, 'First Light');
  assert.equal(coupleQuestChapter(1).title, 'Blossom Path');
  assert.equal(coupleQuestChapter(5).title, 'Starlit Home');
  assert.equal(coupleQuestChapter(14).title, 'Our Constellation');
  assert.equal(coupleQuestChapter(14).nextAt, null);
});
