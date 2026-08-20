# Phase 2 — Polished Cozy Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Narinyland `/garden` into the approved Visual-Wow-first premium floating diorama while preserving the production HexWorld architecture, making Build/Expand interactions more world-centric, and adding one-step server-backed Undo for Place/Move/Rotate/Remove.

**Architecture:** Keep the existing axial HexWorld, Prisma persistence, shared-Points expansion transaction, app shell, and server-authoritative validation. Split the current renderer/controller into focused camera, lighting, atmosphere, underside, particle, selection, toolbar, and undo units. Reversible building mutations gain a monotonic `HexWorld.revision` plus short-lived Redis-backed inverse descriptors so Undo can reject stale/concurrent edits safely without introducing long-lived history.

**Tech Stack:** Next.js 16.x, React 19, TypeScript, React Three Fiber 9, Drei 10, Three 0.182, Framer Motion 12, Prisma 6/PostgreSQL, ioredis 5/Redis, Node 22 built-in test runner + tsx, Railway.

**Spec:** `docs/superpowers/specs/2026-08-20-polished-cozy-builder-design.md`

## Global Constraints

- Priority is **Visual Wow first, Builder UX second, Mobile/Performance third**.
- Visual direction is **Magical Floating Garden + Premium Miniature Diorama**.
- Keep canonical axial `(q, r)` coordinates and current server-authoritative placement/expansion rules.
- Keep Circle/Land/Profile/Settings/Proposal and Home/Timeline/Coupons/Letters shell behavior intact.
- Do not add LAND/WORLD selectors, camera mode selectors, WASD, avatar walking, NPCs, multiplayer building, farming economy, crafting, seasons, or weather gameplay.
- Existing `Land`, `PurchasedItem`, family-farm saves, `HexWorld`, `HexTile`, `HexBuilding`, and `HexExpansion` data must not be destructively migrated or regenerated.
- Building placement remains free; expansion remains 7/19/37 hexes for 100/250/500 shared Points and remains non-undoable.
- Undo supports only the latest Place/Move/Rotate/Remove opportunity for approximately 12 seconds and is scoped to authenticated `(configId, landId, userId)`.
- Core building mutations must remain successful if Redis/Undo storage is unavailable; that mutation simply returns no Undo opportunity.
- All persistent mutations remain server-confirmed; hover/orbit/preview never writes to the server.
- No real-time planar reflection, mandatory heavy bloom/DOF chain, or continuous FPS-driven quality switching.
- Desktop Medium must remain responsive during orbit/build; mobile fallback must remain usable in portrait and landscape.

---

## Target File Structure

### Pure Hex/visual logic

- `lib/hex-world/camera.ts` — bounds, overview/focus/build camera poses, expansion reframe predicate.
- `lib/hex-world/quality.ts` — High/Medium/Mobile render-profile selection.
- `lib/hex-world/visual-variation.ts` — deterministic seed/coordinate variation for ambient visuals.
- `lib/hex-world/placement-message.ts` — stable human-readable placement rejection copy.
- `lib/hex-world/screen-space.ts` — viewport clamping for contextual actions.
- `lib/hex-world/undo-types.ts` — undo scope, descriptors, mutation response, errors.
- `lib/hex-world/undo-store.ts` — Redis-backed token/latest-pointer/claim lifecycle.
- `lib/hex-world/undo-service.ts` — authoritative inverse mutations.
- `lib/hex-world/transaction.ts` — shared Serializable transaction + retry helper extracted from `service.ts`.

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
- existing `HexWorld3D.tsx`, `HexAmbientDecor.tsx`, `HexBuildings.tsx`, `HexBuildingModels.tsx`, `HexTileInstances.tsx` become composition/dispatch-focused.

### Builder UI

- `components/hex-world/HexWorldToolbar.tsx`
- `components/hex-world/HexPlacementBar.tsx`
- `components/hex-world/HexBuildingContextToolbar.tsx`
- `components/hex-world/HexRemovalConfirm.tsx`
- `components/hex-world/HexExpansionClusters.tsx`
- `components/hex-world/HexUndoToast.tsx`
- `components/hex-world/useHexKeyboardShortcuts.ts`
- existing `HexBuildCatalog.tsx`, `HexExpansionController.tsx`, `HexBuildController.tsx` become smaller orchestrators.

### Server/API

- Add `revision Int @default(0)` to `HexWorld` with additive migration `prisma/migrations/20260820010000_add_hex_world_revision/migration.sql`.
- Add `POST /api/hex-world/undo`.
- Reversible building mutation routes return `{ snapshot, undo }`; `GET` and expansion responses remain `HexWorldSnapshot`.
- `services/hex-world-api.ts` gains typed reversible mutation response and `undo()`.

---

### Task 1: Add Camera, Quality, Visual-Variation, and Placement-Copy Primitives

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
- Consumes: `HexTileDTO`, `HexCoord`, `HexWorldErrorCode`, `axialToWorld()`.
- Produces:
  - `getUnlockedIslandBounds(tiles: HexTileDTO[]): HexIslandBounds`
  - `getOverviewCameraPose(bounds: HexIslandBounds, aspect: number): HexCameraPose`
  - `getFocusCameraPose(bounds: HexIslandBounds, focus: HexCoord, aspect: number): HexCameraPose`
  - `getBuildCameraPose(bounds: HexIslandBounds, anchor: HexCoord | null, aspect: number): HexCameraPose`
  - `shouldReframeForCoords(bounds: HexIslandBounds, coords: HexCoord[], margin?: number): boolean`
  - `resolveHexQualityProfile(input): HexQualityProfile`
  - `getVisualVariation(seed: string, coord: HexCoord): HexVisualVariation`
  - `getPlacementMessage(code: HexWorldErrorCode): string`
  - `clampScreenPoint(point, viewport, padding): {x:number;y:number}`

- [ ] **Step 1: Write failing camera tests**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOverviewCameraPose, getUnlockedIslandBounds, shouldReframeForCoords } from '@/lib/hex-world/camera';

test('overview camera frames unlocked island around its actual bounds', () => {
  const tiles = [
    { q: -2, r: 0, terrainType: 'grass', height: 0, unlocked: true },
    { q: 3, r: 1, terrainType: 'grass', height: 0.2, unlocked: true },
  ] as const;
  const bounds = getUnlockedIslandBounds([...tiles]);
  const pose = getOverviewCameraPose(bounds, 16 / 9);
  assert.ok(bounds.radius > 0);
  assert.ok(pose.position[1] > 0);
  assert.ok(pose.distance >= bounds.radius * 1.6);
  assert.equal(shouldReframeForCoords(bounds, [{ q: 3, r: 1 }]), false);
  assert.equal(shouldReframeForCoords(bounds, [{ q: 20, r: 20 }]), true);
});
```

- [ ] **Step 2: Run camera test and verify RED**

Run:

```bash
node --import tsx --test tests/hex-camera.test.ts
```

Expected: FAIL because `lib/hex-world/camera.ts` does not exist.

- [ ] **Step 3: Implement deterministic camera math**

Core shape:

```ts
export type HexIslandBounds = {
  minX: number; maxX: number; minZ: number; maxZ: number;
  center: [number, number, number];
  radius: number;
};

export type HexCameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
};

export function getOverviewCameraPose(bounds: HexIslandBounds, aspect: number): HexCameraPose {
  const portraitPenalty = aspect < 1 ? 1.22 : 1;
  const distance = Math.max(12, bounds.radius * 2.15 * portraitPenalty);
  return {
    target: bounds.center,
    position: [bounds.center[0] + distance * 0.58, distance * 0.64, bounds.center[2] + distance * 0.74],
    distance,
  };
}
```

Use only unlocked tiles for bounds. Empty input returns a stable fallback centered at `[0,0,0]` with radius `5`.

- [ ] **Step 4: Write failing quality tests**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';

test('small viewport chooses mobile-safe profile even from medium setting', () => {
  const profile = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 390, devicePixelRatio: 3 });
  assert.equal(profile.name, 'mobile');
  assert.equal(profile.maxDpr, 1);
  assert.ok(profile.cloudLayers <= 1);
});

test('desktop high keeps visual-wow budget bounded', () => {
  const profile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440, devicePixelRatio: 2 });
  assert.equal(profile.name, 'high');
  assert.ok(profile.maxDpr <= 1.75);
  assert.equal(profile.shadowMapSize, 2048);
});
```

- [ ] **Step 5: Implement quality profiles**

Define exact immutable profiles:

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

Viewport `< 640` always resolves to `mobile`; otherwise honor `high`, `medium`, and map `low`/unknown to `mobile`.

- [ ] **Step 6: Add deterministic visual variation and builder helper tests**

Test that the same `(seed,q,r)` gives identical scale/rotation/tone and different coordinates do not all collapse to one value. Test copy mapping:

```ts
assert.equal(getPlacementMessage('tile_occupied'), 'Occupied');
assert.equal(getPlacementMessage('invalid_terrain'), 'Needs compatible terrain');
assert.equal(getPlacementMessage('tile_locked'), 'Outside unlocked land');
```

Test `clampScreenPoint({x:-10,y:900},{width:390,height:844},16)` returns both coordinates inside `[16, width/height - 16]`.

- [ ] **Step 7: Run primitive tests GREEN**

```bash
node --import tsx --test tests/hex-camera.test.ts tests/hex-quality.test.ts tests/hex-visual-variation.test.ts tests/hex-builder-primitives.test.ts
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
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

**Interfaces:**
- Consumes: Task 1 camera/quality functions, current `HexWorldSnapshot`.
- Produces:
  - `HexCameraIntent = {kind:'overview'} | {kind:'focus'; coord:HexCoord} | {kind:'build'; anchor:HexCoord|null}`
  - `HexDioramaCamera({tiles,intent,resetNonce,reframeCoords})`
  - `HexWorld3D` props `cameraIntent`, `resetNonce`, `graphicsQuality`.

- [ ] **Step 1: Extend rendering contract test and verify RED**

Add source assertions:

```ts
assert.match(scene, /HexDioramaCamera/);
assert.match(scene, /HexWorldLighting/);
assert.match(scene, /HexSkyAtmosphere/);
assert.doesNotMatch(scene, /camera=\{\{ position: \[17, 18, 22\]/);
```

Run:

```bash
node --import tsx --test tests/hex-world-rendering.test.ts
```

Expected: FAIL because new components are absent.

- [ ] **Step 2: Implement `HexDioramaCamera`**

Use `useThree()` and a Drei `OrbitControls` ref. Compute the desired pose from unlocked bounds and the intent. In `useFrame`, ease camera and target only while an animation is active; `onStart` from OrbitControls immediately cancels the scripted easing. Keep:

```tsx
<OrbitControls
  ref={controlsRef}
  makeDefault
  enablePan={false}
  enableDamping
  dampingFactor={0.07}
  minPolarAngle={Math.PI / 5}
  maxPolarAngle={Math.PI / 2.35}
  minDistance={10}
  maxDistance={52}
  onStart={() => { scriptedMotion.current = false; }}
/>
```

`resetNonce` restarts Overview easing. Focus never sets distance below `max(10, overview.distance * 0.72)`.

- [ ] **Step 3: Extract light and sky setup from `HexWorld3D`**

`HexWorldLighting` receives `HexQualityProfile` and owns hemisphere/ambient/directional/contact shadow setup. Only the directional light casts real-time shadow. `HexSkyAtmosphere` owns background/fog/cloud layers and no cloud casts shadow.

- [ ] **Step 4: Wire camera intent in controller**

Derive intent without adding a user-visible mode selector:

```ts
const cameraIntent = state.mode === 'placing' || state.mode === 'moving'
  ? { kind: 'build', anchor: state.anchor } as const
  : selectedBuilding
    ? { kind: 'focus', coord: { q: selectedBuilding.anchorQ, r: selectedBuilding.anchorR } } as const
    : { kind: 'overview' } as const;
```

Add `resetNonce` state in controller and pass `graphicsQuality` from `GardenWorldStage` → controller → renderer.

- [ ] **Step 5: Preserve shell and pointer behavior**

Extend `garden-hex-integration.test.ts` to assert Home remains `pointer-events-none` at wrapper level with interactive nav children as already established and that no new camera-mode labels appear.

- [ ] **Step 6: Run rendering/integration tests GREEN**

```bash
node --import tsx --test tests/hex-camera.test.ts tests/hex-quality.test.ts tests/hex-world-rendering.test.ts tests/garden-hex-integration.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/HexDioramaCamera.tsx components/hex-world/HexWorldLighting.tsx components/hex-world/HexSkyAtmosphere.tsx components/hex-world/HexWorld3D.tsx components/hex-world/HexBuildController.tsx app/garden/_components/GardenWorldStage.tsx tests/hex-world-rendering.test.ts tests/garden-hex-integration.test.ts
git commit -m "feat: add smart diorama camera and scene infrastructure"
```

---

### Task 3: Add Organic Underside, Layered Atmosphere, Particles, and Water by Quality Profile

**Files:**
- Create: `components/hex-world/HexIslandUnderside.tsx`
- Create: `components/hex-world/HexWorldParticles.tsx`
- Create: `components/hex-world/HexWaterSurface.tsx`
- Modify: `components/hex-world/HexSkyAtmosphere.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Test: `tests/hex-world-rendering.test.ts`
- Test: `tests/hex-render-budget.test.ts`

**Interfaces:**
- Consumes: `HexQualityProfile`, `HexVisualVariation`, tiles/seed.
- Produces visual-only components; no persistence writes or new DB records.

- [ ] **Step 1: Write render-budget test RED**

```ts
const scene = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
assert.match(scene, /HexIslandUnderside/);
assert.match(scene, /HexWorldParticles/);
assert.match(scene, /HexWaterSurface/);
assert.doesNotMatch(scene, /EffectComposer|DepthOfField|Bloom/);
```

- [ ] **Step 2: Implement deterministic underside**

Create 8–14 low-poly dodecahedron/cone rock masses derived from island bounds and seed. They sit below the logical tile surface, never receive pointer handlers, and use no React state. Use `InstancedMesh` where geometry/material match.

- [ ] **Step 3: Implement quality-aware particle field**

Use one `<points>` buffer with deterministic positions. Particle count comes only from `profile.particleCount`. Animate a single time uniform or shared positions in `useFrame`; do not create per-particle React children.

- [ ] **Step 4: Implement water surface**

Render water-tile top overlays separately from terrain prisms. Use soft turquoise transparent material, low metalness, moderate/high roughness, and a tiny shared vertical/opacity oscillation for ripple impression. Full profile adds sparse concentric ring ripples; reduced/mobile omit rings rather than changing water identity.

- [ ] **Step 5: Add layered clouds by profile**

`HexSkyAtmosphere` uses 3/2/1 deterministic cloud depth layers for High/Medium/Mobile and slow drift. Foreground layer uses lower opacity and no pointer events.

- [ ] **Step 6: Run tests GREEN**

```bash
node --import tsx --test tests/hex-quality.test.ts tests/hex-visual-variation.test.ts tests/hex-world-rendering.test.ts tests/hex-render-budget.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/HexIslandUnderside.tsx components/hex-world/HexWorldParticles.tsx components/hex-world/HexWaterSurface.tsx components/hex-world/HexSkyAtmosphere.tsx components/hex-world/HexWorld3D.tsx tests/hex-world-rendering.test.ts tests/hex-render-budget.test.ts
git commit -m "feat: add premium floating island atmosphere"
```

---

### Task 4: Rebuild Building and Ambient Art as One Premium Miniature Language

**Files:**
- Create: `components/hex-world/models/HexStructureModels.tsx`
- Create: `components/hex-world/models/HexNatureModels.tsx`
- Create: `components/hex-world/models/HexDecorModels.tsx`
- Modify: `components/hex-world/HexBuildingModels.tsx`
- Modify: `components/hex-world/HexAmbientDecor.tsx`
- Modify: `components/hex-world/HexBuildings.tsx`
- Test: `tests/hex-building-art.test.ts`
- Test: `tests/hex-world-rendering.test.ts`

**Interfaces:**
- Consumes: existing catalog keys exactly: `home`, `storage`, `workshop`, `tree`, `flower_patch`, `pond`, `bench`, `lamp`, `fence`, `stone_path`, `garden_patch`.
- Produces: `HexBuildingModel({buildingKey,ghost,selected?})` dispatches to focused model groups without changing catalog/persistence semantics.

- [ ] **Step 1: Write catalog-coverage art test RED**

Read `HexBuildingModels.tsx` plus model modules and assert every MVP key is dispatched exactly once. Assert no remote model URL is required for core visuals.

- [ ] **Step 2: Implement premium structures**

Home: cream walls, muted terracotta roof, chimney, porch, warm window panes, tiny planter. Storage: matching shed/barn. Workshop: wider/lower, moss roof, tool/chimney accents. Preserve footprint authority in `building-catalog.ts`; visuals may extend inside the footprint but never change collision independently.

- [ ] **Step 3: Implement nature/utility models**

Tree uses clustered rounded canopy groups; pond uses matching water language with reeds/stones; flower patch and garden patch use grouped miniature forms. Ghost mode applies shared opacity without losing silhouette.

- [ ] **Step 4: Implement decor models**

Bench/lamp/fence/path share wood/stone palette. Lamp emissive intensity remains subtle (`<= 1.2`) and does not add a point light per lamp.

- [ ] **Step 5: Upgrade ambient decor deterministically**

Replace the current single-canopy ambient tree with 2–3 canopy batches using Task 1 variation. Add quality-density sampling:

```ts
const visible = stableRatio(seed, tile) <= profile.ambientDensity;
```

Never use `Math.random()` in render.

- [ ] **Step 6: Run tests + build type check**

```bash
node --import tsx --test tests/hex-building-catalog.test.ts tests/hex-building-art.test.ts tests/hex-visual-variation.test.ts tests/hex-world-rendering.test.ts
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/models components/hex-world/HexBuildingModels.tsx components/hex-world/HexAmbientDecor.tsx components/hex-world/HexBuildings.tsx tests/hex-building-art.test.ts tests/hex-world-rendering.test.ts
git commit -m "feat: apply premium miniature homestead art pass"
```

---

### Task 5: Add Selection, Placement Feedback, and Shared Motion Language

**Files:**
- Create: `components/hex-world/HexSelectionEffects.tsx`
- Modify: `components/hex-world/HexTileInstances.tsx`
- Modify: `components/hex-world/HexBuildings.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `lib/hex-world/build-state.ts`
- Test: `tests/hex-build-state.test.ts`
- Test: `tests/hex-world-rendering.test.ts`

**Interfaces:**
- Consumes: `getPlacementMessage()`, current pure `validatePlacement()`.
- Produces: visual selection state and placement reason; no server mutation on hover.

- [ ] **Step 1: Add failing reducer/visual tests**

Add coverage that cancel returns to idle, move retains source building identity, and expansion selection remains separate. Add renderer source assertions for `HexSelectionEffects` and absence of network imports from `HexTileInstances.tsx`.

- [ ] **Step 2: Implement normal-vs-build tile treatment**

Normal tiles use subtle terrain tones with low seam emphasis. During placing/moving, footprint instances use:

- valid emerald
- invalid muted coral
- anchor white/cream
- selected existing building soft cream rim/lift

Do not expose the whole grid strongly when idle.

- [ ] **Step 3: Add placement reason state**

Derive reason from `preview.result` and render it beside the placement action UI. The text must remain visible when Place is disabled; opacity alone is insufficient.

- [ ] **Step 4: Add motion constants**

Centralize durations in `HexSelectionEffects.tsx` or a local constant module:

```ts
export const HEX_MOTION = {
  fastMs: 180,
  settleMs: 280,
  expansionMs: 950,
} as const;
```

Use these for select/settle/remove UI transitions; no exaggerated bounce.

- [ ] **Step 5: Run tests GREEN**

```bash
node --import tsx --test tests/hex-build-state.test.ts tests/hex-builder-primitives.test.ts tests/hex-world-rendering.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add components/hex-world/HexSelectionEffects.tsx components/hex-world/HexTileInstances.tsx components/hex-world/HexBuildings.tsx components/hex-world/HexBuildController.tsx lib/hex-world/build-state.ts tests/hex-build-state.test.ts tests/hex-world-rendering.test.ts
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

**Interfaces:**
- Consumes: current reducer actions and `clampScreenPoint()`.
- Produces visible normal toolbar `Build · Expand · Reset View`, category tray, contextual selected-object actions, in-product remove confirmation.

- [ ] **Step 1: Write failing UI contract test**

Assert source contains `Build`, `Expand`, `Reset View`, `Move`, `Rotate`, and in-product remove confirmation, while `window.confirm` is absent.

- [ ] **Step 2: Implement `HexWorldToolbar`**

Normal state buttons: Build, Expand, Reset View. Minimum target size `44px`; bottom padding includes `env(safe-area-inset-bottom)`.

- [ ] **Step 3: Redesign catalog as category tray/sheet**

Use existing catalog categories (`main`, `nature`, `utility`, `decor`) but display labels `Home`, `Nature`, `Utility`, `Decor`. Item cards show name plus footprint-cell count; no building price. Desktop uses compact horizontal tray; mobile uses max-height bottom sheet below 50vh.

- [ ] **Step 4: Implement contextual building actions**

Desktop/tablet uses Drei `<Html>` anchored above selected building with `calculatePosition` clamped via Task 1 helper. Small screens render the same actions in a fixed bottom bar. Stop pointer propagation from DOM controls so camera drag does not fire.

- [ ] **Step 5: Replace browser confirm**

`HexRemovalConfirm` presents object name and Confirm/Cancel. Main category removable structures get stronger copy; Home never renders a remove action.

- [ ] **Step 6: Add keyboard shortcuts**

Hook listens only while `/garden` builder interaction is active:

- `R` → clockwise preview rotation
- `Escape` → cancel
- `Enter` → confirm only when valid and not busy

Ignore events originating from `INPUT`, `TEXTAREA`, `SELECT`, or contentEditable nodes.

- [ ] **Step 7: Run UI/integration tests GREEN**

```bash
node --import tsx --test tests/hex-build-state.test.ts tests/hex-builder-ui-contract.test.ts tests/garden-hex-integration.test.ts
npm run lint
```

- [ ] **Step 8: Commit**

```bash
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

**Interfaces:**
- Produces reducer action `{type:'start_expansion'}` and selected expansion via existing `preview_expansion`.
- `HexExpansionClusters` receives all eligible expansion DTOs plus selected key and emits `onSelect(expansionKey)`.

- [ ] **Step 1: Write reducer test RED for expansion entry with no selected cluster**

```ts
state = hexBuildReducer(state, { type: 'start_expansion' });
assert.equal(state.mode, 'expanding');
assert.equal(state.expansionKey, null);
```

- [ ] **Step 2: Add `start_expansion` action**

Do not create a separate product/game mode. This remains interaction state only.

- [ ] **Step 3: Render every eligible edge cluster in world**

Use one instanced mesh per cluster (maximum current catalog is small) so each cluster is clickable as a unit. Unselected eligible cluster = translucent amber; selected = stronger amber/cream edge. `onPointerDown` stops propagation.

- [ ] **Step 4: Replace list-centric expansion panel**

`HexExpansionController` becomes compact status/confirm UI:

- no long list
- selected cluster copy: `+7 hexes · 100 Points` etc.
- insufficient Points remains visible/disabled with reason
- Cancel exits expanding interaction state

- [ ] **Step 5: Reframe only when necessary after server confirmation**

Keep `newlyAddedKeys`; derive new coords and call camera reframe only when `shouldReframeForCoords(currentBounds,newCoords)` is true. Tile-rise animation still begins only after `hexWorldAPI.expand()` confirms.

- [ ] **Step 6: Run expansion/camera tests GREEN**

```bash
node --import tsx --test tests/hex-world-generator.test.ts tests/hex-build-state.test.ts tests/hex-expansion-ui-contract.test.ts tests/hex-camera.test.ts
```

- [ ] **Step 7: Commit**

```bash
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

**Interfaces:**
- Produces `HexWorldMetadata.revision: number`.
- Produces `runHexTransaction<T>(callback, retries?): Promise<T>` used by service and later Undo service.
- Every successful reversible building mutation increments `HexWorld.revision` inside the same Serializable transaction. Undo later checks this revision to prevent an older action from overwriting any newer reversible building edit, including edits to a different building.

- [ ] **Step 1: Write schema test RED**

Assert `HexWorld` contains `revision Int @default(0)` and migration contains only additive `ALTER TABLE ... ADD COLUMN`, with no `DROP`, `DELETE`, or legacy-table rewrite.

- [ ] **Step 2: Add Prisma field and additive migration**

Migration content:

```sql
ALTER TABLE "HexWorld"
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 3: Extract transaction helper**

Move existing Serializable + `P2034`/`P2002` retry logic unchanged into `transaction.ts` and import it from `service.ts`.

- [ ] **Step 4: Serialize revision**

Add `revision` to `HexWorldMetadata` and snapshot serialization.

- [ ] **Step 5: Increment revision on Place/Move/Rotate/Remove only**

Inside each reversible mutation transaction, after building mutation:

```ts
await tx.hexWorld.update({
  where: { id: snapshot.world.id },
  data: { revision: { increment: 1 } },
});
```

Then read and return the fresh snapshot. Expansion remains non-undoable and does not need to create Undo metadata.

- [ ] **Step 6: Add DB test**

Create a world, record revision, Place and assert `+1`, Rotate/Move and assert each increments once, Remove and assert once. Repeated GET does not change revision.

- [ ] **Step 7: Validate schema/test GREEN**

```bash
npx prisma validate
node --import tsx --test tests/hex-world-schema.test.ts tests/hex-world-db.test.ts
```

- [ ] **Step 8: Commit**

```bash
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
- Consumes authenticated scope from routes later.
- Produces:

```ts
export type HexUndoScope = { configId: string; landId: string; userId: string };
export type HexUndoAction = 'place' | 'move' | 'rotate' | 'remove';
export type HexUndoMeta = { token: string; action: HexUndoAction; expiresAt: string };
export const HEX_UNDO_TTL_MS = 12_000;

export interface HexUndoStore {
  save(scope: HexUndoScope, descriptor: HexUndoDescriptor): Promise<HexUndoMeta | null>;
  claim(scope: HexUndoScope, token: string): Promise<HexUndoClaim | null>;
  consume(claim: HexUndoClaim): Promise<void>;
  release(claim: HexUndoClaim): Promise<void>;
}
```

- [ ] **Step 1: Define trusted descriptor union**

Use building snapshots with only required fields:

```ts
export type HexUndoBuildingState = Pick<HexBuildingDTO,
  'id' | 'buildingKey' | 'anchorQ' | 'anchorR' | 'rotation' | 'modelUrl' | 'metadata'
>;

export type HexUndoDescriptor =
  | { action: 'place'; expectedRevision: number; expected: HexUndoBuildingState }
  | { action: 'move'; expectedRevision: number; before: HexUndoBuildingState; expected: HexUndoBuildingState }
  | { action: 'rotate'; expectedRevision: number; before: HexUndoBuildingState; expected: HexUndoBuildingState }
  | { action: 'remove'; expectedRevision: number; before: HexUndoBuildingState };
```

- [ ] **Step 2: Add Redis primitives**

Expose safe helpers backed by the existing single ioredis client:

```ts
export async function redisSetNxPx(key: string, value: string, ttlMs: number): Promise<boolean>;
export async function redisEval<T>(operation: string, fallback: T, script: string, keys: string[], args: Array<string | number>): Promise<T>;
export async function closeRedisConnection(): Promise<void>;
```

`redisSetNxPx` uses `SET key value PX ttl NX`. `redisEval` calls ioredis `eval` and returns fallback on connection failure, preserving current cache-failure philosophy.

- [ ] **Step 3: Implement scope-safe keys**

Encode each scope part with `Buffer.from(value).toString('base64url')` before composing:

- `hexundo:latest:<scope>`
- `hexundo:token:<uuid>`
- `hexundo:claim:<uuid>`

- [ ] **Step 4: Implement atomic save Lua**

The script must atomically create payload/latest pointer and delete the previous payload for the same scope:

```lua
local previous = redis.call('GET', KEYS[1])
redis.call('SET', KEYS[2], ARGV[1], 'PX', ARGV[2])
redis.call('SET', KEYS[1], ARGV[3], 'PX', ARGV[2])
if previous and previous ~= ARGV[3] then
  redis.call('DEL', ARGV[4] .. previous)
end
return previous or ''
```

- [ ] **Step 5: Implement one-time claim/consume/release**

Claim uses token lock `SET NX PX 5000`, then re-reads payload/latest and rejects if pointer no longer equals token. Consume conditionally deletes latest pointer only if it still equals token, then deletes payload and claim. Release conditionally deletes claim only if claim id still matches.

- [ ] **Step 6: Unit-test serialization/key/TTL logic**

Use an injected fake `HexUndoStore`/Redis adapter for pure tests. Assert:

- TTL constant is 12,000 ms
- same scope creates stable latest key
- new token supersedes old
- mismatched scope cannot load token
- claim ids are distinct

- [ ] **Step 7: Run unit tests GREEN**

```bash
NODE_ENV=production node --import tsx --test tests/hex-undo-store.test.ts
```

- [ ] **Step 8: Commit**

```bash
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
- Produces:

```ts
export type HexMutationPersistenceResult = {
  snapshot: HexWorldSnapshot;
  undoDescriptor: HexUndoDescriptor;
};

export type HexReversibleMutationResponse = {
  snapshot: HexWorldSnapshot;
  undo: HexUndoMeta | null;
};
```

- `finalizeReversibleMutation(scope, result, store = redisHexUndoStore)` catches Undo-store failure and returns `{snapshot, undo:null}` without rolling back the already-committed DB mutation.

- [ ] **Step 1: Write API contract RED**

Assert POST/PATCH/DELETE browser client expects `HexReversibleMutationResponse`, while GET and Expand still expect `HexWorldSnapshot`.

- [ ] **Step 2: Capture before/expected building state inside transaction**

Place descriptor contains created building as `expected`. Move/Rotate contain `before` and fresh `expected`. Remove contains `before`. All descriptors use the snapshot revision *after* the transaction's revision increment.

- [ ] **Step 3: Add finalizer**

```ts
export async function finalizeReversibleMutation(
  scope: HexUndoScope,
  result: HexMutationPersistenceResult,
  store: HexUndoStore = redisHexUndoStore,
): Promise<HexReversibleMutationResponse> {
  try {
    return { snapshot: result.snapshot, undo: await store.save(scope, result.undoDescriptor) };
  } catch (error) {
    console.error('Hex undo opportunity unavailable:', error);
    return { snapshot: result.snapshot, undo: null };
  }
}
```

- [ ] **Step 4: Update routes to use authenticated userId**

After `requireConfigAccess`, pass `{configId: access.configId, landId, userId: access.userId}` to finalizer. Client never supplies userId/configId in body.

- [ ] **Step 5: Update browser API types**

`place`, `update`, `remove` return reversible response. Add helper used by controller later:

```ts
export const mutationSnapshot = (result: HexReversibleMutationResponse) => result.snapshot;
```

- [ ] **Step 6: Test Redis failure degradation with fake throwing store**

Call finalizer using a fake `save()` that throws; assert returned snapshot is preserved and `undo === null`.

- [ ] **Step 7: Run tests GREEN**

```bash
node --import tsx --test tests/hex-world-api-contract.test.ts tests/hex-world-db.test.ts tests/hex-undo-store.test.ts
```

- [ ] **Step 8: Commit**

```bash
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
- Modify: `.github/workflows/hex-homestead-ci.yml` later in Task 13; local test can run against developer Postgres/Redis.

**Interfaces:**
- Adds error codes `undo_unavailable`, `undo_conflict` to `HexWorldErrorCode`.
- Produces `undoHexWorldMutation(scope, token, store = redisHexUndoStore): Promise<HexWorldSnapshot>`.

- [ ] **Step 1: Write DB+Redis integration test RED**

Test setup creates isolated config/partner/Land, initializes HexWorld, and uses real Redis keys with a unique user/config scope. Cover Place→Undo first.

- [ ] **Step 2: Implement claim + revision gate**

Flow:

```ts
const claim = await store.claim(scope, token);
if (!claim) throw new HexWorldServiceError('undo_unavailable', 409, 'Undo is no longer available');
try {
  const snapshot = await runHexTransaction(async (tx) => {
    const current = await getOrCreateHexWorldSnapshotWithClient(tx, scope.configId, scope.landId);
    if (current.world.revision !== claim.descriptor.expectedRevision) {
      throw new HexWorldServiceError('undo_conflict', 409, 'The Land changed after this action');
    }
    // inverse, then increment revision once
  });
  await store.consume(claim);
  return snapshot;
} catch (error) {
  if (error instanceof HexWorldServiceError && error.code === 'undo_conflict') await store.consume(claim);
  else await store.release(claim);
  throw error;
}
```

Revision is the cross-building stale-edit guard: any newer reversible building mutation changes the same world revision row.

- [ ] **Step 3: Implement Place inverse**

Require target building to exist and exactly match descriptor expected state; delete it; increment world revision; return snapshot.

- [ ] **Step 4: Implement Move and Rotate inverse**

Require current building to equal descriptor expected state. Run `validatePlacement()` for `before` anchor/rotation with `ignoreBuildingId`. If invalid, throw `undo_conflict`; otherwise restore before fields, increment revision.

- [ ] **Step 5: Implement Remove inverse**

Require original id still absent. Validate before footprint against current tiles/buildings. Recreate exact id/key/anchor/rotation/modelUrl/metadata and increment revision. If occupied or invalid, return `undo_conflict` without overwriting current state.

- [ ] **Step 6: Implement API route**

`POST /api/hex-world/undo` accepts only `{landId, undoToken}`. Use `requireConfigAccess`; server scope uses `access.configId` and `access.userId`.

- [ ] **Step 7: Complete integration matrix**

Add DB+Redis tests for:

- Place undo
- Move undo
- Rotate undo
- Remove undo
- different user/config/Land rejected
- newer reversible mutation causes old token `undo_conflict`
- expired/unknown/reused token `undo_unavailable`
- two concurrent calls produce at most one success
- inverse placement conflict leaves DB unchanged
- expansion endpoint never returns undo metadata

At test end call `closeRedisConnection()` and clean created DB rows.

- [ ] **Step 8: Run integration test GREEN**

With local Postgres/Redis available:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/narinyland_ci REDIS_URL=redis://127.0.0.1:6379 NODE_ENV=production node --import tsx --test tests/hex-world-undo-db.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add lib/hex-world/undo-service.ts app/api/hex-world/undo/route.ts lib/hex-world/types.ts tests/hex-world-undo-db.test.ts
git commit -m "feat: add authoritative one-step hex undo"
```

---

### Task 12: Add Client Undo Toast, Conflict Handling, and Land-Safe Transient Cleanup

**Files:**
- Create: `components/hex-world/HexUndoToast.tsx`
- Modify: `services/hex-world-api.ts`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexExpansionController.tsx`
- Modify: `app/garden/_components/GardenWorldStage.tsx`
- Test: `tests/hex-builder-ui-contract.test.ts`
- Test: `tests/garden-hex-integration.test.ts`

**Interfaces:**
- `hexWorldAPI.undo(landId, undoToken): Promise<HexWorldSnapshot>`.
- `HexUndoToast` receives `undo: HexUndoMeta | null`, countdown/expiry, `onUndo`, `onDismiss`.

- [ ] **Step 1: Write UI contract RED**

Assert controller imports `HexUndoToast`, calls `hexWorldAPI.undo`, and handles codes `undo_unavailable`/`undo_conflict`. Assert expansion confirmation clears current client undo opportunity because the latest visible action is non-undoable, while server token simply expires naturally.

- [ ] **Step 2: Capture mutation responses in controller**

For Place/Move/Rotate/Remove:

```ts
const result = await hexWorldAPI.place(...);
setSnapshot(result.snapshot);
setUndo(result.undo);
```

Never set Undo before server confirmation.

- [ ] **Step 3: Implement toast expiry**

Use `expiresAt` returned by server; client does not invent trust. Disable/dismiss when `Date.now() >= expiresAt`. Visible copy examples: `Bench placed · Undo`, `Workshop moved · Undo`.

- [ ] **Step 4: Implement Undo click**

Set busy only for Undo action, call API once, replace snapshot on success, clear selected/transient builder state that no longer exists, then dismiss token. On `undo_conflict`, show `Land changed — undo unavailable`; on `undo_unavailable`, dismiss quietly with concise toast.

- [ ] **Step 5: Clear Land-owned transient state on switch**

When `landId` changes, reset reducer, catalog/remove confirmation, new-tile animation, and client undo metadata. Existing AbortController stale-fetch guard remains.

- [ ] **Step 6: Run UI/integration tests GREEN**

```bash
node --import tsx --test tests/hex-builder-ui-contract.test.ts tests/garden-hex-integration.test.ts tests/hex-world-api-contract.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/HexUndoToast.tsx services/hex-world-api.ts components/hex-world/HexBuildController.tsx components/hex-world/HexExpansionController.tsx app/garden/_components/GardenWorldStage.tsx tests/hex-builder-ui-contract.test.ts tests/garden-hex-integration.test.ts tests/hex-world-api-contract.test.ts
git commit -m "feat: add cozy builder undo experience"
```

---

### Task 13: Add Redis CI, Full Acceptance Regression, Performance Budget Checks, and Railway Release Gate

**Files:**
- Modify: `.github/workflows/hex-homestead-ci.yml`
- Create: `tests/hex-phase2-acceptance.test.ts`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/garden-hex-integration.test.ts`
- No production schema file changes in this task beyond validating Task 8 migration.

**Interfaces:**
- CI becomes authoritative automated gate for Postgres + Redis + pure visual/interaction + existing farm regression + lint/build.

- [ ] **Step 1: Add Redis 7 service to CI**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    # keep existing health config
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

Do **not** set `REDIS_URL` globally for all Node tests, because an ioredis client would unnecessarily open for pure tests. Run Undo integration as its own step with `REDIS_URL` env.

- [ ] **Step 2: Keep pure Hex tests Redis-free**

Expand existing Hex Homestead test step to include:

- `hex-camera.test.ts`
- `hex-quality.test.ts`
- `hex-visual-variation.test.ts`
- `hex-builder-primitives.test.ts`
- `hex-render-budget.test.ts`
- `hex-building-art.test.ts`
- `hex-builder-ui-contract.test.ts`
- `hex-expansion-ui-contract.test.ts`
- existing Hex/farm/startup tests

Use `NODE_ENV: production` with no `REDIS_URL` for that step.

- [ ] **Step 3: Add dedicated Undo DB+Redis step**

```yaml
- name: Hex Undo DB and Redis integration
  env:
    NODE_ENV: production
    REDIS_URL: redis://127.0.0.1:6379
  run: node --import tsx --test tests/hex-world-undo-db.test.ts
```

- [ ] **Step 4: Add acceptance source/logic test**

`hex-phase2-acceptance.test.ts` verifies the implemented code surface supports the approved journey:

- smart camera + Reset View
- Build tray
- selected context toolbar
- Move/Rotate/Remove
- no Home remove
- in-world expansion clusters
- Undo route/client
- mobile safe-area classes
- no WASD/game-mode labels
- no heavy EffectComposer requirement

This is a regression contract, not a substitute for visual human review.

- [ ] **Step 5: Add render-budget guards**

Source assertions enforce:

- only `HexWorldLighting` contains the primary `castShadow` directional light
- particle code uses one `<points>` field, not React child per particle
- ambient repeated geometry still uses `instancedMesh`
- no `MeshReflectorMaterial`, `EffectComposer`, heavy Bloom/DOF dependency added
- quality profile caps High DPR at 1.75

- [ ] **Step 6: Run full local-equivalent validation**

```bash
npm test
npx prisma validate
npm run lint
npm run build
```

Then run DB/Redis integration using the environment command from Task 11.

Expected: zero test failures, Prisma valid, lint exits 0 (warnings allowed under current repository policy), production build exits 0.

- [ ] **Step 7: Open implementation PR and require current-head green CI**

PR body must call out:

- Visual Wow > Builder UX direction
- smart camera and quality tiers
- premium art/atmosphere pass
- world-first Build/Expand UX
- additive `HexWorld.revision`
- Redis one-step Undo and degradation behavior
- legacy data preservation
- no expansion Undo/game-mode/avatar additions

Do not merge with known failing CI.

- [ ] **Step 8: Railway production verification after merge**

Verify using Railway connector:

1. latest Narinyland deployment commit hash equals merged `main` SHA;
2. `prisma migrate deploy` applies `20260820010000_add_hex_world_revision` successfully;
3. runtime logs contain no destructive cleanup/drop-table behavior;
4. Narinyland, Postgres, Redis all report `SUCCESS`;
5. authenticated safe-Land smoke covers GET twice with same world id/revision absent mutation, Place, Move, Rotate, Undo, Remove, Undo where valid, Expand preview/confirm, Reset View, Land switch, reload;
6. legacy `PurchasedItem` count is not reduced by HexWorld initialization/activity.

- [ ] **Step 9: Visual/mobile review checklist**

On production or a safe authenticated preview:

- Desktop 1440px Medium: island occupies roughly 70–80% safe viewport, Home is focal point, orbit/zoom/build remain responsive.
- Mobile portrait ~390x844: toolbar targets >=44px, safe-area respected, sheets <~50vh, contextual actions fall back to bottom bar, pinch/orbit do not trigger placement.
- Mobile landscape ~844x390: toolbar/sheet do not horizontally overflow and island remains operable.
- High vs Medium vs Mobile profiles preserve the same visual identity while reducing clouds/particles/shadows/density.

- [ ] **Step 10: Commit CI/acceptance gate**

```bash
git add .github/workflows/hex-homestead-ci.yml tests/hex-phase2-acceptance.test.ts tests/hex-render-budget.test.ts tests/garden-hex-integration.test.ts
git commit -m "ci: validate polished cozy builder phase two"
```

---

## Plan Self-Review Matrix

| Approved spec requirement | Implemented by |
| --- | --- |
| Visual Wow > Builder UX | Tasks 1–7 |
| Magical Floating Garden + Premium Miniature Diorama | Tasks 2–4 |
| Hero island framing / 70–80% viewport | Tasks 1–2 |
| Smart Overview / Focus / Build camera intents | Tasks 1–2 |
| Reset View bounds-aware | Tasks 1, 2, 6 |
| Expansion reframe only when needed | Tasks 1, 7 |
| One warm primary shadow light | Tasks 2–3 |
| Layered clouds / atmosphere / floating underside | Task 3 |
| Water polish without planar reflection | Task 3 |
| Premium Home/Storage/Workshop + cohesive catalog | Task 4 |
| Deterministic vegetation variation | Tasks 1, 4 |
| Normal view hides raw grid emphasis | Task 5 |
| Invalid placement reason text | Tasks 1, 5 |
| World-first Build tray | Task 6 |
| Contextual Move/Rotate/Remove | Task 6 |
| Home non-removable | Tasks 6, 11 acceptance tests |
| No `window.confirm` | Task 6 |
| Keyboard + mobile/touch constraints | Tasks 6, 13 |
| World-first expansion selection | Task 7 |
| Server-confirmed expansion animation | Task 7 |
| Adaptive High/Medium/Mobile quality | Tasks 1, 3, 4, 13 |
| One-step Place/Move/Rotate/Remove Undo | Tasks 8–12 |
| Undo scoped `(configId, landId, userId)` | Tasks 9–11 |
| Latest reversible mutation invalidates old Undo safely | Tasks 8–11 via world revision + latest Redis pointer |
| Undo one-time/double-click safe | Tasks 9, 11 |
| Undo conflict cannot overwrite newer state | Tasks 8, 11 |
| Redis outage does not fail core mutation | Tasks 9–10 |
| Expansion remains non-undoable | Tasks 7, 10–12 |
| Existing Points expansion transaction preserved | Tasks 7, 13 regression |
| Existing Land/PurchasedItem/family-farm data preserved | Tasks 8, 13 regression/release |
| No farming/crafting/NPC/avatar/multiplayer scope creep | Global constraints + Task 13 acceptance |
| Postgres + Redis CI | Task 13 |
| Prisma additive migration validation | Tasks 8, 13 |
| Railway release verification | Task 13 |

## Explicit Non-Changes

- Do not import legacy `PurchasedItem` into HexBuilding.
- Do not delete dormant family-farm code or saves.
- Do not replace axial placement with arbitrary 3D coordinates.
- Do not make visual ambient decor persistent rows.
- Do not add paid building prices.
- Do not add Undo history beyond the latest short-lived opportunity.
- Do not allow Undo for expansion or refund expansion Points.
- Do not make Redis availability a prerequisite for Place/Move/Rotate/Remove.
- Do not introduce a game/camera mode selector to expose internal camera intents.
