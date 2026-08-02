import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getProximityVoiceGain } from '@/lib/world-voice-spatial';

test('proximity voice is full-volume inside the close range', () => {
  assert.equal(getProximityVoiceGain(0, 6), 1);
  assert.equal(getProximityVoiceGain(1.5, 6), 1);
});

test('proximity voice fades smoothly with distance', () => {
  const near = getProximityVoiceGain(2.5, 6);
  const middle = getProximityVoiceGain(3.75, 6);
  const far = getProximityVoiceGain(5, 6);

  assert.ok(near > middle);
  assert.ok(middle > far);
  assert.equal(middle, 0.25);
});

test('proximity voice is silent at and beyond its world range', () => {
  assert.equal(getProximityVoiceGain(6, 6), 0);
  assert.equal(getProximityVoiceGain(12, 6), 0);
});

test('invalid spatial measurements fail closed', () => {
  assert.equal(getProximityVoiceGain(Number.NaN, 6), 0);
  assert.equal(getProximityVoiceGain(2, 0), 0);
});
