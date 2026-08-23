import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { MAX_COUPON_REWARD_POINTS, normalizeCouponRewardPoints } from '../lib/coupon-rewards';
import { checkRemoteMediaHealth, classifyRemoteMediaStatus } from '../lib/media-health';

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

test('coupon rewards accept only finite bounded integers', () => {
  assert.equal(normalizeCouponRewardPoints(undefined), 0);
  assert.equal(normalizeCouponRewardPoints(0), 0);
  assert.equal(normalizeCouponRewardPoints(MAX_COUPON_REWARD_POINTS), MAX_COUPON_REWARD_POINTS);
  assert.equal(normalizeCouponRewardPoints(-1), null);
  assert.equal(normalizeCouponRewardPoints(MAX_COUPON_REWARD_POINTS + 1), null);
  assert.equal(normalizeCouponRewardPoints(1.5), null);
  assert.equal(normalizeCouponRewardPoints(Number.POSITIVE_INFINITY), null);
  assert.equal(normalizeCouponRewardPoints('100'), null);
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

test('remote media health distinguishes definitive deletion from transient failure', async () => {
  assert.equal(classifyRemoteMediaStatus(204), 'healthy');
  assert.equal(classifyRemoteMediaStatus(302), 'healthy');
  assert.equal(classifyRemoteMediaStatus(404), 'broken');
  assert.equal(classifyRemoteMediaStatus(410), 'broken');
  assert.equal(classifyRemoteMediaStatus(403), 'uncertain');
  assert.equal(classifyRemoteMediaStatus(503), 'uncertain');

  assert.equal(
    await checkRemoteMediaHealth('https://example.com/missing.jpg', {
      fetcher: async () => new Response(null, { status: 404 }),
      timeoutMs: 10,
    }),
    'broken',
  );
  assert.equal(
    await checkRemoteMediaHealth('https://example.com/waking.jpg', {
      fetcher: async () => { throw new Error('temporary network failure'); },
      timeoutMs: 10,
    }),
    'uncertain',
  );
});

test('media cleanup keeps transiently unreachable media instead of deleting it', async () => {
  const source = await read('app/api/cleanup/route.ts');

  assert.match(source, /checkRemoteMediaHealth/);
  assert.match(source, /uncertain/);
  assert.match(source, /health === 'broken'/);
});

test('health check keeps serving when only optional Redis is degraded', async () => {
  const source = await read('app/api/health/route.ts');

  assert.match(source, /const serving = checks\.database === 'ok'/);
  assert.match(source, /status: serving \? 200 : 503/);
  assert.doesNotMatch(source, /const ok = checks\.database === 'ok' && checks\.redis === 'ok'/);
});

test('garden action hook restores TypeScript checking at its boundary', async () => {
  const source = await read('app/garden/_components/useGardenActions.ts');

  assert.doesNotMatch(source, /@ts-nocheck/);
  assert.doesNotMatch(source, /\(ctx:\s*any\)/);
});
