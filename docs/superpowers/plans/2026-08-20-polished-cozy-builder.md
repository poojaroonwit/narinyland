# Phase 2 — Polished Cozy Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Narinyland `/garden` into the approved Visual-Wow-first premium floating diorama while preserving the production HexWorld architecture, making Build/Expand interactions world-centric, and adding one-step server-backed Undo for Place/Move/Rotate/Remove.

**Architecture:** Keep the existing axial HexWorld, Prisma persistence, shared-Points expansion transaction, app shell, and server-authoritative validation. Split renderer/controller responsibilities into focused camera, lighting, atmosphere, underside, particle, selection, toolbar, expansion, and undo units. Reversible building mutations gain a monotonic `HexWorld.revision` plus short-lived Redis inverse descriptors so Undo rejects stale/concurrent edits without long-lived history.

**Tech Stack:** Next.js 16.x, React 19, TypeScript, React Three Fiber 9, Drei 10, Three 0.182, Framer Motion 12, Prisma 6/PostgreSQL, ioredis 5/Redis, Node 22 built-in test runner + tsx, Railway.

**Spec:** `docs/superpowers/specs/2026-08-20-polished-cozy-builder-design.md`

## Global Constraints

- Priority: **Visual Wow > Builder UX > Mobile/Performance**.
- Visual direction: **Magical Floating Garden + Premium Miniature Diorama** using the approved Hero Island Polish approach.
- Preserve canonical axial `(q, r)` coordinates and server-authoritative placement/expansion rules.
- Preserve Circle/Land/Profile/Settings/Proposal plus Home/Timeline/Coupons/Letters shell behavior.
- Do not add LAND/WORLD selectors, camera-mode selectors, WASD, avatar walking, NPCs, multiplayer building, farming economy, crafting, seasons, or weather gameplay.
- Existing `Land`, `PurchasedItem`, family-farm saves, `HexWorld`, `HexTile`, `HexBuilding`, and `HexExpansion` data must not be destructively migrated or regenerated.
- Building placement remains free. Expansion remains 7/19/37 hexes for 100/250/500 shared Points and is non-undoable.
- Undo supports only the latest Place/Move/Rotate/Remove opportunity, approximately 12 seconds, scoped to authenticated `(configId, landId, userId)`.
- Core Place/Move/Rotate/Remove must remain successful if Redis/Undo storage is unavailable; successful mutations then return `undo: null`.
- Hover/orbit/preview never writes to the server.
- No real-time planar reflection, required heavy Bloom/DOF pipeline, or continuous FPS-driven quality switching.
- Desktop Medium must remain responsive during orbit/build. Mobile fallback must remain usable in portrait and landscape.

---

## Target File Structure

### Pure Hex/visual logic
- `lib/hex-world/camera.ts` — bounds, camera intent/poses, expansion reframe predicate.
- `lib/hex-world/quality.ts` — High/Medium/Mobile profiles.
- `lib/hex-world/visual-variation.ts` — deterministic rotation/scale/tone/density ranking.
- `lib/hex-world/placement-message.ts` — stable invalid-placement copy.
- `lib/hex-world/screen-space.ts` — contextual-toolbar viewport clamp.
- `lib/hex-world/transaction.ts` — shared Serializable transaction retry helper.
- `lib/hex-world/undo-types.ts` — scope/descriptors/meta/claims.
- `lib/hex-world/undo-store.ts` — Redis token/latest-pointer/claim lifecycle behind an injectable adapter.
- `lib/hex-world/undo-service.ts` — authoritative inverse mutations.
- `lib/hex-world/reversible-mutation.ts` — converts committed DB mutation results into optional Undo opportunities.

### 3D renderer
- `components/hex-world/HexDioramaCamera.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `components/hex-world/HexSkyAtmosphere.tsx`
- `components/hex-world/HexIslandUnderside.tsx`
- `components/hex-world/HexWorldParticles.tsx`
- `components/hex-world/HexSelectionEffects.tsx`
- `components/hex-world/HexWaterSurface.tsx`
- `components/hex-world/models/HexStructureModels.tsx`
- `components/hex-world/models/HexNatureModels.tsx`
- `components/hex-world/models/HexDecorModels.tsx`
- Existing `HexWorld3D.tsx`, `HexAmbientDecor.tsx`, `HexBuildings.tsx`, `HexBuildingModels.tsx`, `HexTileInstances.tsx` become composition/dispatch-focused.

### Builder UI
- `components/hex-world/HexWorldToolbar.tsx`
- `components/hex-world/HexPlacementBar.tsx`
- `components/hex-world/HexBuildingContextToolbar.tsx`
- `components/hex-world/HexRemovalConfirm.tsx`
- `components/hex-world/HexExpansionClusters.tsx`
- `components/hex-world/HexUndoToast.tsx`
- `components/hex-world/useHexKeyboardShortcuts.ts`
- Existing `HexBuildCatalog.tsx`, `HexExpansionController.tsx`, `HexBuildController.tsx` remain orchestrators but shrink.

### Server/API
- Add `revision Int @default(0)` to `HexWorld` using additive migration `prisma/migrations/20260820010000_add_hex_world_revision/migration.sql`.
- Add `POST /api/hex-world/undo`.
- POST/PATCH/DELETE building routes return `{ snapshot, undo }`; GET and Expand remain `HexWorldSnapshot`.

---

### Task 1: Add Camera, Quality, Visual Variation, Placement Copy, and Screen-Space Primitives

**Files:**
- Create: `lib/hex-world/camera.ts`
- Create: `lib/hex-world/quality.ts`
- Create: `lib/hex-world/visual-variation.ts`
- Create: `lib/hex-world/placement-message.ts`
- Create: `lib/hex-world/screen-space.ts`
- Test: `tests/hex-camera.test.ts`
- Test: `tests/hex-quality.test.ts`
- Test: `tests/hex-visual-variation.test.ts`
- Test: `tests/hex-builder-primitives.test.ts`

**Interfaces:**

```ts
export type HexIslandBounds = {
  minX: number; maxX: number; minZ: number; maxZ: number;
  center: [number, number, number]; radius: number;
};
export type HexCameraPose = {
  position: [number, number, number]; target: [number, number, number]; distance: number;
};
export type HexCameraIntent =
  | { kind: 'overview' }
  | { kind: 'focus'; coord: HexCoord }
  | { kind: 'build'; anchor: HexCoord | null };
export type HexVisualVariation = {
  rotation: number; scale: number; tone: number; densityRank: number;
};
```

Produces `getUnlockedIslandBounds`, `getOverviewCameraPose`, `getFocusCameraPose`, `getBuildCameraPose`, `shouldReframeForCoords`, `resolveHexQualityProfile`, `getVisualVariation`, `getPlacementMessage`, `clampScreenPoint`.

- [ ] **Step 1: Write failing camera tests**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOverviewCameraPose, getUnlockedIslandBounds, shouldReframeForCoords } from '@/lib/hex-world/camera';

test('overview framing follows unlocked island bounds', () => {
  const tiles = [
    { q: -2, r: 0, terrainType: 'grass', height: 0, unlocked: true },
    { q: 3, r: 1, terrainType: 'grass', height: 0.2, unlocked: true },
  ];
  const bounds = getUnlockedIslandBounds(tiles);
  const pose = getOverviewCameraPose(bounds, 16 / 9);
  assert.ok(bounds.radius > 0);
  assert.ok(pose.position[1] > 0);
  assert.ok(pose.distance >= bounds.radius * 1.6);
  assert.equal(shouldReframeForCoords(bounds, [{ q: 3, r: 1 }]), false);
  assert.equal(shouldReframeForCoords(bounds, [{ q: 20, r: 20 }]), true);
});
```

- [ ] **Step 2: Verify RED**

```bash
node --import tsx --test tests/hex-camera.test.ts
```

Expected: FAIL because camera module is absent.

- [ ] **Step 3: Implement deterministic camera math**

Use unlocked tiles only. Empty input returns center `[0,0,0]`, radius `5`. Overview uses:

```ts
const portraitPenalty = aspect < 1 ? 1.22 : 1;
const distance = Math.max(12, bounds.radius * 2.15 * portraitPenalty);
```

Focus never goes closer than `max(10, overview.distance * 0.72)`. Build framing is slightly more top-down and may target current anchor while retaining local context.

- [ ] **Step 4: Write quality tests RED**

```ts
const mobile = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 390, devicePixelRatio: 3 });
assert.equal(mobile.name, 'mobile');
assert.equal(mobile.maxDpr, 1);
const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440, devicePixelRatio: 2 });
assert.equal(high.shadowMapSize, 2048);
assert.ok(high.maxDpr <= 1.75);
```

- [ ] **Step 5: Implement exact quality profile type**

```ts
export type HexQualityProfile = {
  name: 'high' | 'medium' | 'mobile';
  maxDpr: number;
  shadowMapSize: 2048 | 1024 | 512;
  contactShadowResolution: 512 | 256 | 128;
  cloudLayers: 3 | 2 | 1;
  ambientDensity: 1 | 0.75 | 0.5;
  particleCount: 180 | 90 | 36;
  windStrength: 1 | 0.55 | 0.2;
  waterDetail: 'full' | 'reduced' | 'basic';
};
```

Viewport `< 640` resolves mobile. Desktop honors high/medium; low/unknown maps mobile.

- [ ] **Step 6: Implement deterministic variation**

`getVisualVariation(seed, coord)` returns stable ranges: rotation `[0,2π)`, scale `[0.85,1.15]`, tone `[-0.08,0.08]`, densityRank `[0,1]`. Never use `Math.random()`.

- [ ] **Step 7: Implement placement copy + clamp tests**

```ts
assert.equal(getPlacementMessage('tile_occupied'), 'Occupied');
assert.equal(getPlacementMessage('invalid_terrain'), 'Needs compatible terrain');
assert.equal(getPlacementMessage('tile_locked'), 'Outside unlocked land');
assert.deepEqual(clampScreenPoint({ x: -10, y: 900 }, { width: 390, height: 844 }, 16), { x: 16, y: 828 });
```

- [ ] **Step 8: Verify GREEN and commit**

```bash
node --import tsx --test tests/hex-camera.test.ts tests/hex-quality.test.ts tests/hex-visual-variation.test.ts tests/hex-builder-primitives.test.ts
git add lib/hex-world/camera.ts lib/hex-world/quality.ts lib/hex-world/visual-variation.ts lib/hex-world/placement-message.ts lib/hex-world/screen-space.ts tests/hex-camera.test.ts tests/hex-quality.test.ts tests/hex-visual-variation.test.ts tests/hex-builder-primitives.test.ts
git commit -m "feat: add polished hex camera and quality primitives"
```

---

### Task 2: Replace Hard-Coded Camera With Smart Diorama Camera and Split Scene Infrastructure

**Files:**
- Create: `components/hex-world/HexDioramaCamera.tsx`
- Create: `components/hex-world/HexWorldLighting.tsx`
- Create: `components/hex-world/HexSkyAtmosphere.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `app/garden/_components/GardenWorldStage.tsx`
- Test: `tests/hex-world-rendering.test.ts`
- Test: `tests/garden-hex-integration.test.ts`

**Interfaces:** Consumes Task 1 `HexCameraIntent`, camera math, and quality profile. `HexWorld3D` gains `cameraIntent`, `resetNonce`, `graphicsQuality`, `reframeCoords` props.

- [ ] **Step 1: Add source-contract RED test**

```ts
assert.match(scene, /HexDioramaCamera/);
assert.match(scene, /HexWorldLighting/);
assert.match(scene, /HexSkyAtmosphere/);
assert.doesNotMatch(scene, /position: \[17, 18, 22\]/);
```

- [ ] **Step 2: Implement `HexDioramaCamera`**

Use `useThree`, `useFrame`, and a Drei `OrbitControls` ref. Ease camera/target only while scripted motion is active. `onStart` cancels scripted motion immediately.

```tsx
<OrbitControls ref={controlsRef} makeDefault enablePan={false} enableDamping dampingFactor={0.07}
  minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 2.35}
  minDistance={10} maxDistance={52}
  onStart={() => { scriptedMotion.current = false; }} />
```

`resetNonce` restarts Overview. `reframeCoords` acts only when Task 1 predicate says needed.

- [ ] **Step 3: Extract light/sky ownership**

`HexWorldLighting(profile)` owns hemisphere/ambient/directional/contact shadows. Only one directional light is primary real-time shadow source. `HexSkyAtmosphere(profile)` owns background/fog/clouds; clouds never cast shadow.

- [ ] **Step 4: Derive camera intent in controller**

```ts
const cameraIntent: HexCameraIntent = state.mode === 'placing' || state.mode === 'moving'
  ? { kind: 'build', anchor: state.anchor }
  : selectedBuilding
    ? { kind: 'focus', coord: { q: selectedBuilding.anchorQ, r: selectedBuilding.anchorR } }
    : { kind: 'overview' };
```

Pass existing `appConfig.graphicsQuality` from GardenWorldStage. Add reset nonce only; no visible camera-mode selector.

- [ ] **Step 5: Preserve Home pointer/shell behavior and verify**

```bash
node --import tsx --test tests/hex-camera.test.ts tests/hex-quality.test.ts tests/hex-world-rendering.test.ts tests/garden-hex-integration.test.ts
git add components/hex-world/HexDioramaCamera.tsx components/hex-world/HexWorldLighting.tsx components/hex-world/HexSkyAtmosphere.tsx components/hex-world/HexWorld3D.tsx components/hex-world/HexBuildController.tsx app/garden/_components/GardenWorldStage.tsx tests/hex-world-rendering.test.ts tests/garden-hex-integration.test.ts
git commit -m "feat: add smart diorama camera and scene infrastructure"
```

---

### Task 3: Add Organic Underside, Layered Atmosphere, Particles, and Water

**Files:**
- Create: `components/hex-world/HexIslandUnderside.tsx`
- Create: `components/hex-world/HexWorldParticles.tsx`
- Create: `components/hex-world/HexWaterSurface.tsx`
- Modify: `components/hex-world/HexSkyAtmosphere.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Test: `tests/hex-render-budget.test.ts`
- Test: `tests/hex-world-rendering.test.ts`

- [ ] **Step 1: Write render-budget RED test**

```ts
assert.match(scene, /HexIslandUnderside/);
assert.match(scene, /HexWorldParticles/);
assert.match(scene, /HexWaterSurface/);
assert.doesNotMatch(scene, /EffectComposer|DepthOfField|Bloom|MeshReflectorMaterial/);
```

- [ ] **Step 2: Implement underside**

Render 8–14 low-poly rock masses derived from island bounds + seed below logical surface. Use instancing when geometry/material match; no pointer handlers or persistence.

- [ ] **Step 3: Implement one shared particle field**

One `<points>` buffer; count = `profile.particleCount`; deterministic positions; animate shared buffer/uniform only.

- [ ] **Step 4: Implement water**

Render water-tile overlays with soft turquoise transparent standard material, low metalness, moderate/high roughness and tiny shared ripple impression. High may show sparse ring ripples; reduced/mobile omit rings. No planar reflection.

- [ ] **Step 5: Layer clouds by profile**

3/2/1 deterministic depth layers for High/Medium/Mobile; slow drift; no `castShadow`.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-quality.test.ts tests/hex-visual-variation.test.ts tests/hex-world-rendering.test.ts tests/hex-render-budget.test.ts
git add components/hex-world/HexIslandUnderside.tsx components/hex-world/HexWorldParticles.tsx components/hex-world/HexWaterSurface.tsx components/hex-world/HexSkyAtmosphere.tsx components/hex-world/HexWorld3D.tsx tests/hex-world-rendering.test.ts tests/hex-render-budget.test.ts
git commit -m "feat: add premium floating island atmosphere"
```

---

### Task 4: Rebuild Building and Ambient Art as One Miniature Language

**Files:**
- Create: `components/hex-world/models/HexStructureModels.tsx`
- Create: `components/hex-world/models/HexNatureModels.tsx`
- Create: `components/hex-world/models/HexDecorModels.tsx`
- Modify: `components/hex-world/HexBuildingModels.tsx`
- Modify: `components/hex-world/HexAmbientDecor.tsx`
- Modify: `components/hex-world/HexBuildings.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Test: `tests/hex-building-art.test.ts`
- Test: `tests/hex-world-rendering.test.ts`

**Interfaces:** `HexAmbientDecor({ tiles, seed, profile })`; `HexWorld3D` passes `snapshot.world.seed` and its resolved Task 1 profile.

- [ ] **Step 1: Write catalog-art RED test**

Assert every exact MVP key (`home`, `storage`, `workshop`, `tree`, `flower_patch`, `pond`, `bench`, `lamp`, `fence`, `stone_path`, `garden_patch`) is dispatched once and core visuals do not require remote model URLs.

- [ ] **Step 2: Implement structures**

Home: cream wall, terracotta roof, chimney, porch, warm panes, planter. Storage: matching shed/barn. Workshop: wider/lower moss roof, chimney/tool accents. Catalog footprints remain authoritative.

- [ ] **Step 3: Implement nature/utility/decor modules**

Tree uses clustered rounded canopy; pond matches water/reeds/stones; flowers/garden grouped miniature forms. Bench/lamp/fence/path share wood/stone palette. Lamp uses emissive material only, no point light per lamp.

- [ ] **Step 4: Upgrade ambient decor with exact deterministic interface**

```ts
const variation = getVisualVariation(seed, { q: tile.q, r: tile.r });
const visible = variation.densityRank <= profile.ambientDensity;
```

Use variation rotation/scale/tone. Never `Math.random()`.

- [ ] **Step 5: Verify and commit**

```bash
node --import tsx --test tests/hex-building-catalog.test.ts tests/hex-building-art.test.ts tests/hex-visual-variation.test.ts tests/hex-world-rendering.test.ts
npm run build
git add components/hex-world/models components/hex-world/HexBuildingModels.tsx components/hex-world/HexAmbientDecor.tsx components/hex-world/HexBuildings.tsx components/hex-world/HexWorld3D.tsx tests/hex-building-art.test.ts tests/hex-world-rendering.test.ts
git commit -m "feat: apply premium miniature homestead art pass"
```

---

### Task 5: Add Selection, Placement Feedback, and Shared Motion Language

**Files:**
- Create: `components/hex-world/HexSelectionEffects.tsx`
- Modify: `components/hex-world/HexTileInstances.tsx`
- Modify: `components/hex-world/HexBuildings.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Test: `tests/hex-build-state.test.ts`
- Test: `tests/hex-world-rendering.test.ts`

**Interfaces:** `HexWorld3D` mounts `HexSelectionEffects` using selected building/anchor and validation footprint; it never imports the browser API.

- [ ] **Step 1: Add RED reducer/renderer tests**

Assert selection/tile components have no API/network imports; cancel/move/expansion states remain isolated; scene contains `HexSelectionEffects`.

- [ ] **Step 2: Implement idle vs build treatment**

Idle: subtle seams. Placing/moving: valid emerald, invalid muted coral, anchor white/cream, selected building cream rim/lift. Do not expose entire grid strongly when idle.

- [ ] **Step 3: Show invalid reason**

Use `getPlacementMessage(preview.result.code)` when invalid and keep text visible when Place disabled.

- [ ] **Step 4: Centralize motion constants**

```ts
export const HEX_MOTION = { fastMs: 180, settleMs: 280, expansionMs: 950 } as const;
```

- [ ] **Step 5: Verify and commit**

```bash
node --import tsx --test tests/hex-build-state.test.ts tests/hex-builder-primitives.test.ts tests/hex-world-rendering.test.ts
git add components/hex-world/HexSelectionEffects.tsx components/hex-world/HexTileInstances.tsx components/hex-world/HexBuildings.tsx components/hex-world/HexBuildController.tsx components/hex-world/HexWorld3D.tsx tests/hex-build-state.test.ts tests/hex-world-rendering.test.ts
git commit -m "feat: polish hex selection and placement feedback"
```

---

### Task 6: Replace Detached Builder Panels With World Toolbar, Tray, Context Actions, and Mobile/Keyboard Controls

**Files:**
- Create: `components/hex-world/HexWorldToolbar.tsx`
- Create: `components/hex-world/HexPlacementBar.tsx`
- Create: `components/hex-world/HexBuildingContextToolbar.tsx`
- Create: `components/hex-world/HexRemovalConfirm.tsx`
- Create: `components/hex-world/useHexKeyboardShortcuts.ts`
- Modify: `components/hex-world/HexBuildCatalog.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Test: `tests/hex-builder-ui-contract.test.ts`
- Test: `tests/garden-hex-integration.test.ts`

- [ ] **Step 1: Write RED UI contract test**

Assert Build/Expand/Reset View and contextual Move/Rotate/Remove exist while `window.confirm` is absent.

- [ ] **Step 2: Implement world toolbar**

Normal toolbar = Build · Expand · Reset View. Targets >=44px; safe-area bottom padding.

- [ ] **Step 3: Redesign catalog tray**

Map `main/nature/utility/decor` to `Home/Nature/Utility/Decor`. Item shows name + footprint-cell count, no price. Desktop horizontal tray; mobile bottom sheet <50vh.

- [ ] **Step 4: Context toolbar + mobile fallback**

Desktop/tablet Drei `<Html>` above selected building with Task 1 clamp; small screens fixed bottom bar. Stop DOM pointer propagation.

- [ ] **Step 5: Replace browser confirmation**

`HexRemovalConfirm` shows object name + Confirm/Cancel. Home never exposes Remove.

- [ ] **Step 6: Add keyboard hook**

R rotates preview clockwise; Escape cancels; Enter confirms only valid/not busy. Ignore input/textarea/select/contentEditable.

- [ ] **Step 7: Verify and commit**

```bash
node --import tsx --test tests/hex-build-state.test.ts tests/hex-builder-ui-contract.test.ts tests/garden-hex-integration.test.ts
npm run lint
git add components/hex-world/HexWorldToolbar.tsx components/hex-world/HexPlacementBar.tsx components/hex-world/HexBuildingContextToolbar.tsx components/hex-world/HexRemovalConfirm.tsx components/hex-world/useHexKeyboardShortcuts.ts components/hex-world/HexBuildCatalog.tsx components/hex-world/HexBuildController.tsx components/hex-world/HexWorld3D.tsx tests/hex-builder-ui-contract.test.ts tests/garden-hex-integration.test.ts
git commit -m "feat: redesign cozy builder controls"
```

---

### Task 7: Make Expansion Selection World-First and Reframe Only When Needed

**Files:**
- Create: `components/hex-world/HexExpansionClusters.tsx`
- Modify: `components/hex-world/HexExpansionController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `lib/hex-world/build-state.ts`
- Test: `tests/hex-build-state.test.ts`
- Test: `tests/hex-expansion-ui-contract.test.ts`
- Test: `tests/hex-camera.test.ts`

- [ ] **Step 1: Add RED reducer test**

```ts
state = hexBuildReducer(state, { type: 'start_expansion' });
assert.equal(state.mode, 'expanding');
assert.equal(state.expansionKey, null);
```

- [ ] **Step 2: Add `start_expansion` reducer action**

Interaction state only, not product/game mode.

- [ ] **Step 3: Render eligible clusters in world**

`HexExpansionClusters({ expansions, selectedKey, onSelect })`: one clickable instanced cluster mesh per eligible expansion. Unselected translucent amber; selected stronger amber/cream.

- [ ] **Step 4: Replace list panel**

Compact `+N hexes · cost Points`, affordability reason, Confirm/Cancel only.

- [ ] **Step 5: Preserve server-confirmed rise + conditional reframe**

After `hexWorldAPI.expand()` confirms, derive new coords, animate rise, set `reframeCoords` only when Task 1 says needed.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-world-generator.test.ts tests/hex-build-state.test.ts tests/hex-expansion-ui-contract.test.ts tests/hex-camera.test.ts
git add components/hex-world/HexExpansionClusters.tsx components/hex-world/HexExpansionController.tsx components/hex-world/HexWorld3D.tsx components/hex-world/HexBuildController.tsx lib/hex-world/build-state.ts tests/hex-build-state.test.ts tests/hex-expansion-ui-contract.test.ts tests/hex-camera.test.ts
git commit -m "feat: make hex expansion world-first"
```

---

### Task 8: Add Additive World Revision and Shared Serializable Transaction Helper

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260820010000_add_hex_world_revision/migration.sql`
- Create: `lib/hex-world/transaction.ts`
- Modify: `lib/hex-world/service.ts`
- Modify: `lib/hex-world/types.ts`
- Test: `tests/hex-world-schema.test.ts`
- Test: `tests/hex-world-db.test.ts`

**Interfaces:** `HexWorldMetadata.revision: number`; `runHexTransaction<T>(callback, retries?): Promise<T>`.

- [ ] **Step 1: Write schema RED test**

Assert `revision Int @default(0)` and migration additive only.

- [ ] **Step 2: Add field/migration**

```sql
ALTER TABLE "HexWorld"
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 3: Extract existing transaction helper**

Move current Serializable + `P2034`/`P2002` retry behavior unchanged to `transaction.ts`.

- [ ] **Step 4: Serialize revision**

Add `revision` to `HexWorldMetadata` and snapshot serialization.

- [ ] **Step 5: Increment once per reversible building mutation**

After Place, every PATCH, and Remove inside same transaction:

```ts
await tx.hexWorld.update({ where: { id: snapshot.world.id }, data: { revision: { increment: 1 } } });
```

GET does not increment. Expansion keeps existing transaction behavior.

- [ ] **Step 6: DB test**

Initialize, record revision, Place/PATCH/Remove each +1; repeated GET unchanged.

- [ ] **Step 7: Verify and commit**

```bash
npx prisma validate
node --import tsx --test tests/hex-world-schema.test.ts tests/hex-world-db.test.ts
git add prisma/schema.prisma prisma/migrations/20260820010000_add_hex_world_revision/migration.sql lib/hex-world/transaction.ts lib/hex-world/service.ts lib/hex-world/types.ts tests/hex-world-schema.test.ts tests/hex-world-db.test.ts
git commit -m "feat: add hex world mutation revision"
```

---

### Task 9: Add Redis Atomic Primitives and Short-Lived Undo Store

**Files:**
- Modify: `lib/redis.ts`
- Create: `lib/hex-world/undo-types.ts`
- Create: `lib/hex-world/undo-store.ts`
- Test: `tests/hex-undo-store.test.ts`

**Interfaces:**

```ts
export type HexUndoScope = { configId: string; landId: string; userId: string };
export type HexUndoAction = 'place' | 'move' | 'rotate' | 'remove';
export type HexUndoMeta = { token: string; action: HexUndoAction; expiresAt: string };
export const HEX_UNDO_TTL_MS = 12_000;
export type HexUndoBuildingState = Pick<HexBuildingDTO,
  'id' | 'buildingKey' | 'anchorQ' | 'anchorR' | 'rotation' | 'modelUrl' | 'metadata'>;
export type HexUndoDescriptor =
  | { action: 'place'; expectedRevision: number; expected: HexUndoBuildingState }
  | { action: 'move'; expectedRevision: number; before: HexUndoBuildingState; expected: HexUndoBuildingState }
  | { action: 'rotate'; expectedRevision: number; before: HexUndoBuildingState; expected: HexUndoBuildingState }
  | { action: 'remove'; expectedRevision: number; before: HexUndoBuildingState };
export type HexUndoClaim = {
  scope: HexUndoScope; token: string; claimId: string; descriptor: HexUndoDescriptor;
};
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
export function createHexUndoStore(adapter: HexUndoRedisAdapter): HexUndoStore;
export const redisHexUndoStore: HexUndoStore;
```

- [ ] **Step 1: Add safe Redis primitives**

```ts
export async function redisSetNxPx(key: string, value: string, ttlMs: number): Promise<boolean>;
export async function redisEval<T>(operation: string, fallback: T, script: string, keys: string[], args: Array<string | number>): Promise<T>;
export async function closeRedisConnection(): Promise<void>;
```

Use existing private client. SET uses `PX ttl NX`; eval follows current safe-fallback behavior.

- [ ] **Step 2: Implement scope-safe keys**

Base64url-encode config/land/user parts. Keys: `hexundo:latest:<scope>`, `hexundo:token:<uuid>`, `hexundo:claim:<uuid>`.

- [ ] **Step 3: Implement atomic save Lua**

```lua
local previous = redis.call('GET', KEYS[1])
redis.call('SET', KEYS[2], ARGV[1], 'PX', ARGV[2])
redis.call('SET', KEYS[1], ARGV[3], 'PX', ARGV[2])
if previous and previous ~= ARGV[3] then redis.call('DEL', ARGV[4] .. previous) end
return previous or ''
```

- [ ] **Step 4: Implement claim/consume/release**

Claim lock `SET NX PX 5000`, then re-read payload/latest and require latest==token. Consume conditionally deletes latest only if still token, then payload+claim. Release conditionally deletes claim only if claimId matches.

- [ ] **Step 5: Unit test with injected in-memory `HexUndoRedisAdapter`**

Assert TTL 12,000, stable scope key, save supersedes prior token, mismatched scope fails claim, claim ids distinct, consume one-time.

- [ ] **Step 6: Verify and commit**

```bash
NODE_ENV=production node --import tsx --test tests/hex-undo-store.test.ts
git add lib/redis.ts lib/hex-world/undo-types.ts lib/hex-world/undo-store.ts tests/hex-undo-store.test.ts
git commit -m "feat: add redis-backed one-step hex undo store"
```

---

### Task 10: Return Reversible Mutation Descriptors and Typed Undo Opportunities

**Files:**
- Modify: `lib/hex-world/service.ts`
- Modify: `lib/hex-world/types.ts`
- Create: `lib/hex-world/reversible-mutation.ts`
- Modify: `app/api/hex-world/buildings/route.ts`
- Modify: `app/api/hex-world/buildings/[id]/route.ts`
- Modify: `services/hex-world-api.ts`
- Modify: `tests/hex-world-api-contract.test.ts`
- Modify: `tests/hex-world-db.test.ts`

**Interfaces:**

```ts
export type HexMutationPersistenceResult = { snapshot: HexWorldSnapshot; undoDescriptor: HexUndoDescriptor };
export type HexReversibleMutationResponse = { snapshot: HexWorldSnapshot; undo: HexUndoMeta | null };
export async function finalizeReversibleMutation(
  scope: HexUndoScope,
  result: HexMutationPersistenceResult,
  store?: HexUndoStore,
): Promise<HexReversibleMutationResponse>;
```

- [ ] **Step 1: Write API contract RED**

POST/PATCH/DELETE browser methods expect `HexReversibleMutationResponse`; GET/Expand remain `HexWorldSnapshot`.

- [ ] **Step 2: Capture descriptor inside transaction**

Place → `place`. PATCH with any `anchorQ` or `anchorR` → `move` even when rotation changes too; before/expected contain anchor+rotation. PATCH rotation-only → `rotate`. Remove → `remove`. Descriptor expectedRevision = fresh snapshot revision after Task 8 increment.

- [ ] **Step 3: Implement finalizer degradation**

```ts
export async function finalizeReversibleMutation(scope, result, store = redisHexUndoStore) {
  try { return { snapshot: result.snapshot, undo: await store.save(scope, result.undoDescriptor) }; }
  catch (error) {
    console.error('Hex undo opportunity unavailable:', error);
    return { snapshot: result.snapshot, undo: null };
  }
}
```

- [ ] **Step 4: Update authenticated routes**

Use `access.configId`/`access.userId`; client never supplies them.

- [ ] **Step 5: Update browser API + degradation test**

Place/update/remove return reversible response. Fake store throws on save; committed snapshot still returns with `undo:null`.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-world-api-contract.test.ts tests/hex-world-db.test.ts tests/hex-undo-store.test.ts
git add lib/hex-world/service.ts lib/hex-world/types.ts lib/hex-world/reversible-mutation.ts app/api/hex-world/buildings/route.ts app/api/hex-world/buildings/[id]/route.ts services/hex-world-api.ts tests/hex-world-api-contract.test.ts tests/hex-world-db.test.ts
git commit -m "feat: return one-step undo opportunities from hex mutations"
```

---

### Task 11: Implement Authoritative Undo Service and Authenticated Undo API

**Files:**
- Create: `lib/hex-world/undo-service.ts`
- Create: `app/api/hex-world/undo/route.ts`
- Modify: `lib/hex-world/types.ts`
- Create: `tests/hex-world-undo-db.test.ts`

**Interfaces:** Add `undo_unavailable` and `undo_conflict` to `HexWorldErrorCode`.

```ts
export async function undoHexWorldMutation(
  scope: HexUndoScope,
  token: string,
  store?: HexUndoStore,
): Promise<HexWorldSnapshot>;

async function applyInverseAndIncrementRevision(
  tx: Prisma.TransactionClient,
  current: HexWorldSnapshot,
  descriptor: HexUndoDescriptor,
): Promise<HexWorldSnapshot>;
```

- [ ] **Step 1: Write real Postgres+Redis Place→Undo RED test**

Create isolated config/partner/Land, initialize, Place, obtain token, Undo, assert building removed and revision advanced.

- [ ] **Step 2: Implement claim + revision gate**

```ts
const claim = await store.claim(scope, token);
if (!claim) throw new HexWorldServiceError('undo_unavailable', 409, 'Undo is no longer available');
try {
  const result = await runHexTransaction(async (tx) => {
    const current = await getOrCreateHexWorldSnapshotWithClient(tx, scope.configId, scope.landId);
    if (current.world.revision !== claim.descriptor.expectedRevision) {
      throw new HexWorldServiceError('undo_conflict', 409, 'The Land changed after this action');
    }
    return applyInverseAndIncrementRevision(tx, current, claim.descriptor);
  });
  await store.consume(claim);
  return result;
} catch (error) {
  if (error instanceof HexWorldServiceError && error.code === 'undo_conflict') await store.consume(claim);
  else await store.release(claim);
  throw error;
}
```

Redis claim/load failure must never report successful Undo. If the DB inverse commits, that DB snapshot is authoritative; cleanup uses idempotent consume and revision prevents replay.

- [ ] **Step 3: Implement Place inverse**

Require building equals descriptor expected; delete; increment world revision once.

- [ ] **Step 4: Implement Move/Rotate inverse**

Require current building equals expected; validate before placement with `ignoreBuildingId`; restore before anchor/rotation; increment revision.

- [ ] **Step 5: Implement Remove inverse**

Require old id absent; validate old footprint; recreate exact id/key/anchor/rotation/modelUrl/metadata; increment revision. Invalid/occupied → `undo_conflict`, DB unchanged.

- [ ] **Step 6: Implement API**

`POST /api/hex-world/undo` body only `{ landId, undoToken }`; scope from `requireConfigAccess`.

- [ ] **Step 7: Complete real integration matrix**

Place/Move/Rotate/Remove undo; scope mismatch; newer reversible mutation → conflict; expired/unknown/reused → unavailable; two parallel same-token calls at most one success; inverse conflict unchanged; expansion response no undo. Close Redis connection and clean test rows.

- [ ] **Step 8: Verify and commit**

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/narinyland_ci REDIS_URL=redis://127.0.0.1:6379 NODE_ENV=production node --import tsx --test tests/hex-world-undo-db.test.ts
git add lib/hex-world/undo-service.ts app/api/hex-world/undo/route.ts lib/hex-world/types.ts tests/hex-world-undo-db.test.ts
git commit -m "feat: add authoritative one-step hex undo"
```

---

### Task 12: Add Client Undo Toast, Conflict Handling, and Land-Safe Cleanup

**Files:**
- Create: `components/hex-world/HexUndoToast.tsx`
- Modify: `services/hex-world-api.ts`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexExpansionController.tsx`
- Modify: `app/garden/_components/GardenWorldStage.tsx`
- Test: `tests/hex-builder-ui-contract.test.ts`
- Test: `tests/garden-hex-integration.test.ts`
- Test: `tests/hex-world-api-contract.test.ts`

- [ ] **Step 1: Write UI contract RED**

Assert `HexUndoToast`, `hexWorldAPI.undo`, `undo_unavailable`, `undo_conflict` wired. Expansion confirmation clears client-visible undo because expansion itself is non-undoable.

- [ ] **Step 2: Capture mutation response only after server confirmation**

```ts
const result = await hexWorldAPI.place(...);
setSnapshot(result.snapshot);
setUndo(result.undo);
```

Same for Move/Rotate/Remove.

- [ ] **Step 3: Implement expiry from server `expiresAt`**

Dismiss/disable after expiry. Copy examples `Bench placed · Undo`, `Workshop moved · Undo`.

- [ ] **Step 4: Implement Undo click**

Call `hexWorldAPI.undo(landId, token)` once while busy; success replaces snapshot and clears invalid transient selection. Conflict → `Land changed — undo unavailable`; unavailable → concise dismissal.

- [ ] **Step 5: Clear Land-owned transient state on switch**

Reset reducer, catalog/remove confirmation, new-tile animation, camera transient focus, client undo metadata; preserve existing AbortController stale-fetch guard.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test tests/hex-builder-ui-contract.test.ts tests/garden-hex-integration.test.ts tests/hex-world-api-contract.test.ts
git add components/hex-world/HexUndoToast.tsx services/hex-world-api.ts components/hex-world/HexBuildController.tsx components/hex-world/HexExpansionController.tsx app/garden/_components/GardenWorldStage.tsx tests/hex-builder-ui-contract.test.ts tests/garden-hex-integration.test.ts tests/hex-world-api-contract.test.ts
git commit -m "feat: add cozy builder undo experience"
```

---

### Task 13: Add Redis CI, Acceptance Regression, Render Budget, and Railway Release Gate

**Files:**
- Modify: `.github/workflows/hex-homestead-ci.yml`
- Create: `tests/hex-phase2-acceptance.test.ts`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/garden-hex-integration.test.ts`

- [ ] **Step 1: Add Redis 7 CI service**

```yaml
redis:
  image: redis:7-alpine
  ports:
    - 6379:6379
  options: >-
    --health-cmd "redis-cli ping"
    --health-interval 5s
    --health-timeout 5s
    --health-retries 10
```

Keep Postgres 16 service.

- [ ] **Step 2: Keep pure tests Redis-free**

Do not set `REDIS_URL` globally. Pure Hex step uses `NODE_ENV: production` only and includes new Task 1–7/12 source+logic tests.

- [ ] **Step 3: Add dedicated DB+Redis Undo step**

```yaml
- name: Hex Undo DB and Redis integration
  env:
    NODE_ENV: production
    REDIS_URL: redis://127.0.0.1:6379
  run: node --import tsx --test tests/hex-world-undo-db.test.ts
```

- [ ] **Step 4: Add Phase 2 acceptance contract**

Assert smart camera + Reset View, Build tray, contextual controls, Home no Remove, in-world expansion clusters, Undo route/client, mobile safe-area classes, no WASD/game-mode labels, no heavy required post-processing.

- [ ] **Step 5: Add render-budget guards**

One primary directional shadow owner; particles use one `<points>`; repeated ambient geometry instanced; no `MeshReflectorMaterial`/`EffectComposer`/required Bloom/DOF; High DPR <=1.75.

- [ ] **Step 6: Run full local-equivalent verification**

```bash
npm test
npx prisma validate
npm run lint
npm run build
```

Then Task 11 DB+Redis command. Expected zero test failures, valid Prisma, lint exit 0 under current warning policy, build exit 0.

- [ ] **Step 7: Open implementation PR; current-head CI must be green before merge**

PR body: Visual Wow > Builder UX, camera/quality/art pass, world-first Build/Expand, additive revision migration, Redis Undo/degradation, legacy preservation, explicit non-goals.

- [ ] **Step 8: Railway verification after merge**

Using Railway connector verify deployed hash = merged main SHA; migration `20260820010000_add_hex_world_revision` applies; no destructive cleanup; app/Postgres/Redis `SUCCESS`; authenticated safe-Land smoke covers stable GET revision, Place/Move/Rotate/Undo/Remove/Undo, Expand, Reset View, Land switch, reload; legacy PurchasedItem count not reduced.

- [ ] **Step 9: Visual/mobile acceptance**

Desktop 1440 Medium: island ~70–80% safe viewport, Home focal, responsive orbit/build. Portrait ~390x844: >=44px targets, safe-area, sheets <~50vh, bottom toolbar fallback, pinch/orbit do not place. Landscape ~844x390: no horizontal overflow. Quality profiles preserve identity while reducing effects.

- [ ] **Step 10: Commit CI gate**

```bash
git add .github/workflows/hex-homestead-ci.yml tests/hex-phase2-acceptance.test.ts tests/hex-render-budget.test.ts tests/garden-hex-integration.test.ts
git commit -m "ci: validate polished cozy builder phase two"
```

---

## Plan Self-Review Matrix

| Spec requirement | Task(s) |
| --- | --- |
| Visual Wow > Builder UX | 1–7 |
| Magical Floating Garden + premium miniature style | 2–4 |
| Hero framing / bounds-aware Reset | 1–2, 6 |
| Overview/Focus/Build internal camera intents | 1–2 |
| Conditional expansion reframe | 1, 7 |
| Warm one-primary-shadow lighting | 2–3 |
| Clouds/atmosphere/organic underside/particles | 3 |
| Water polish without planar reflection | 3 |
| Cohesive Home/Storage/Workshop + catalog art | 4 |
| Deterministic vegetation variation | 1, 4 |
| Idle view suppresses raw grid | 5 |
| Invalid placement reason | 1, 5 |
| World-first Build tray + contextual controls | 6 |
| No browser confirm; Home non-removable | 6, 13 |
| Keyboard/mobile constraints | 6, 13 |
| World-first expansion | 7 |
| Server-confirmed rise animation | 7 |
| High/Medium/Mobile profiles | 1, 3–4, 13 |
| One-step Undo Place/Move/Rotate/Remove | 8–12 |
| Scope `(configId, landId, userId)` | 9–11 |
| Latest reversible edit invalidates stale Undo | 8–11 via revision + latest pointer |
| One-time/double-click-safe Undo | 9, 11 |
| Undo never overwrites newer state | 8, 11 |
| Redis outage does not fail core mutation | 9–10 |
| Expansion remains non-undoable | 7, 10–12 |
| Existing expansion Points transaction preserved | 7, 13 |
| Legacy data preserved | 8, 13 |
| No farming/NPC/avatar/multiplayer scope creep | Global constraints, 13 |
| Postgres + Redis CI | 13 |
| Additive migration | 8, 13 |
| Railway production verification | 13 |

## Explicit Non-Changes

- Do not import legacy `PurchasedItem` into HexBuilding.
- Do not delete dormant family-farm code or saves.
- Do not replace axial placement with arbitrary 3D coordinates.
- Do not persist ambient visual decor as DB rows.
- Do not add paid building prices.
- Do not add long Undo history or expansion refund/Undo.
- Do not make Redis availability a prerequisite for core building mutations.
- Do not expose camera intents as user-visible game/camera modes.
