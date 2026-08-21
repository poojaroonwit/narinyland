# Narinyland Premium Graphics & Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing `/garden` floating HexWorld into a more premium, alive miniature-diorama experience with richer materials, restrained world motion, tactile placement feedback, stable camera behavior, and preserved mobile performance.

**Architecture:** Extend the existing Phase 2 scene modules rather than rewriting the renderer. Keep animation inside focused Three scene components via `useFrame`, refs, deterministic helpers, and semantic triggers from `HexBuildController`; keep server authority, click-to-place, Undo, Land isolation, and persistence unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Three.js 0.182, `@react-three/fiber` 9.5, `@react-three/drei` 10.7, Node test runner + `tsx`, Prisma/Postgres, Redis integration CI.

**Spec:** `docs/superpowers/specs/2026-08-21-premium-graphics-motion-design.md`

## Global Constraints

- Scope is `/garden` floating HexWorld presentation only; no farming economy, crafting, NPCs, character movement, multiplayer building, persistence schema, or API redesign.
- Preserve click-to-place: valid Build tile click places immediately; invalid clicks send no mutation; rapid double-click remains guarded; Move keeps explicit `Move here`.
- Preserve server authority: celebrate Place/Move/Rotate/Expand only after confirmed server success.
- Preserve one-step Redis Undo behavior and existing Land-switch stale-response guards.
- Preserve instancing for repeated terrain and ambient geometry.
- Keep one primary directional shadow owner; no per-building dynamic lights.
- No mandatory Bloom, DOF, SSAO, SSR, planar reflection, or heavy post-processing.
- High DPR ceiling remains `1.75`; Mobile remains approximately `1.0`.
- Do not add a new animation dependency; use existing Three/R3F/Drei primitives and existing Framer Motion only for DOM if a DOM transition is touched.
- Respect `prefers-reduced-motion: reduce` across camera travel, placement drop, ghost bob, vegetation sway, cloud drift, and expansion travel while retaining clear state feedback.
- Build camera must not chase hover anchors.
- Fixed phase buckets are preferred over per-instance arbitrary matrix rewrites every frame for vegetation/water motion.
- Every task follows RED → verify RED → GREEN → verify GREEN → commit.

---

## File Structure

### New files

- `lib/hex-world/motion.ts` — pure motion constants, interpolation helpers, deterministic phase/bucket helpers, reduced-motion profile resolution.
- `components/hex-world/useReducedHexMotion.ts` — one client media-query resolver for reduced motion.
- `components/hex-world/HexPlacementEffects.tsx` — bounded visual-only confirmed Place/Move/Expand particle/mist effects.
- `tests/hex-motion.test.ts` — pure motion helper tests.
- `tests/hex-premium-motion-contract.test.ts` — scene/UI source-level contracts for motion ownership and preservation rules.

### Main modified files

- `lib/hex-world/quality.ts`
- `lib/hex-world/camera.ts`
- `components/hex-world/HexWorld3D.tsx`
- `components/hex-world/HexDioramaCamera.tsx`
- `components/hex-world/HexTileInstances.tsx`
- `components/hex-world/HexSelectionEffects.tsx`
- `components/hex-world/HexBuildings.tsx`
- `components/hex-world/HexAmbientDecor.tsx`
- `components/hex-world/HexSkyAtmosphere.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `components/hex-world/HexWaterSurface.tsx`
- `components/hex-world/HexExpansionClusters.tsx`
- `components/hex-world/HexBuildingModels.tsx`
- `components/hex-world/models/HexStructureModels.tsx`
- `components/hex-world/models/HexNatureModels.tsx`
- `components/hex-world/models/HexDecorModels.tsx`
- `components/hex-world/HexBuildController.tsx`
- existing Hex tests and acceptance/render-budget tests.

---

### Task 1: Shared Motion Profile, Deterministic Phases, and Quality Envelope

**Files:**
- Create: `lib/hex-world/motion.ts`
- Create: `components/hex-world/useReducedHexMotion.ts`
- Create: `tests/hex-motion.test.ts`
- Modify: `lib/hex-world/quality.ts`
- Modify: `tests/hex-quality.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type HexMotionProfile = {
    hoverResponse: number;
    selectResponse: number;
    placementDurationMs: number;
    rotationDurationMs: number;
    removalDurationMs: number;
    expansionDurationMs: number;
    cameraResponse: number;
    ambientScale: number;
    ghostBobScale: number;
  };

  export function deterministicMotionPhase(key: string): number;
  export function deterministicMotionBucket(key: string, bucketCount: number): number;
  export function expSmoothingAlpha(delta: number, response: number): number;
  export function resolveHexMotionProfile(input: {
    quality: HexQualityProfile;
    reducedMotion: boolean;
  }): HexMotionProfile;
  ```
- Extends `HexQualityProfile` with:
  ```ts
  vegetationMotion: 'full' | 'reduced' | 'minimal';
  placementParticleCount: 20 | 10 | 4;
  waterGlintCount: 3 | 1 | 0;
  cloudParallaxScale: 1 | 0.6 | 0.25;
  materialVariation: 'full' | 'reduced';
  ```

- [ ] **Step 1: Write failing pure motion tests**

Add `tests/hex-motion.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deterministicMotionBucket, deterministicMotionPhase, expSmoothingAlpha, resolveHexMotionProfile } from '@/lib/hex-world/motion';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';

test('motion phase is deterministic and normalized', () => {
  const a = deterministicMotionPhase('tree:4:-2');
  assert.equal(a, deterministicMotionPhase('tree:4:-2'));
  assert.ok(a >= 0 && a < Math.PI * 2);
});

test('motion buckets are deterministic and bounded', () => {
  const bucket = deterministicMotionBucket('water:3:7', 4);
  assert.equal(bucket, deterministicMotionBucket('water:3:7', 4));
  assert.ok(bucket >= 0 && bucket < 4);
});

test('reduced motion collapses decorative travel but keeps feedback response', () => {
  const quality = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440 });
  const profile = resolveHexMotionProfile({ quality, reducedMotion: true });
  assert.equal(profile.ambientScale, 0);
  assert.equal(profile.ghostBobScale, 0);
  assert.ok(profile.hoverResponse > 0);
  assert.ok(profile.cameraResponse >= 20);
});

test('exponential smoothing alpha is frame-rate safe', () => {
  const alpha = expSmoothingAlpha(1 / 60, 8);
  assert.ok(alpha > 0 && alpha < 1);
});
```

Extend `tests/hex-quality.test.ts` high/mobile assertions:

```ts
assert.equal(profile.vegetationMotion, 'full');
assert.equal(profile.placementParticleCount, 20);
assert.equal(profile.waterGlintCount, 3);
```

and for mobile:

```ts
assert.equal(profile.vegetationMotion, 'minimal');
assert.equal(profile.waterGlintCount, 0);
assert.ok(profile.placementParticleCount <= 4);
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --import tsx --test tests/hex-motion.test.ts tests/hex-quality.test.ts
```

Expected: FAIL because `lib/hex-world/motion.ts` and new quality fields do not exist.

- [ ] **Step 3: Implement minimal pure motion module and quality fields**

Use a stable FNV-style integer hash similar to existing particle seeding; phase is `(hash >>> 0) / 0xffffffff * Math.PI * 2`. `deterministicMotionBucket` must throw for `bucketCount < 1` and return `Math.floor(ratio * bucketCount) % bucketCount`.

Use:

```ts
export function expSmoothingAlpha(delta: number, response: number) {
  return 1 - Math.exp(-Math.max(0, delta) * Math.max(0, response));
}
```

Recommended normal profile values:

```ts
{
  hoverResponse: 12,
  selectResponse: 9,
  placementDurationMs: 420,
  rotationDurationMs: 230,
  removalDurationMs: 220,
  expansionDurationMs: 950,
  cameraResponse: 5.2,
  ambientScale: quality.windStrength,
  ghostBobScale: quality.name === 'mobile' ? 0.35 : 1,
}
```

Reduced profile keeps quick state response but removes decorative travel:

```ts
{
  hoverResponse: 20,
  selectResponse: 20,
  placementDurationMs: 80,
  rotationDurationMs: 80,
  removalDurationMs: 80,
  expansionDurationMs: 120,
  cameraResponse: 28,
  ambientScale: 0,
  ghostBobScale: 0,
}
```

`useReducedHexMotion()` should subscribe to `window.matchMedia('(prefers-reduced-motion: reduce)')`, support modern `addEventListener('change', ...)`, and clean up on unmount.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-motion.test.ts tests/hex-quality.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/motion.ts lib/hex-world/quality.ts components/hex-world/useReducedHexMotion.ts tests/hex-motion.test.ts tests/hex-quality.test.ts
git commit -m "feat: add hex motion profiles"
```

---

### Task 2: Premium Camera Settle and Build-Stable Framing

**Files:**
- Modify: `lib/hex-world/camera.ts`
- Modify: `components/hex-world/HexDioramaCamera.tsx`
- Modify: `tests/hex-camera.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts` (create in this task)

**Interfaces:**
- `getBuildCameraPose(bounds, aspect)` must no longer depend on the hover anchor.
- `HexDioramaCamera` consumes `motionProfile: HexMotionProfile` and `reducedMotion: boolean`.

- [ ] **Step 1: Write RED camera tests**

In `tests/hex-camera.test.ts`, add:

```ts
test('build framing is stable across hover coordinates', () => {
  const bounds = getUnlockedIslandBounds(sampleTiles);
  const first = getBuildCameraPose(bounds, 16 / 9);
  const second = getBuildCameraPose(bounds, 16 / 9);
  assert.deepEqual(first, second);
});
```

Update imports/signature so `getBuildCameraPose(bounds, aspect)` is the desired API.

Create `tests/hex-premium-motion-contract.test.ts` with:

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('build camera does not chase hovered placement anchor', async () => {
  const camera = await source('../components/hex-world/HexDioramaCamera.tsx');
  const math = await source('../lib/hex-world/camera.ts');
  assert.doesNotMatch(math, /getBuildCameraPose\([^)]*anchor/);
  assert.match(camera, /motionProfile/);
});
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-camera.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because current build camera accepts `anchor` and camera has no motion profile.

- [ ] **Step 3: Implement stable Build framing**

Change `HexCameraIntent` to keep semantic `anchor` if other UI relies on it, but `HexDioramaCamera` must call:

```ts
getBuildCameraPose(bounds, aspect)
```

Build pose should start from Overview and tighten slightly without changing target per hover:

```ts
const overview = getOverviewCameraPose(bounds, aspect);
const distance = Math.max(11, overview.distance * 0.9);
return {
  target: overview.target,
  position: [
    overview.target[0] + distance * 0.52,
    overview.target[1] + distance * 0.72,
    overview.target[2] + distance * 0.66,
  ],
  distance,
};
```

Use `expSmoothingAlpha(delta, motionProfile.cameraResponse)` in `useFrame` instead of hard-coded `5.2`.

For reduced motion, set initial and subsequent scripted poses directly or use the high response from the resolved profile. User orbit `onStart` must still cancel scripted travel.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-camera.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/camera.ts components/hex-world/HexDioramaCamera.tsx tests/hex-camera.test.ts tests/hex-premium-motion-contract.test.ts
git commit -m "feat: stabilize premium build camera"
```

---

### Task 3: Terrain Tone Variation, Hover Lift, and Build-State Pulse

**Files:**
- Modify: `components/hex-world/HexTileInstances.tsx`
- Modify: `lib/hex-world/rendering.ts`
- Modify: `tests/hex-world-rendering.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- Add pure helper in `rendering.ts`:
  ```ts
  export function getTerrainDisplayColor(input: {
    terrainType: HexTerrainType;
    q: number;
    r: number;
    state: 'normal' | 'hovered' | 'selected' | 'valid' | 'invalid' | 'expansion';
    materialVariation: 'full' | 'reduced';
  }): string;
  ```
- `HexTileInstances` consumes `motionProfile` and quality profile.

- [ ] **Step 1: Write RED tests for deterministic color variation and instancing preservation**

Add to `tests/hex-world-rendering.test.ts`:

```ts
test('terrain display variation is deterministic and subtle', () => {
  const a = getTerrainDisplayColor({ terrainType: 'grass', q: 2, r: 3, state: 'normal', materialVariation: 'full' });
  const b = getTerrainDisplayColor({ terrainType: 'grass', q: 2, r: 3, state: 'normal', materialVariation: 'full' });
  assert.equal(a, b);
  assert.notEqual(a, getTerrainDisplayColor({ terrainType: 'grass', q: 8, r: -3, state: 'normal', materialVariation: 'full' }));
});
```

Add source contract:

```ts
assert.match(tiles, /hoverResponse/);
assert.match(tiles, /InstancedMesh/);
assert.doesNotMatch(tiles, /<mesh\s+key=\{.*tile/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-world-rendering.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because helper and animated hover response do not exist.

- [ ] **Step 3: Implement deterministic material color and targeted instance animation**

Keep one instanced mesh per terrain group. Store per-instance current Y/scale feedback in refs or recompute only the affected group. Hover target lift is `0.055`; selected target lift `0.035`; normal target `0`.

Use `expSmoothingAlpha(delta, motionProfile.hoverResponse)` and mutate only matrices for the terrain batches while maintaining `instanceMatrix.needsUpdate` once per active frame.

Valid/invalid breathing may be a small color/selection-layer pulse rather than matrix scale. Do not animate every normal tile indefinitely.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-world-rendering.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexTileInstances.tsx lib/hex-world/rendering.ts tests/hex-world-rendering.test.ts tests/hex-premium-motion-contract.test.ts
git commit -m "feat: polish hex terrain feedback"
```

---

### Task 4: Animated Selection Ring and Ghost Preview

**Files:**
- Modify: `components/hex-world/HexSelectionEffects.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `components/hex-world/HexBuildingModels.tsx` only if ghost tint needs a typed prop
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- Remove local `HEX_MOTION` timing constants from `HexSelectionEffects`.
- `HexSelectionEffects` consumes `motionProfile` and `reducedMotion`.
- Ghost preview group uses `motionProfile.ghostBobScale` and keeps `ghost` material semantics.

- [ ] **Step 1: Write RED source contracts**

```ts
test('selection and ghost motion use shared motion profile', async () => {
  const selection = await source('../components/hex-world/HexSelectionEffects.tsx');
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  assert.doesNotMatch(selection, /export const HEX_MOTION/);
  assert.match(selection, /motionProfile/);
  assert.match(world, /ghostBobScale/);
});
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL on shared motion ownership/ghost animation.

- [ ] **Step 3: Implement ring and ghost animation**

Selection ring uses one `group` ref. Pulse only opacity/scale in a restrained range, e.g. scale `1 → 1.025`; invalid pulse can be slightly faster. Use `useFrame`, no React state per frame.

Move ghost preview into a small internal component inside `HexWorld3D` or focused file if it becomes >50 lines. Apply vertical bob:

```ts
const y = baseY + Math.sin(clock.elapsedTime * 1.6 + phase) * 0.02 * motionProfile.ghostBobScale;
```

Invalid ghost keeps muted coral tint through existing ghost material path; do not add lights.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-premium-motion-contract.test.ts tests/hex-world-rendering.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexSelectionEffects.tsx components/hex-world/HexWorld3D.tsx components/hex-world/HexBuildingModels.tsx tests/hex-premium-motion-contract.test.ts
git commit -m "feat: animate selection and build ghost"
```

---

### Task 5: Smooth Building Selection, Rotation, and Server-Confirmed Placement Trigger

**Files:**
- Modify: `components/hex-world/HexBuildings.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `tests/hex-builder-ui-contract.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- `HexBuildController` adds presentation-only state:
  ```ts
  type HexConfirmedVisualEvent =
    | { kind: 'placed'; buildingId: string; coord: HexCoord; nonce: number }
    | { kind: 'moved'; buildingId: string; coord: HexCoord; nonce: number }
    | { kind: 'rotated'; buildingId: string; nonce: number }
    | null;
  ```
- It derives newly placed building id by comparing pre-request `snapshot.buildings` ids with `confirmed.snapshot.buildings` ids after server success. No API response change.
- `HexBuildings` consumes `visualEvent`, `motionProfile`, and `reducedMotion`.

- [ ] **Step 1: Write RED contract tests**

In `tests/hex-builder-ui-contract.test.ts`, add:

```ts
assert.match(controller, /new Set\(snapshot\.buildings\.map\(\(building\) => building\.id\)\)/);
assert.match(controller, /confirmed\.snapshot\.buildings\.find/);
```

In premium contract test:

```ts
const buildings = await source('../components/hex-world/HexBuildings.tsx');
assert.match(buildings, /useFrame/);
assert.match(buildings, /visualEvent/);
assert.doesNotMatch(buildings, /position=\{\[position\.x, position\.y \+ \(selected \? 0\.04 : 0\)/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-builder-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because immediate transforms and no semantic event exist.

- [ ] **Step 3: Implement smooth building transform ownership**

Create a focused per-building wrapper inside `HexBuildings.tsx`, e.g. `AnimatedHexBuilding`, with refs for current position/scale/yaw. Interpolate selection lift/scale using `motionProfile.selectResponse`.

For server-confirmed placement event, initialize the new building visual at `targetY + 0.65` unless reduced motion, then settle over `placementDurationMs`. Rotation uses shortest 60° wrap and `rotationDurationMs`.

On Land switch, `HexBuildController` already resets transient state; also set visual event to `null` in the same effect.

Do not delay snapshot updates. Persistence state updates immediately after success; animation is only presentation.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-builder-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-undo-ui-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexBuildings.tsx components/hex-world/HexBuildController.tsx components/hex-world/HexWorld3D.tsx tests/hex-builder-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-undo-ui-contract.test.ts
git commit -m "feat: animate confirmed building actions"
```

---

### Task 6: Bounded Placement Effect Pool and Invalid Click Pulse

**Files:**
- Create: `components/hex-world/HexPlacementEffects.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexSelectionEffects.tsx`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- `HexPlacementEffects` consumes:
  ```ts
  {
    event: HexConfirmedVisualEvent;
    quality: HexQualityProfile;
    motionProfile: HexMotionProfile;
    seed: string;
  }
  ```
- Use one `points` draw call for transient dust/sparkle positions.
- Invalid click does not produce a confirmed event and does not call API; it only bumps an `invalidPulseNonce` presentation value.

- [ ] **Step 1: Write RED render-budget tests**

Add:

```ts
const placement = await source('../components/hex-world/HexPlacementEffects.tsx').catch(() => '');
assert.equal((placement.match(/<points\b/g) ?? []).length, 1);
assert.doesNotMatch(placement, /hexWorldAPI|fetch\(|prisma/);
```

Premium contract:

```ts
assert.match(world, /HexPlacementEffects/);
assert.match(controller, /invalidPulseNonce/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because placement effect module does not exist.

- [ ] **Step 3: Implement bounded effect pool**

Allocate a single `Float32Array` sized to the maximum High count (`20 * 3`). On each confirmed event, deterministically populate only `quality.placementParticleCount` positions around the action coordinate and animate elapsed life via one points material opacity/scale update. Do not create one React element per particle.

Invalid pulse is rendered in `HexSelectionEffects` as a short opacity/scale pulse keyed by nonce; no camera shake.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-builder-ui-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexPlacementEffects.tsx components/hex-world/HexWorld3D.tsx components/hex-world/HexBuildController.tsx components/hex-world/HexSelectionEffects.tsx tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-builder-ui-contract.test.ts
git commit -m "feat: add tactile placement effects"
```

---

### Task 7: Instanced Vegetation Motion with Fixed Phase Buckets

**Files:**
- Modify: `components/hex-world/HexAmbientDecor.tsx`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- `HexAmbientDecor` consumes `profile` and `motionProfile`.
- Trees/flowers/sprouts are assigned deterministic buckets with `deterministicMotionBucket(key, bucketCount)`.
- Rocks/paths remain static.

- [ ] **Step 1: Write RED contracts**

```ts
const ambient = await source('../components/hex-world/HexAmbientDecor.tsx');
assert.match(ambient, /deterministicMotionBucket/);
assert.match(ambient, /vegetationMotion/);
assert.match(ambient, /motionProfile/);
assert.doesNotMatch(ambient, /rocks[\s\S]*useFrame[\s\S]*rocks/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because ambient decor is currently static and has no quality-aware buckets.

- [ ] **Step 3: Implement phase-bucket vegetation**

Use 3–4 deterministic buckets for High, 2 for Medium, and 1 minimal/static bucket for Mobile. Prefer animating bucket parent groups where possible. Keep tree canopy amplitude larger than trunk; target canopy about `0.5°–1.5°`, trunk much smaller. Flowers/sprouts use lower amplitude.

No motion for rocks or path placements. No random values during render.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexAmbientDecor.tsx tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
git commit -m "feat: add bounded vegetation motion"
```

---

### Task 8: Cloud Parallax, Lighting Tune, and Model Material Pass

**Files:**
- Modify: `components/hex-world/HexSkyAtmosphere.tsx`
- Modify: `components/hex-world/HexWorldLighting.tsx`
- Modify: `components/hex-world/models/HexStructureModels.tsx`
- Modify: `components/hex-world/models/HexNatureModels.tsx`
- Modify: `components/hex-world/models/HexDecorModels.tsx`
- Modify: `tests/hex-building-art.test.ts`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- `HexSkyAtmosphere` consumes `motionProfile`; each bounded layer gets its own deterministic drift multiplier.
- Keep exactly one directional light.
- Model material changes remain local Three materials; no remote GLB requirement.

- [ ] **Step 1: Write RED contracts**

```ts
const sky = await source('../components/hex-world/HexSkyAtmosphere.tsx');
const lighting = await source('../components/hex-world/HexWorldLighting.tsx');
assert.match(sky, /cloudParallaxScale/);
assert.match(sky, /motionProfile/);
assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
assert.doesNotMatch(`${sky}\n${lighting}`, /EffectComposer|Bloom|DepthOfField|volumetric/i);
```

Extend building-art test to require all existing catalog keys remain locally dispatched after material edits.

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-building-art.test.ts tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL on new cloud/motion profile contract.

- [ ] **Step 3: Implement visual tune**

Cloud layers retain current bounded count but use separate group refs/drift rates. Scale drift by `profile.cloudParallaxScale * motionProfile.ambientScale`.

Tune lighting without new lights: warm directional key, cooler hemisphere fill, softer contact shadow balance. Keep emissive-only warm windows where already appropriate; do not add point lights.

Model materials should remain muted/coherent: cream/terracotta/moss/warm wood/stone. Adjust roughness/value rather than adding high-cost shaders.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-building-art.test.ts tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexSkyAtmosphere.tsx components/hex-world/HexWorldLighting.tsx components/hex-world/models/HexStructureModels.tsx components/hex-world/models/HexNatureModels.tsx components/hex-world/models/HexDecorModels.tsx tests/hex-building-art.test.ts tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
git commit -m "feat: refine sky lighting and materials"
```

---

### Task 9: Premium Water Motion with Bounded Glints

**Files:**
- Modify: `components/hex-world/HexWaterSurface.tsx`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- `HexWaterSurface` consumes `motionProfile` and extended quality fields.
- Use deterministic phase buckets; do not update each water tile with arbitrary phase every frame when a small number of bucket groups can create the impression.
- `waterGlintCount` is 3/1/0 for High/Medium/Mobile.

- [ ] **Step 1: Write RED contracts**

```ts
const water = await source('../components/hex-world/HexWaterSurface.tsx');
assert.match(water, /deterministicMotionBucket/);
assert.match(water, /waterGlintCount/);
assert.doesNotMatch(water, /MeshReflectorMaterial|CubeCamera|WebGLCubeRenderTarget/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because current water moves as one slab and does not use quality glint count.

- [ ] **Step 3: Implement asynchronous bounded water**

Split water tiles into a small deterministic number of motion buckets. Apply tiny Y offset/scale or material opacity variation per bucket. Keep translucent turquoise, moderately high roughness, `depthWrite={false}`.

Render at most `profile.waterGlintCount` ring/glint meshes. Mobile renders zero glints and minimal motion.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexWaterSurface.tsx tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
git commit -m "feat: polish bounded pond motion"
```

---

### Task 10: Expansion Mist, Deterministic Stagger, and Gentle Reframe

**Files:**
- Modify: `components/hex-world/HexTileInstances.tsx`
- Modify: `components/hex-world/HexExpansionClusters.tsx`
- Modify: `components/hex-world/HexPlacementEffects.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `tests/hex-expansion-ui-contract.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- Existing `newlyAddedKeys` stays the semantic trigger for confirmed expansion.
- Stagger order is deterministic from sorted `(q,r)` or stable phase helper.
- Expansion remains non-undoable.

- [ ] **Step 1: Write RED expansion motion contracts**

Add:

```ts
assert.match(tiles, /stagger/);
assert.match(effects, /expansion/);
assert.match(controller, /setUndo\(null\)/);
assert.doesNotMatch(controller, /undo.*expansion|expansion.*undo/i);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-expansion-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because rise animation has no deterministic per-tile stagger/mist effect contract.

- [ ] **Step 3: Implement confirmed expansion sequence**

Keep server success as the trigger. For each rise tile calculate a stable delay within roughly `0–180ms`; then use existing ease-out rise over remaining `motionProfile.expansionDurationMs`.

`HexPlacementEffects` may render a low-count mist/dust edge effect keyed by expansion event. Existing bounds-aware reframe remains; camera does not reframe when new tiles stay within safe bounds.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-expansion-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-phase2-acceptance.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexTileInstances.tsx components/hex-world/HexExpansionClusters.tsx components/hex-world/HexPlacementEffects.tsx components/hex-world/HexBuildController.tsx tests/hex-expansion-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-phase2-acceptance.test.ts
git commit -m "feat: polish confirmed expansion motion"
```

---

### Task 11: Wire Reduced Motion, Quality Profiles, and Page Visibility Across the Scene

**Files:**
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: all scene components touched above to receive shared profile rather than re-query media state
- Modify: `tests/hex-premium-motion-contract.test.ts`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/hex-phase2-acceptance.test.ts`

**Interfaces:**
- `HexWorld3D` is the single owner of:
  ```ts
  const reducedMotion = useReducedHexMotion();
  const motionProfile = resolveHexMotionProfile({ quality: profile, reducedMotion });
  ```
- Child components receive resolved profiles via props.
- Scene decorative loops should early-return or scale to zero when document is hidden/reduced motion as appropriate.

- [ ] **Step 1: Write RED ownership/accessibility contracts**

```ts
const world = await source('../components/hex-world/HexWorld3D.tsx');
assert.match(world, /useReducedHexMotion/);
assert.match(world, /resolveHexMotionProfile/);
assert.equal((`${world}`.match(/matchMedia/g) ?? []).length, 0);
```

Search touched scene components and assert they do not independently call `matchMedia`.

Add acceptance assertion that click-to-place contract still exists and there is still no `Place` confirm button.

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-premium-motion-contract.test.ts tests/hex-render-budget.test.ts tests/hex-phase2-acceptance.test.ts tests/hex-builder-ui-contract.test.ts
```

Expected: FAIL until ownership is centralized.

- [ ] **Step 3: Centralize profile wiring**

Resolve quality + reduced motion once in `HexWorld3D`. Pass the same `motionProfile` to camera, tiles, selection, ambient decor, water, sky, buildings, ghost, placement effects.

Do not introduce context unless prop threading becomes genuinely wider than these Hex scene modules; props are preferred for this phase.

Use `document.visibilityState === 'hidden'` only as a cheap early-return condition inside long-running decorative frame loops; do not add a global event bus.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-premium-motion-contract.test.ts tests/hex-render-budget.test.ts tests/hex-phase2-acceptance.test.ts tests/hex-builder-ui-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world lib/hex-world tests/hex-premium-motion-contract.test.ts tests/hex-render-budget.test.ts tests/hex-phase2-acceptance.test.ts tests/hex-builder-ui-contract.test.ts
git commit -m "feat: centralize accessible hex motion"
```

---

### Task 12: Full Regression, Visual QA, PR, and Production Release Gate

**Files:**
- Modify tests only if a discovered bug requires a RED regression first.
- Do not weaken assertions to make CI green.

**Interfaces:**
- No new runtime interfaces; this task verifies the complete system.

- [ ] **Step 1: Run the complete pure Hex suite**

```bash
PURE_HEX_TESTS=$(find tests -maxdepth 1 -name 'hex-*.test.ts' ! -name 'hex-world-undo-db.test.ts' -print | sort | tr '\n' ' ')
node --import tsx --test $PURE_HEX_TESTS tests/garden-hex-integration.test.ts tests/production-startup.test.ts
```

Expected: PASS, zero failures.

- [ ] **Step 2: Run authoritative Undo DB + Redis integration**

With local Postgres matching CI and Redis 7:

```bash
REDIS_URL=redis://127.0.0.1:6379 node --import tsx --test tests/hex-world-undo-db.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run existing farm preservation regression**

```bash
node --import tsx --test tests/family-farm-game.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run lint and production build**

```bash
npm run lint
npm run build
```

Expected: both exit 0.

- [ ] **Step 5: Manual visual acceptance on desktop High**

Verify this exact flow:

```text
Open Garden
→ island is immediately visible
→ opening camera settles softly and can be interrupted
→ clouds drift independently
→ vegetation does not sway in lockstep
→ pond ripples are asynchronous and restrained
→ Build
→ choose component
→ hover valid and invalid cells
→ camera does not chase hover
→ valid hex click places immediately
→ confirmed building drops/settles only after server response
→ Undo
→ select building
→ smooth selection lift
→ Rotate
→ smooth 60° rotation after server confirmation
→ Move
→ source remains authoritative until Move here
→ Confirm Move
→ target settles
→ Expand
→ server success
→ mist + deterministic stagger rise
→ camera reframes only if needed
→ Reset View
→ switch Land during/after an action
→ no stale effect/snapshot leaks into new Land
```

- [ ] **Step 6: Manual reduced-motion acceptance**

Enable OS/browser reduced motion and verify:

```text
No cinematic opening travel
No placement drop/overshoot
No ghost bob
Vegetation/cloud decorative motion effectively absent or minimal
State colors, selection, valid/invalid feedback remain clear
Camera still reaches correct framing quickly
Click-to-place/Undo/Move/Expand semantics unchanged
```

- [ ] **Step 7: Manual Mobile acceptance**

At ~390px viewport / DPR 3 verify resolved Mobile profile:

```text
No horizontal overflow
Toolbar/placement controls remain safe-area aware
No optional water glints
Particle count is visibly restrained
World remains readable
Touch click-to-place remains reliable
Orbit/pinch does not accidentally place during camera gestures
```

If gesture conflict is discovered, write a failing regression before changing pointer behavior.

- [ ] **Step 8: Open PR with release checklist**

PR body must state:

```text
- No DB/API schema changes
- Click-to-place preserved
- Server-confirmed motion only
- Reduced-motion supported
- High/Medium/Mobile render budgets preserved
- No mandatory heavy post-processing
- Pure Hex tests PASS
- Redis Undo integration PASS
- Family Farm regression PASS
- Lint PASS
- Production build PASS
```

- [ ] **Step 9: Review changed files for architecture violations**

Reject/repair before merge if any of these appear:

```text
EffectComposer / Bloom / DepthOfField / MeshReflectorMaterial
new dynamic point lights per object
remote mandatory model URLs
per-particle React component loops
network calls inside visual scene modules
DB/API schema changes
Place confirmation button restored
Build camera tied to hover anchor
independent matchMedia calls scattered across scene files
```

- [ ] **Step 10: Merge only exact verified head**

Use squash merge with expected head SHA after all GitHub Actions are green.

- [ ] **Step 11: Verify Railway production**

Verify Railway deployment source is the merged `main` commit. Check build and runtime logs for:

```text
npm/Next production build success
npx prisma migrate deploy reports no destructive migration requirement
Next server starts successfully
/api/health passes
Redis service reachable for Undo
no destructive cleanup command
```

Because this feature has no schema migration, production migration output should report existing migrations as already applied rather than introducing a new graphics-related migration.

- [ ] **Step 12: Commit any final test-only release guard if needed, re-run full verification, then merge**

Any discovered bug must follow RED → GREEN; do not patch after the final gate without re-running Tasks 12 Steps 1–4.
