import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');

test('server auth never authorizes directly from narinyland_sub or unsigned JWT payloads', () => {
  const auth = source('lib/auth-server.ts');
  assert.doesNotMatch(auth, /cookieStore\.get\(['"]narinyland_sub['"]\)/);
  assert.doesNotMatch(auth, /JSON\.parse\(Buffer\.from\(parts\[1\]/);
  assert.match(auth, /narinyland_session/);
});

test('circle list does not auto-claim the first global config', () => {
  const circles = source('app/api/circles/route.ts');
  assert.doesNotMatch(circles, /orphanedConfig/);
  assert.doesNotMatch(circles, /appConfig\.findFirst\(\{\s*orderBy:/s);
});

test('circle join verifies existing AppKit visibility instead of service-token self-add', () => {
  const join = source('app/api/circles/join/route.ts');
  assert.match(join, /verify.*circle|user.*can.*see.*circle|is.*circle.*member/i);
  assert.doesNotMatch(join, /addCircleMemberViaServer\(circleId, session\.userId/);
});

test('circle rename and delete require admin authority', () => {
  const route = source('app/api/circles/[circleId]/route.ts');
  assert.match(route, /requireCircleAdmin/);
  assert.doesNotMatch(route, /function userCanAccessCircle/);
});

test('generic config PUT does not bulk synchronize coupons gallery or timeline', () => {
  const route = source('app/api/config/route.ts');
  const put = route.slice(route.indexOf('export async function PUT'));
  assert.doesNotMatch(put, /body\.coupons/);
  assert.doesNotMatch(put, /body\.gallery/);
  assert.doesNotMatch(put, /body\.timeline/);
});

test('leaf purchases do not inflate lifetime points', () => {
  const stats = source('lib/stats-service.ts');
  const buyLeaf = stats.slice(stats.indexOf('export async function buyLeaf'));
  assert.doesNotMatch(buyLeaf, /lifetimePoints:\s*\{\s*increment:/);
});

test('letter routes bind sender to authenticated user and protect locked content', () => {
  const letters = source('app/api/letters/route.ts');
  assert.match(letters, /access\.userId/);
  assert.match(letters, /unlockDate/);
  assert.match(letters, /locked|isLocked|canReadContent/);
  assert.match(letters, /letter_reward:/);
});

test('upload validation rejects active SVG content', () => {
  const upload = source('lib/upload-validation.ts');
  assert.match(upload, /svg/i);
  assert.match(upload, /image\/svg\+xml/);
});

test('legacy purchased-item endpoint uses server catalog and shared point spending', () => {
  const items = source('app/api/purchased-items/route.ts');
  assert.match(items, /purchased-item-catalog/);
  assert.match(items, /spendSharedPoints/);
});

test('credential-bearing scratch scripts are not tracked', () => {
  for (const path of [
    'scratch_db.js',
    'scratch_appkit_db.js',
    'check_apps.js',
    'update_appkit_secrets.js',
    'seed_narinyland_client.js',
  ]) {
    assert.equal(existsSync(path), false, `${path} must not be tracked`);
  }
});

test('production TypeScript build excludes tests', () => {
  const tsconfig = JSON.parse(source('tsconfig.json')) as { exclude?: string[] };
  assert.ok(tsconfig.exclude?.some((value) => value === 'tests' || value === 'tests/**'));
});

test('CI blocks high production dependency advisories', () => {
  const workflow = source('.github/workflows/hex-homestead-ci.yml');
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.doesNotMatch(workflow, /npm audit --omit=dev[^\n]*\|\| true/);
});
