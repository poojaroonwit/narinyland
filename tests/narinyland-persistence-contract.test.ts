import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path: string) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('shop payment retry has a stable request identity and atomic replay check', async () => {
  const [route, shop, content] = await Promise.all([
    read('app/api/purchased-items/route.ts'),
    read('components/Shop.tsx'),
    read('app/garden/_components/GardenAcceptedContent.tsx'),
  ]);
  assert.match(route, /requestId: string \| null/);
  assert.match(route, /tx\.purchasedItem\.findUnique\(\{ where: \{ id: requestId \} \}\)/);
  assert.ok(route.indexOf('tx.purchasedItem.findUnique') < route.indexOf('await spendSharedPoints'));
  assert.match(route, /requestId \? \{ id: requestId \} : \{\}/);
  assert.match(route, /definition\.price, requestId/);
  assert.match(route, /cache invalidation pending/);
  assert.match(shop, /pendingPurchaseIdsRef/);
  assert.match(shop, /requestId: purchaseRequestId\(key\)/);
  assert.match(content, /await purchasedItemsAPI\.create/);
  assert.match(content, /requestId: item\.requestId/);
  assert.match(content, /statsAPI\.get\(\)/);
});

test('settings save uses canonical APIs and does not re-submit config updates from setState', async () => {
  const [helper, drawer, modal, shell] = await Promise.all([
    read('lib/garden-settings-save.ts'),
    read('components/EditDrawer.tsx'),
    read('app/garden/_components/GardenGlobalModals.tsx'),
    read('components/edit-drawer/EditDrawerShell.tsx'),
  ]);
  assert.match(helper, /couponsAPI\.update/);
  assert.match(helper, /couponsAPI\.create/);
  assert.match(helper, /timelineAPI\.create/);
  assert.match(helper, /memoriesAPI\.update/);
  assert.match(helper, /await configAPI\.update/);
  assert.match(drawer, /await saveGardenSettings/);
  assert.match(drawer, /Discard your unsaved settings changes/);
  assert.match(drawer, /hydratedWorldRef/);
  assert.match(modal, /setConfig=\{setAppConfig\}/);
  assert.doesNotMatch(modal, /setConfig=\{handleSetAppConfig\}/);
  assert.match(shell, /disabled=\{!hasChanges \|\| isSaving\}/);
});

test('memory album updates reject cross-world album identifiers', async () => {
  const [create, edit] = await Promise.all([
    read('app/api/memories/route.ts'),
    read('app/api/memories/[id]/route.ts'),
  ]);
  assert.match(create, /prisma\.album\.findFirst\(\{ where: \{ id: albumId, configId \}/);
  assert.match(edit, /prisma\.album\.findFirst\(\{ where: \{ id: albumId, configId \}/);
  assert.match(edit, /disconnect: true/);
});

test('world partner access requires a verified administrator', async () => {
  const [invite, join] = await Promise.all([
    read('app/api/circles/invite/route.ts'),
    read('app/api/circles/join/route.ts'),
  ]);
  assert.match(invite, /userCanSeeCircleWithToken/);
  assert.match(invite, /requireCircleAdmin/);
  assert.match(invite, /addCircleMemberViaServer/);
  assert.match(invite, /getCircleMembersViaServer\(circleId, true\)/);
  assert.match(join, /userCanSeeCircleWithToken/);
});

test('explore and model inventory affordances are usable', async () => {
  const [toolbar, coupons, objects, letters] = await Promise.all([
    read('components/hex-world/HexWorldToolbar.tsx'),
    read('components/love-coupons/CouponChrome.tsx'),
    read('components/edit-drawer/tabs/ObjectsTab.tsx'),
    read('components/LoveLetter.tsx'),
  ]);
  assert.match(toolbar, /min-h-\[44px\] min-w-\[44px\]/);
  assert.match(coupons, /onKeyDown=\{\(event\)/);
  assert.match(objects, /Upload in World Shop/);
  assert.match(objects, /Purchased custom models/);
  assert.match(letters, /Add a message before sending/);
});
