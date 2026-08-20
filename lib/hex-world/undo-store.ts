import { randomUUID } from 'node:crypto';
import redis, { redisEval, redisSetNxPx } from '@/lib/redis';
import {
  HEX_UNDO_TTL_MS,
  type HexUndoClaim,
  type HexUndoDescriptor,
  type HexUndoMeta,
  type HexUndoScope,
} from './undo-types';

export { HEX_UNDO_TTL_MS } from './undo-types';
export type { HexUndoClaim, HexUndoDescriptor, HexUndoMeta, HexUndoScope } from './undo-types';

export interface HexUndoRedisAdapter {
  get(key: string): Promise<string | null>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  del(...keys: string[]): Promise<number>;
  setNxPx(key: string, value: string, ttlMs: number): Promise<boolean>;
  eval<T>(operation: string, fallback: T, script: string, keys: string[], args: Array<string | number>): Promise<T>;
}

export interface HexUndoStore {
  save(scope: HexUndoScope, descriptor: HexUndoDescriptor): Promise<HexUndoMeta | null>;
  claim(scope: HexUndoScope, token: string): Promise<HexUndoClaim | null>;
  consume(claim: HexUndoClaim): Promise<void>;
  release(claim: HexUndoClaim): Promise<void>;
}

type StoredUndoPayload = {
  scope: HexUndoScope;
  descriptor: HexUndoDescriptor;
  expiresAt: string;
};

const TOKEN_PREFIX = 'hexundo:token:';
const CLAIM_PREFIX = 'hexundo:claim:';
const CLAIM_TTL_MS = 5_000;

function encodeScopePart(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function scopeKey(scope: HexUndoScope): string {
  return [scope.configId, scope.landId, scope.userId].map(encodeScopePart).join(':');
}

function latestKey(scope: HexUndoScope): string {
  return `hexundo:latest:${scopeKey(scope)}`;
}

function tokenKey(token: string): string {
  return `${TOKEN_PREFIX}${token}`;
}

function claimKey(token: string): string {
  return `${CLAIM_PREFIX}${token}`;
}

function sameScope(a: HexUndoScope, b: HexUndoScope): boolean {
  return a.configId === b.configId && a.landId === b.landId && a.userId === b.userId;
}

const SAVE_SCRIPT = `
local previous = redis.call('GET', KEYS[1])
redis.call('SET', KEYS[2], ARGV[1], 'PX', ARGV[2])
redis.call('SET', KEYS[1], ARGV[3], 'PX', ARGV[2])
if previous and previous ~= ARGV[3] then redis.call('DEL', ARGV[4] .. previous) end
return previous or ''
`;

const CONSUME_SCRIPT = `
if redis.call('GET', KEYS[3]) ~= ARGV[2] then return 0 end
if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1]) end
redis.call('DEL', KEYS[2])
redis.call('DEL', KEYS[3])
return 1
`;

const RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('DEL', KEYS[1])
return 1
`;

export function createHexUndoStore(adapter: HexUndoRedisAdapter): HexUndoStore {
  return {
    async save(scope, descriptor) {
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + HEX_UNDO_TTL_MS).toISOString();
      const payload: StoredUndoPayload = { scope, descriptor, expiresAt };
      const result = await adapter.eval<string | null>(
        'hex-undo-save',
        null,
        SAVE_SCRIPT,
        [latestKey(scope), tokenKey(token)],
        [JSON.stringify(payload), HEX_UNDO_TTL_MS, token, TOKEN_PREFIX],
      );
      if (result === null) return null;
      return { token, action: descriptor.action, expiresAt };
    },

    async claim(scope, token) {
      const claimId = randomUUID();
      const key = claimKey(token);
      if (!(await adapter.setNxPx(key, claimId, CLAIM_TTL_MS))) return null;

      const [payloadRaw, latest] = await adapter.mget(tokenKey(token), latestKey(scope));
      if (!payloadRaw || latest !== token) {
        await adapter.eval('hex-undo-release', 0, RELEASE_SCRIPT, [key], [claimId]);
        return null;
      }

      try {
        const payload = JSON.parse(payloadRaw) as StoredUndoPayload;
        if (!sameScope(scope, payload.scope) || Date.parse(payload.expiresAt) <= Date.now()) {
          await adapter.eval('hex-undo-release', 0, RELEASE_SCRIPT, [key], [claimId]);
          return null;
        }
        return { scope, token, claimId, descriptor: payload.descriptor };
      } catch {
        await adapter.eval('hex-undo-release', 0, RELEASE_SCRIPT, [key], [claimId]);
        return null;
      }
    },

    async consume(claim) {
      await adapter.eval(
        'hex-undo-consume',
        0,
        CONSUME_SCRIPT,
        [latestKey(claim.scope), tokenKey(claim.token), claimKey(claim.token)],
        [claim.token, claim.claimId],
      );
    },

    async release(claim) {
      await adapter.eval('hex-undo-release', 0, RELEASE_SCRIPT, [claimKey(claim.token)], [claim.claimId]);
    },
  };
}

const redisUndoAdapter: HexUndoRedisAdapter = {
  get: (key) => redis.get(key),
  mget: (...keys) => redis.mget(...keys),
  del: (...keys) => redis.del(...keys),
  setNxPx: redisSetNxPx,
  eval: redisEval,
};

export const redisHexUndoStore = createHexUndoStore(redisUndoAdapter);
