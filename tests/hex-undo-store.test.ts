import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createHexUndoStore,
  HEX_UNDO_TTL_MS,
  type HexUndoRedisAdapter,
} from '@/lib/hex-world/undo-store';
import type { HexUndoDescriptor, HexUndoScope } from '@/lib/hex-world/undo-types';

type Entry = { value: string; expiresAt: number };

class MemoryUndoRedis implements HexUndoRedisAdapter {
  readonly values = new Map<string, Entry>();

  private purge(key: string) {
    const entry = this.values.get(key);
    if (entry && entry.expiresAt <= Date.now()) this.values.delete(key);
  }

  async get(key: string) {
    this.purge(key);
    return this.values.get(key)?.value ?? null;
  }

  async mget(...keys: string[]) {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async del(...keys: string[]) {
    let count = 0;
    for (const key of keys) if (this.values.delete(key)) count += 1;
    return count;
  }

  async setNxPx(key: string, value: string, ttlMs: number) {
    this.purge(key);
    if (this.values.has(key)) return false;
    this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
    return true;
  }

  async eval<T>(operation: string, fallback: T, _script: string, keys: string[], args: Array<string | number>): Promise<T> {
    if (operation === 'hex-undo-save') {
      const [latestKey, tokenKey] = keys;
      const [payload, ttlRaw, token, tokenPrefix] = args.map(String);
      const previous = await this.get(latestKey);
      const ttl = Number(ttlRaw);
      this.values.set(tokenKey, { value: payload, expiresAt: Date.now() + ttl });
      this.values.set(latestKey, { value: token, expiresAt: Date.now() + ttl });
      if (previous && previous !== token) this.values.delete(`${tokenPrefix}${previous}`);
      return (previous ?? '') as T;
    }
    if (operation === 'hex-undo-consume') {
      const [latestKey, tokenKey, claimKey] = keys;
      const [token, claimId] = args.map(String);
      if (await this.get(claimKey) !== claimId) return 0 as T;
      if (await this.get(latestKey) === token) this.values.delete(latestKey);
      this.values.delete(tokenKey);
      this.values.delete(claimKey);
      return 1 as T;
    }
    if (operation === 'hex-undo-release') {
      const [claimKey] = keys;
      const [claimId] = args.map(String);
      if (await this.get(claimKey) !== claimId) return 0 as T;
      this.values.delete(claimKey);
      return 1 as T;
    }
    return fallback;
  }
}

const scope: HexUndoScope = { configId: 'circle-a', landId: 'land-a', userId: 'user-a' };
const descriptor: HexUndoDescriptor = {
  action: 'place',
  expectedRevision: 4,
  expected: {
    id: 'building-a',
    buildingKey: 'bench',
    anchorQ: 1,
    anchorR: 2,
    rotation: 0,
    modelUrl: null,
    metadata: {},
  },
};

test('undo opportunities expire after the approved twelve-second window', () => {
  assert.equal(HEX_UNDO_TTL_MS, 12_000);
});

test('latest undo opportunity supersedes the previous token for the same scope', async () => {
  const store = createHexUndoStore(new MemoryUndoRedis());
  const first = await store.save(scope, descriptor);
  const second = await store.save(scope, { ...descriptor, expectedRevision: 5 });
  assert.ok(first && second);
  assert.notEqual(first.token, second.token);
  assert.equal(await store.claim(scope, first.token), null);
  assert.ok(await store.claim(scope, second.token));
});

test('undo token cannot be claimed from another authenticated scope', async () => {
  const store = createHexUndoStore(new MemoryUndoRedis());
  const saved = await store.save(scope, descriptor);
  assert.ok(saved);
  assert.equal(await store.claim({ ...scope, userId: 'user-b' }, saved.token), null);
});

test('claim is exclusive, release permits a fresh claim, and consume is one-time', async () => {
  const store = createHexUndoStore(new MemoryUndoRedis());
  const saved = await store.save(scope, descriptor);
  assert.ok(saved);

  const firstClaim = await store.claim(scope, saved.token);
  assert.ok(firstClaim);
  assert.equal(await store.claim(scope, saved.token), null);

  await store.release(firstClaim);
  const secondClaim = await store.claim(scope, saved.token);
  assert.ok(secondClaim);
  assert.notEqual(secondClaim.claimId, firstClaim.claimId);

  await store.consume(secondClaim);
  assert.equal(await store.claim(scope, saved.token), null);
});
