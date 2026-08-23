import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('legacy stats compatibility endpoints cannot mint caller-controlled points or XP', async () => {
  const [pointsRoute, xpRoute] = await Promise.all([
    read('app/api/stats/add-points/route.ts'),
    read('app/api/stats/add-xp/route.ts'),
  ]);

  assert.doesNotMatch(pointsRoute, /\baddPoints\b/);
  assert.doesNotMatch(xpRoute, /\baddXP\b/);
  assert.match(pointsRoute, /\bgetStats\b/);
  assert.match(xpRoute, /\bgetStats\b/);
});

test('coupon creation validates a bounded reward instead of trusting an arbitrary client amount', async () => {
  const source = await read('app/api/coupons/route.ts');

  assert.match(source, /normalizeCouponRewardPoints/);
  assert.doesNotMatch(source, /points:\s*points\s*\|\|\s*0/);
});

test('coupon redemption atomically claims an unredeemed coupon before awarding its reward', async () => {
  const source = await read('app/api/coupons/[id]/redeem/route.ts');

  assert.match(source, /\$transaction/);
  assert.match(source, /isRedeemed:\s*false/);
  assert.match(source, /updateMany/);
  assert.match(source, /already redeemed/i);
});

test('root layout metadata never reaches Prisma during next build', async () => {
  const source = await read('app/layout.tsx');

  assert.doesNotMatch(source, /@\/lib\/prisma/);
  assert.doesNotMatch(source, /appConfig\.findUnique/);
});

test('media cleanup keeps transiently unreachable media instead of deleting it', async () => {
  const source = await read('app/api/cleanup/route.ts');

  assert.match(source, /checkRemoteMediaHealth/);
  assert.match(source, /uncertain/);
  assert.match(source, /health === 'broken'/);
});

test('garden action hook restores TypeScript checking at its boundary', async () => {
  const source = await read('app/garden/_components/useGardenActions.ts');

  assert.doesNotMatch(source, /@ts-nocheck/);
  assert.doesNotMatch(source, /\(ctx:\s*any\)/);
});
