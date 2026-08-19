# Floating Hex Homestead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/garden`'s classic continuous 3D garden with a persistent, expandable Cozy Floating Homestead made from a 20x20 axial hex envelope, while preserving Narinyland's existing app shell and legacy Land data.

**Architecture:** Keep `Land` as the ownership/container boundary and add additive `HexWorld`, `HexTile`, `HexBuilding`, and `HexExpansion` persistence. Put coordinate math, catalog rules, deterministic generation, placement validation, and expansion definitions in focused shared modules; keep the server authoritative for world state and Points, and make the React Three Fiber client responsible only for rendering and transient interaction state.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6/PostgreSQL, React Three Fiber 9, Drei 10, Three.js 0.182, Node `node:test`, Railway.

**Spec:** `docs/superpowers/specs/2026-08-20-floating-hex-homestead-design.md`

## Global Constraints

- `/garden` is replaced by the Cozy Floating Homestead world renderer.
- Each `Land` owns exactly one `HexWorld`.
- The starter envelope contains exactly 400 candidate coordinates: `q = -10..9`, `r = -10..9`.
- The deterministic starter island unlocks one connected organic subset of 260-340 tiles.
- The starter Home is anchored at `(0, 0)` and cannot be removed in the MVP.
- No LAND/WORLD switch, Explore/Orbit selector, WASD movement, character-control mode, or separate game-mode selector may be introduced.
- Building placement is free in the MVP; shared partner Points are spent only on Land expansion.
- Expansion tiers are fixed at 7 / 19 / 37 hexes costing 100 / 250 / 500 shared Points.
- Server-owned catalog definitions determine footprints, terrain rules, rotations, and costs.
- Expansion purchase is Serializable, idempotent by stable `expansionKey`, and retries Prisma `P2034` conflicts.
- Legacy `PurchasedItem` rows and family-farm saves are never deleted or rewritten by HexWorld initialization.
- Circle/Land/Profile/Settings and Home/Timeline/Coupons/Letters remain app-shell concerns outside the world renderer.
- Production startup must use normal Prisma migration deployment only; it must not run `prisma/cleanup-db.cjs` or drop `Land`, `PurchasedItem`, `Album`, or HexWorld persistence.
- Medium quality must keep repeated tile/decor geometry instanced; hover/camera/preview motion never writes to the server.

---

## File Structure Lock

Create focused modules rather than adding more responsibility to `LoveTree3D.tsx` or `services/api.ts`:

- `lib/hex-world/types.ts` — shared DTO/domain types and stable error codes.
- `lib/hex-world/hex-grid.ts` — axial math, world conversion, neighbors, distance, rotation.
- `lib/hex-world/building-catalog.ts` — server/client-safe building definitions and footprints.
- `lib/hex-world/generator.ts` — deterministic starter envelope/island generation.
- `lib/hex-world/expansions.ts` — deterministic connected expansion definitions and fixed costs.
- `lib/hex-world/rules.ts` — pure occupancy, placement, terrain, and expansion eligibility rules.
- `lib/hex-world/service.ts` — Prisma-backed lazy initialization, snapshot, building mutations, expansion transaction.
- `services/hex-world-api.ts` — typed browser API wrapper.
- `components/hex-world/HexWorld3D.tsx` — scene composition and camera.
- `components/hex-world/HexTileInstances.tsx` — instanced terrain and highlighting.
- `components/hex-world/HexBuildings.tsx` — placed building composition.
- `components/hex-world/HexBuildingModels.tsx` — stylized MVP model primitives.
- `components/hex-world/HexBuildCatalog.tsx` — catalog UI.
- `components/hex-world/HexBuildController.tsx` — transient build/move/rotate placement state.
- `components/hex-world/HexExpansionController.tsx` — expansion selection, confirmation, settle animation.
- `components/hex-world/HexWorldLoading.tsx` — loading/error/retry state.
- `app/api/hex-world/route.ts` — snapshot/lazy initialization.
- `app/api/hex-world/buildings/route.ts` — building placement.
- `app/api/hex-world/buildings/[id]/route.ts` — move/rotate/remove.
- `app/api/hex-world/expand/route.ts` — atomic expansion purchase.
- `prisma/migrations/20260820000000_add_hex_homestead/migration.sql` — additive Hex persistence only.
- `tests/hex-grid.test.ts`, `tests/hex-building-catalog.test.ts`, `tests/hex-world-generator.test.ts`, `tests/hex-world-rules.test.ts`, `tests/hex-world-service.test.ts`, `tests/hex-world-rendering.test.ts`, `tests/hex-build-state.test.ts`, `tests/hex-world-api-contract.test.ts`, `tests/garden-hex-integration.test.ts`, `tests/production-startup.test.ts`.
- `.github/workflows/hex-homestead-ci.yml`.

Modify only where integration requires it: `prisma/schema.prisma`, `Dockerfile`, `lib/stats-service.ts`, `app/garden/_components/GardenWorldStage.tsx`. Keep Hex API logic out of `services/api.ts`.

---

### Task 1: Make Production Startup Non-Destructive

**Files:**
- Modify: `Dockerfile`
- Delete: `prisma/cleanup-db.cjs`
- Create: `tests/production-startup.test.ts`

**Interfaces:** Produces a production image whose startup is `prisma migrate deploy` followed by `node server.js`, with no data-dropping cleanup path.

- [ ] **Step 1: Write the failing startup safety test**

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('production startup never runs destructive cleanup', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.doesNotMatch(dockerfile, /cleanup-db\.cjs/);
  assert.match(dockerfile, /CMD \["sh", "-c", "npx prisma migrate deploy && node server\.js"\]/);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/production-startup.test.ts
```

Expected: FAIL because current `Dockerfile` invokes `node prisma/cleanup-db.cjs`.

- [ ] **Step 3: Remove destructive startup**

Use:

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

Delete `prisma/cleanup-db.cjs`; do not keep it behind an environment flag because it drops production tables and rewrites `_prisma_migrations`.

- [ ] **Step 4: Verify**

```bash
node --import tsx --test tests/production-startup.test.ts
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile tests/production-startup.test.ts
git rm prisma/cleanup-db.cjs
git commit -m "fix: make production migrations non-destructive"
```

---

### Task 2: Add Hex Coordinate Math and Shared Domain Types

**Files:**
- Create: `lib/hex-world/types.ts`
- Create: `lib/hex-world/hex-grid.ts`
- Create: `tests/hex-grid.test.ts`

**Interfaces:**
- `type HexCoord = { q: number; r: number }`
- `type HexRotation = 0 | 1 | 2 | 3 | 4 | 5`
- `hexKey(coord): string`
- `hexNeighbors(coord): HexCoord[]`
- `hexDistance(a, b): number`
- `rotateHexOffset(offset, rotation): HexCoord`
- `axialToWorld(coord, size?, height?): { x: number; y: number; z: number }`
- `worldToAxial(x, z, size?): HexCoord`
- shared `HexWorldSnapshot`, tile/building/expansion DTOs and stable error codes.

- [ ] **Step 1: Write failing coordinate tests**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { axialToWorld, hexDistance, hexNeighbors, rotateHexOffset, worldToAxial } from '@/lib/hex-world/hex-grid';

test('axial origin round-trips through world space', () => {
  const world = axialToWorld({ q: 0, r: 0 });
  assert.deepEqual(worldToAxial(world.x, world.z), { q: 0, r: 0 });
});

test('hex neighbors are six unique adjacent cells', () => {
  const neighbors = hexNeighbors({ q: 0, r: 0 });
  assert.equal(new Set(neighbors.map(({ q, r }) => `${q}:${r}`)).size, 6);
  assert.ok(neighbors.every((coord) => hexDistance({ q: 0, r: 0 }, coord) === 1));
});

test('six rotations return an offset to its origin', () => {
  let coord = { q: 2, r: -1 };
  for (let i = 0; i < 6; i += 1) coord = rotateHexOffset(coord, 1);
  assert.deepEqual(coord, { q: 2, r: -1 });
});
```

- [ ] **Step 2: Run and confirm module-not-found failure**

```bash
node --import tsx --test tests/hex-grid.test.ts
```

- [ ] **Step 3: Implement canonical pointy-top axial math**

```ts
export const HEX_SIZE = 1;

export function axialToWorld({ q, r }: HexCoord, size = HEX_SIZE, height = 0) {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: height,
    z: size * 1.5 * r,
  };
}

export function rotateHexOffset({ q, r }: HexCoord, rotation: HexRotation): HexCoord {
  let next = { q, r };
  for (let step = 0; step < rotation; step += 1) {
    next = { q: -next.r, r: next.q + next.r };
  }
  return next;
}
```

Implement cube-rounding in `worldToAxial`.

- [ ] **Step 4: Add shared types**

At minimum:

```ts
export type HexTerrainType = 'grass' | 'soil' | 'stone' | 'water';
export type HexWorldErrorCode =
  | 'tile_locked' | 'tile_occupied' | 'invalid_terrain' | 'invalid_building'
  | 'invalid_rotation' | 'building_not_found' | 'home_locked'
  | 'expansion_not_available' | 'not_enough_points' | 'land_access_denied';
```

`HexWorldSnapshot` must contain world metadata, tiles, buildings, eligible expansions, and current shared Points.

- [ ] **Step 5: Verify and commit**

```bash
node --import tsx --test tests/hex-grid.test.ts
npm run build
git add lib/hex-world/types.ts lib/hex-world/hex-grid.ts tests/hex-grid.test.ts
git commit -m "feat: add hex world coordinate primitives"
```

---

### Task 3: Define Building Catalog, Footprints, and Pure Placement Rules

**Files:**
- Create: `lib/hex-world/building-catalog.ts`
- Create: `lib/hex-world/rules.ts`
- Create: `tests/hex-building-catalog.test.ts`
- Create: `tests/hex-world-rules.test.ts`

**Interfaces:** `BUILDING_CATALOG`, `getBuildingDefinition`, `getBuildingFootprint`, `buildOccupancyMap`, `validatePlacement`.

- [ ] **Step 1: Write catalog tests**

```ts
test('starter home is protected and multi-hex', () => {
  const home = BUILDING_CATALOG.home;
  assert.equal(home.removable, false);
  assert.ok(home.footprint.length > 1);
  assert.deepEqual(home.allowedRotations, [0, 1, 2, 3, 4, 5]);
});
```

Catalog keys are exactly `home`, `storage`, `workshop`, `tree`, `flower_patch`, `pond`, `bench`, `lamp`, `fence`, `stone_path`, `garden_patch`.

- [ ] **Step 2: Write placement rejection tests**

```ts
test('placement rejects locked tiles', () => {
  const result = validatePlacement({
    buildingKey: 'bench',
    anchor: { q: 4, r: 4 },
    rotation: 0,
    tiles: [{ q: 4, r: 4, terrainType: 'grass', unlocked: false }],
    buildings: [],
  });
  assert.deepEqual(result, { ok: false, code: 'tile_locked' });
});
```

Also cover occupied tile, invalid terrain, invalid rotation, and `ignoreBuildingId` for moves.

- [ ] **Step 3: Run and confirm failure**

```bash
node --import tsx --test tests/hex-building-catalog.test.ts tests/hex-world-rules.test.ts
```

- [ ] **Step 4: Implement data-only catalog and pure validator**

```ts
export type HexBuildingDefinition = {
  key: string;
  name: string;
  category: 'main' | 'utility' | 'nature' | 'decor';
  footprint: HexCoord[];
  allowedTerrain: HexTerrainType[];
  allowedRotations: HexRotation[];
  removable: boolean;
  duplicates: boolean;
  visual: string;
};
```

No React/Three imports in catalog/rules.

- [ ] **Step 5: Verify and commit**

```bash
node --import tsx --test tests/hex-building-catalog.test.ts tests/hex-world-rules.test.ts
git add lib/hex-world/building-catalog.ts lib/hex-world/rules.ts tests/hex-building-catalog.test.ts tests/hex-world-rules.test.ts
git commit -m "feat: define hex building placement rules"
```

---

### Task 4: Build the Deterministic 20x20 Starter Generator and Expansion Definitions

**Files:**
- Create: `lib/hex-world/generator.ts`
- Create: `lib/hex-world/expansions.ts`
- Create: `tests/hex-world-generator.test.ts`

**Interfaces:** `generateStarterWorld(seed)`, `getExpansionDefinitions(seed)`, `getEligibleExpansionDefinitions(snapshot)`.

- [ ] **Step 1: Write exact envelope/connectivity tests**

```ts
test('starter envelope is exactly 20x20', () => {
  const generated = generateStarterWorld('land-123');
  assert.equal(generated.candidates.length, 400);
  assert.ok(generated.candidates.every(({ q, r }) => q >= -10 && q <= 9 && r >= -10 && r <= 9));
});

test('starter island is connected and within target size', () => {
  const generated = generateStarterWorld('land-123');
  assert.ok(generated.tiles.length >= 260 && generated.tiles.length <= 340);
  assert.equal(isConnectedHexSet(generated.tiles), true);
});

test('starter home is fixed at origin', () => {
  assert.deepEqual(generateStarterWorld('land-123').buildings[0], {
    buildingKey: 'home', anchorQ: 0, anchorR: 0, rotation: 0, metadata: { starter: true },
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/hex-world-generator.test.ts
```

- [ ] **Step 3: Implement deterministic PRNG**

```ts
function hashSeed(seed: string) {
  let value = 2166136261;
  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
```

Generate all 400 coordinates first; choose a deterministic 260-340 connected subset from origin using radial score + seeded noise + flood-fill repair. Never call `Math.random()`.

- [ ] **Step 4: Add deterministic terrain and fixed expansions**

Terrain uses grass centrally, soil garden cluster, one off-center water pond, stone edge accents, subtle height levels. Expansion definitions must expose connected 7/19/37 clusters costing 100/250/500, with stable keys such as `${tier}:${directionIndex}:${ringIndex}`.

- [ ] **Step 5: Verify and commit**

```bash
node --import tsx --test tests/hex-world-generator.test.ts
git add lib/hex-world/generator.ts lib/hex-world/expansions.ts tests/hex-world-generator.test.ts
git commit -m "feat: generate deterministic floating hex lands"
```

---

### Task 5: Add Additive Prisma Hex Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260820000000_add_hex_homestead/migration.sql`
- Create: `tests/hex-world-schema.test.ts`

**Interfaces:** `Land.hexWorld?: HexWorld`; HexWorld owns tiles/buildings/expansions.

- [ ] **Step 1: Write failing schema contract test**

```ts
test('schema defines additive hex persistence tied to Land', async () => {
  const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  for (const model of ['HexWorld', 'HexTile', 'HexBuilding', 'HexExpansion']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /hexWorld\s+HexWorld\?/);
  assert.match(schema, /@@unique\(\[worldId, q, r\]\)/);
  assert.match(schema, /@@unique\(\[worldId, expansionKey\]\)/);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/hex-world-schema.test.ts
```

- [ ] **Step 3: Add Prisma models**

```prisma
model HexWorld {
  id               String         @id @default(uuid())
  landId           String         @unique
  schemaVersion    Int            @default(1)
  generatorVersion Int            @default(1)
  seed             String
  expansionLevel   Int            @default(0)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  land             Land           @relation(fields: [landId], references: [id], onDelete: Cascade)
  tiles            HexTile[]
  buildings        HexBuilding[]
  expansions       HexExpansion[]
}
```

Add `HexTile` unique `(worldId,q,r)`, `HexBuilding`, and `HexExpansion` unique `(worldId,expansionKey)` exactly as specified. Add `hexWorld HexWorld?` to `Land`.

- [ ] **Step 4: Write additive-only SQL**

Migration may only create Hex tables/indexes/FKs. It must contain no `DROP TABLE`, no `DROP COLUMN`, and no legacy-data rewrite.

- [ ] **Step 5: Validate and commit**

```bash
node --import tsx --test tests/hex-world-schema.test.ts
npx prisma validate
npx prisma generate
git add prisma/schema.prisma prisma/migrations/20260820000000_add_hex_homestead/migration.sql tests/hex-world-schema.test.ts
git commit -m "feat: add persistent hex world models"
```

---

### Task 6: Implement Lazy World Initialization and Building Persistence Service

**Files:**
- Create: `lib/hex-world/service.ts`
- Create: `tests/hex-world-service.test.ts`

**Interfaces:** `getOrCreateHexWorldSnapshot(configId, landId)`, `placeHexBuilding`, `updateHexBuilding`, `removeHexBuilding`, `HexWorldServiceError`.

- [ ] **Step 1: Write lazy-init/access tests with a minimal fake client**

```ts
test('lazy initialization preserves legacy purchased items', async () => {
  const fake = makeHexWorldFake({ land: { id: 'land-1', configId: 'circle-1', items: [{ id: 'legacy-1', type: 'tree' }] } });
  const snapshot = await getOrCreateHexWorldSnapshotWithClient(fake, 'circle-1', 'land-1');
  assert.equal(snapshot.world.landId, 'land-1');
  assert.equal(fake.legacyItemsDeleted, 0);
  assert.equal(snapshot.buildings.filter((item) => item.buildingKey === 'home').length, 1);
});
```

Also test wrong-config Land rejection.

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/hex-world-service.test.ts
```

- [ ] **Step 3: Implement Land authorization**

Every service entry point loads `land` by `{ id: landId, configId }`; no service accepts only `landId` without `configId`.

- [ ] **Step 4: Implement Serializable lazy initialization**

Inside one transaction: re-check world; create `HexWorld(seed=landId)` if absent; bulk-create generated starter tiles; create starter Home; return snapshot. On concurrent unique conflict, re-read the winner.

- [ ] **Step 5: Implement building mutations**

Placement/move query current tiles/buildings inside the transaction and call `validatePlacement`. Home removal throws `HexWorldServiceError('home_locked', 409, ...)`.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-world-service.test.ts tests/hex-world-rules.test.ts
git add lib/hex-world/service.ts tests/hex-world-service.test.ts
git commit -m "feat: persist hex worlds and buildings"
```

---

### Task 7: Add Atomic Shared-Points Expansion Purchase

**Files:**
- Modify: `lib/stats-service.ts`
- Modify: `lib/hex-world/service.ts`
- Extend: `tests/hex-world-service.test.ts`

**Interfaces:** `allocateSharedPointSpend`, `spendSharedPoints(client, configId, amount)`, `expandHexWorld(configId, landId, expansionKey)`.

- [ ] **Step 1: Write deterministic deduction test**

```ts
test('shared points spend without going negative', () => {
  assert.deepEqual(
    allocateSharedPointSpend([{ id: 'p1', points: 70 }, { id: 'p2', points: 50 }], 100),
    [{ id: 'p1', amount: 70 }, { id: 'p2', amount: 30 }],
  );
});
```

- [ ] **Step 2: Write idempotency/insufficient-points tests**

Same `expansionKey` requested twice must not charge twice; insufficient total Points must fail before any decrement.

- [ ] **Step 3: Run and confirm failure**

```bash
node --import tsx --test tests/hex-world-service.test.ts
```

- [ ] **Step 4: Implement shared-point spend**

Load partners ordered `points DESC, id ASC`; calculate all deductions before updates; decrement spendable `points` only; never increment `lifetimePoints` when spending.

- [ ] **Step 5: Implement expansion as one Serializable transaction**

Order: authorize Land → load world/purchased keys → resolve server definition → return current snapshot if already purchased → verify eligibility → spend Points → create/unlock tiles → create `HexExpansion` → increment `expansionLevel` → return snapshot. Retry `P2034`.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-world-service.test.ts
git add lib/stats-service.ts lib/hex-world/service.ts tests/hex-world-service.test.ts
git commit -m "feat: add atomic hex land expansion"
```

---

### Task 8: Expose HexWorld HTTP APIs and Typed Browser Client

**Files:**
- Create: `app/api/hex-world/route.ts`
- Create: `app/api/hex-world/buildings/route.ts`
- Create: `app/api/hex-world/buildings/[id]/route.ts`
- Create: `app/api/hex-world/expand/route.ts`
- Create: `services/hex-world-api.ts`
- Create: `tests/hex-world-api-contract.test.ts`

**Interfaces:** all routes use `requireConfigAccess`; client methods `get`, `place`, `update`, `remove`, `expand`; stable errors `{ error, code }`.

- [ ] **Step 1: Write route-source security contract tests**

```ts
test('all hex mutation routes require config access', async () => {
  for (const path of [
    '../app/api/hex-world/buildings/route.ts',
    '../app/api/hex-world/buildings/[id]/route.ts',
    '../app/api/hex-world/expand/route.ts',
  ]) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /requireConfigAccess/);
    assert.match(source, /isConfigAccessDenied/);
  }
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/hex-world-api-contract.test.ts
```

- [ ] **Step 3: Implement GET and mutation routes**

GET requires `landId` query. Place accepts only `{ landId, buildingKey, anchorQ, anchorR, rotation }`; update accepts `{ landId, anchorQ?, anchorR?, rotation? }`; expand accepts `{ landId, expansionKey }`. Never accept footprint, cost, terrain rule, or unlocked coordinates from browser.

- [ ] **Step 4: Implement typed API client**

Reuse active Circle header from `getActiveCircleId`. Preserve server `code` with `HexWorldApiError extends Error`.

- [ ] **Step 5: Verify and commit**

```bash
node --import tsx --test tests/hex-world-api-contract.test.ts
npm run build
git add app/api/hex-world services/hex-world-api.ts tests/hex-world-api-contract.test.ts
git commit -m "feat: expose hex homestead APIs"
```

---

### Task 9: Render the Floating Hex Island with Instanced Tiles

**Files:**
- Create: `components/hex-world/HexWorld3D.tsx`
- Create: `components/hex-world/HexTileInstances.tsx`
- Create: `components/hex-world/HexBuildings.tsx`
- Create: `components/hex-world/HexBuildingModels.tsx`
- Create: `components/hex-world/HexWorldLoading.tsx`
- Create: `lib/hex-world/rendering.ts`
- Create: `tests/hex-world-rendering.test.ts`

**Interfaces:** `HexWorld3D` consumes `HexWorldSnapshot` plus transient interaction state; tiles use instancing.

- [ ] **Step 1: Write rendering-math tests**

```ts
test('tile transform uses axial coordinate and stored height', () => {
  const transform = getHexTileTransform({ q: 2, r: -1, height: 0.3 });
  const expected = axialToWorld({ q: 2, r: -1 }, 1, 0.3);
  assert.deepEqual(transform.position, expected);
});

test('rotation 3 maps to half-turn yaw', () => {
  assert.equal(hexRotationToRadians(3), Math.PI);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/hex-world-rendering.test.ts
```

- [ ] **Step 3: Implement cozy diorama scene**

Use elevated perspective, constrained OrbitControls, warm directional/hemisphere light, soft shadows, fog/cloud layer below island, no character controller and no Explore/Orbit selector.

- [ ] **Step 4: Implement instanced hex prisms**

Use shared six-sided cylinder geometry (for example `<cylinderGeometry args={[1, 1, 0.72, 6]} />`) and instance matrices per terrain/material group. Highlight hover/build/expansion separately; do not mount one React mesh per tile.

- [ ] **Step 5: Implement local stylized building primitives**

Home, Storage, Workshop, Tree, Flower Patch, Pond, Bench, Lamp, Fence, Stone Path, Garden Patch use chunky local geometry so MVP does not block on external GLBs.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-world-rendering.test.ts
npm run build
git add components/hex-world lib/hex-world/rendering.ts tests/hex-world-rendering.test.ts
git commit -m "feat: render cozy floating hex lands"
```

---

### Task 10: Add Build / Move / Rotate / Remove Interaction State and UI

**Files:**
- Create: `lib/hex-world/build-state.ts`
- Create: `components/hex-world/HexBuildCatalog.tsx`
- Create: `components/hex-world/HexBuildController.tsx`
- Create: `tests/hex-build-state.test.ts`
- Modify: `components/hex-world/HexWorld3D.tsx`

**Interfaces:** pure reducer `createInitialHexBuildState`, `hexBuildReducer`; interaction states are `'idle' | 'placing' | 'moving' | 'expanding'` and are not app/game modes.

- [ ] **Step 1: Write reducer tests**

```ts
test('selecting a catalog item starts placement', () => {
  const state = hexBuildReducer(createInitialHexBuildState(), { type: 'select_building', buildingKey: 'bench' });
  assert.equal(state.mode, 'placing');
  assert.equal(state.buildingKey, 'bench');
  assert.equal(state.rotation, 0);
});

test('rotation wraps after six directions', () => {
  const state = hexBuildReducer({ ...createInitialHexBuildState(), mode: 'placing', buildingKey: 'workshop', rotation: 5 }, { type: 'rotate_clockwise' });
  assert.equal(state.rotation, 0);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/hex-build-state.test.ts
```

- [ ] **Step 3: Implement reducer and catalog UI**

Build panel categories: Main, Utility, Nature, Decor. Selecting an item produces ghost preview; green/red validation is client preview only.

- [ ] **Step 4: Implement server-confirmed placement**

On confirm call `hexWorldAPI.place`; replace permanent snapshot only with server response. On rejection keep preview active and show toast.

- [ ] **Step 5: Implement selected-building actions**

Move, Rotate, Remove. Starter Home never exposes Remove. Main-structure removal requires confirmation.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-build-state.test.ts tests/hex-world-rules.test.ts
npm run build
git add lib/hex-world/build-state.ts components/hex-world/HexBuildCatalog.tsx components/hex-world/HexBuildController.tsx components/hex-world/HexWorld3D.tsx tests/hex-build-state.test.ts
git commit -m "feat: add hex homestead build interactions"
```

---

### Task 11: Add Expansion Selection, Confirmation, and Settle Animation

**Files:**
- Create: `components/hex-world/HexExpansionController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Extend: `tests/hex-build-state.test.ts`

- [ ] **Step 1: Add expansion-state test**

```ts
test('expansion preview is separate from build placement', () => {
  const state = hexBuildReducer(createInitialHexBuildState(), { type: 'preview_expansion', expansionKey: '1:0:0' });
  assert.equal(state.mode, 'expanding');
  assert.equal(state.expansionKey, '1:0:0');
  assert.equal(state.buildingKey, null);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/hex-build-state.test.ts
```

- [ ] **Step 3: Implement Expand Land UI**

Only eligible clusters show amber. Each option shows `+7/+19/+37` and `100/250/500 Points`; insufficient options are disabled; confirm is explicit.

- [ ] **Step 4: Commit server state before animation**

```ts
const confirmed = await hexWorldAPI.expand(landId, expansionKey);
setSnapshot(confirmed);
startExpansionAnimation(expansionKey);
```

Never animate unconfirmed tiles into permanent state.

- [ ] **Step 5: Animate newly confirmed tiles**

Diff old/new coordinate keys; animate new instances from below-cloud Y/scale to stored height.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-build-state.test.ts tests/hex-world-generator.test.ts
npm run build
git add components/hex-world/HexExpansionController.tsx components/hex-world/HexWorld3D.tsx tests/hex-build-state.test.ts
git commit -m "feat: add visual hex land expansion"
```

---

### Task 12: Replace `/garden` World Stage While Preserving Existing Shell

**Files:**
- Modify: `app/garden/_components/GardenWorldStage.tsx`
- Create: `tests/garden-hex-integration.test.ts`
- Do not modify unless compile requires it: `GardenTopControls.tsx`, `GardenAcceptedContent.tsx`, `GardenStatusOverlays.tsx`.

- [ ] **Step 1: Write failing integration guard**

```ts
test('garden mounts HexWorld and no old renderer', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenWorldStage.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexWorld3D/);
  assert.doesNotMatch(source, /LoveTree3D/);
  assert.doesNotMatch(source, /FamilyLife2D/);
  assert.doesNotMatch(source, /WorldMMO3D/);
});
```

Also assert existing shell source still contains Home/Timeline/Coupons/Letters labels.

- [ ] **Step 2: Run and confirm failure**

```bash
node --import tsx --test tests/garden-hex-integration.test.ts
```

- [ ] **Step 3: Replace only the world stage**

Resolve active Land, fetch/re-fetch snapshot on Land change, render loading/error/retry, mount HexWorld + controllers, preserve ProposalScreen behavior exactly. Do not move app-shell responsibilities into the renderer.

- [ ] **Step 4: Guard against stale Land responses**

Use AbortController or monotonically increasing request token so old Land fetches cannot overwrite the current Land.

- [ ] **Step 5: Run regression gate**

```bash
node --import tsx --test tests/garden-hex-integration.test.ts tests/family-farm-game.test.ts tests/hex-grid.test.ts tests/hex-building-catalog.test.ts tests/hex-world-generator.test.ts tests/hex-world-rules.test.ts tests/hex-world-service.test.ts tests/hex-world-rendering.test.ts tests/hex-build-state.test.ts tests/production-startup.test.ts
npm run lint
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/garden/_components/GardenWorldStage.tsx tests/garden-hex-integration.test.ts
git commit -m "feat: switch garden to floating hex homestead"
```

---

### Task 13: Add Dedicated CI and Production Release Verification

**Files:**
- Create: `.github/workflows/hex-homestead-ci.yml`
- Modify `.github/workflows/family-farm-ci.yml` only if duplicate full-build coverage needs reduction.

- [ ] **Step 1: Add CI workflow**

```yaml
name: Hex Homestead CI

on:
  pull_request:
    branches: [main]
    paths:
      - 'app/api/hex-world/**'
      - 'app/garden/**'
      - 'components/hex-world/**'
      - 'lib/hex-world/**'
      - 'lib/stats-service.ts'
      - 'services/hex-world-api.ts'
      - 'prisma/schema.prisma'
      - 'prisma/migrations/20260820000000_add_hex_homestead/**'
      - 'Dockerfile'
      - 'tests/hex-*.test.ts'
      - 'tests/garden-hex-integration.test.ts'
      - 'tests/production-startup.test.ts'
      - '.github/workflows/hex-homestead-ci.yml'

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/narinyland_ci
      NEXT_PUBLIC_API_URL: /api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx prisma validate
      - run: node --import tsx --test tests/hex-grid.test.ts tests/hex-building-catalog.test.ts tests/hex-world-generator.test.ts tests/hex-world-rules.test.ts tests/hex-world-schema.test.ts tests/hex-world-service.test.ts tests/hex-world-api-contract.test.ts tests/hex-world-rendering.test.ts tests/hex-build-state.test.ts tests/garden-hex-integration.test.ts tests/production-startup.test.ts
      - run: npm run lint
      - run: npm run build
```

- [ ] **Step 2: Run full local-equivalent validation**

```bash
npm test
npx prisma validate
npm run lint
npm run build
```

- [ ] **Step 3: Open implementation PR**

PR body must call out additive DB migration, removal of destructive startup cleanup, lazy world creation, legacy data preservation, no game-mode controls, exact 20x20/400 envelope, and fixed expansion costs.

- [ ] **Step 4: Require green CI before merge**

Hex Homestead CI must pass; existing Family Farm/AppKit workflows must pass when triggered.

- [ ] **Step 5: Verify Railway after merge**

Confirm merged SHA is deployed; `20260820000000_add_hex_homestead` applies; runtime logs contain no cleanup/drop/migration-history deletion; app/Postgres/Redis are `SUCCESS`; authenticated GET `/api/hex-world?landId=<active>` returns 200 twice with same world ID/tile count; legacy `PurchasedItem` row count is not reduced by initialization.

- [ ] **Step 6: Production smoke**

On a safe authenticated test Land: place one removable decoration, move/rotate it, remove it, preview expansion, and only purchase expansion when using acceptable test data.

- [ ] **Step 7: Commit workflow if adjusted before PR**

```bash
git add .github/workflows/hex-homestead-ci.yml
git commit -m "ci: validate floating hex homestead"
```

---

## Plan Self-Review Matrix

| Spec requirement | Implemented by |
|---|---|
| 20x20 / 400 candidate starter envelope | Tasks 2, 4 |
| 260-340 connected organic starter tiles | Task 4 |
| Home at `(0,0)` and non-removable | Tasks 3, 4, 6 |
| Axial coordinates / six rotations | Tasks 2, 3 |
| Build preview/place/move/rotate/remove | Tasks 3, 6, 10 |
| Free building placement | Tasks 3, 6 |
| 7/19/37 expansions; 100/250/500 Points | Tasks 4, 7, 11 |
| Serializable/idempotent expansion | Task 7 |
| Additive Hex persistence | Task 5 |
| Lazy world creation | Task 6 |
| Preserve legacy PurchasedItem/farm data | Tasks 1, 5, 6, 13 |
| Cozy instanced floating renderer | Task 9 |
| No game/character movement mode | Tasks 9, 12 |
| Keep existing app shell | Task 12 |
| Server authoritative | Tasks 3, 6, 7, 8, 10, 11 |
| Error/retry behavior | Tasks 6, 8, 10, 12 |
| CI + Railway verification | Task 13 |
| Remove destructive startup cleanup | Task 1 |

## Execution Notes

- Execute on a dedicated feature branch based on the spec-bearing `main` commit.
- At execution time, use `superpowers:using-git-worktrees` when working in Codex/local git; with GitHub-only tooling, preserve the same isolation using a dedicated feature branch.
- Follow TDD within each task and commit after each independently reviewable deliverable.
- Do not combine the database migration, renderer, and interaction controller into one large commit.
- Do not remove dormant family-farm code or legacy `PurchasedItem` data in this feature; cleanup is a separate future decision.
