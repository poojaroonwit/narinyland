import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('World camera idle breathing is delayed bounded and non-cumulative', async () => {
  const camera = await source('components/hex-world/HexDioramaCamera.tsx');
  assert.match(camera, /2500/);
  assert.match(camera, /0\.035/);
  assert.match(camera, /0\.018/);
  assert.match(camera, /0\.028/);
  assert.match(camera, /0\.11/);
  assert.match(camera, /0\.08/);
  assert.match(camera, /0\.095/);
  assert.match(camera, /worldIdleCameraScale/);
  assert.match(camera, /idleTargetBaselineRef/);
  assert.match(camera, /baseline\.x\s*\+/);
  assert.match(camera, /baseline\.y\s*\+/);
  assert.match(camera, /baseline\.z\s*\+/);
  assert.match(camera, /controls\.target\.set\(/);
  assert.doesNotMatch(camera, /controls\.target\.x\s*\+=|controls\.target\.y\s*\+=|controls\.target\.z\s*\+=/);
});

test('World camera breathing yields immediately to scripts manual input and reduced motion', async () => {
  const camera = await source('components/hex-world/HexDioramaCamera.tsx');
  assert.match(camera, /scriptedMotion\.current/);
  assert.match(camera, /manualInteractionActiveRef/);
  assert.match(camera, /reducedMotion/);
  assert.match(camera, /onStart/);
  assert.match(camera, /onEnd/);
  assert.match(camera, /controls\.target\.copy\(idleTargetBaselineRef\.current\)/);
  assert.match(camera, /idleTargetBaselineRef\.current\.copy\(controls\.target\)/);
  assert.doesNotMatch(camera, /useState\(/);
});
