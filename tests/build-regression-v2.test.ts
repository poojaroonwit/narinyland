import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');

test('auth me uses the authenticated session user directly', () => {
  const route = source('app/api/auth/me/route.ts');
  assert.match(route, /normalizeUser\(session\.user/);
  assert.doesNotMatch(route, /prisma\.partner\.findFirst/);
});

test('letter reward cooldown uses the safe atomic Redis helper', () => {
  const route = source('app/api/letters/route.ts');
  assert.match(route, /redisSetNxPx/);
  assert.doesNotMatch(route, /redis\s*\.set\(/);
});
