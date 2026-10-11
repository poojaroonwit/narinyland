import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createIdleDisconnectGuard } from '@/lib/database-idle';

test('an inactive client disconnects after the idle window', async () => {
  let disconnects = 0;
  const guard = createIdleDisconnectGuard(async () => { disconnects += 1; }, 15);
  assert.equal(await guard.run(async () => 42), 42);
  assert.equal(disconnects, 0);
  await delay(70);
  assert.equal(disconnects, 1);
  assert.equal(await guard.run(async () => 43), 43);
  await delay(70);
  assert.equal(disconnects, 2);
});

test('never disconnects while an operation is active', async () => {
  let finish!: (value: string) => void;
  let disconnects = 0;
  const guard = createIdleDisconnectGuard(async () => { disconnects += 1; }, 15);
  const operation = guard.run(() => new Promise<string>((resolve) => { finish = resolve; }));
  await delay(50);
  assert.equal(disconnects, 0);
  finish('done');
  assert.equal(await operation, 'done');
  await delay(70);
  assert.equal(disconnects, 1);
});

test('waits until a currently running disconnect completes before querying', async () => {
  let finishDisconnect!: () => void;
  let didExecute = false;
  const guard = createIdleDisconnectGuard(
    () => new Promise<void>((resolve) => { finishDisconnect = resolve; }),
    10,
  );
  await guard.run(async () => true);
  await delay(40);
  const next = guard.run(async () => { didExecute = true; return true; });
  assert.equal(didExecute, false);
  finishDisconnect();
  assert.equal(await next, true);
  assert.equal(didExecute, true);
});
