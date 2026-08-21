# Narinyland Premium Graphics & Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing `/garden` floating HexWorld into a more premium, alive miniature-diorama experience with richer materials, restrained world motion, tactile placement feedback, stable camera behavior, and preserved mobile performance.

**Architecture:** Extend the existing Phase 2 scene modules rather than rewriting the renderer. Keep frame animation inside focused Three scene components via `useFrame`, refs, deterministic helpers, and semantic visual events from `HexBuildController`; keep server authority, click-to-place, Undo, Land isolation, persistence, and existing backend APIs unchanged.

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
- `lib/hex-world/visual-events.ts` — typed presentation-only confirmed visual events shared between controller and scene.
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

Create `tests/hex-motion.test.ts`:

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

test('motion bucket rejects an invalid bucket count', () => {
  assert.throws(() => deterministicMotionBucket('tree:0:0', 0), /bucketCount/);
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

Extend `tests/hex-quality.test.ts` with high/mobile assertions:

```ts
assert.equal(profile.vegetationMotion, 'full');
assert.equal(profile.placementParticleCount, 20);
assert.equal(profile.waterGlintCount, 3);
```

and:

```ts
assert.equal(profile.vegetationMotion, 'minimal');
assert.equal(profile.waterGlintCount, 0);
assert.ok(profile.placementParticleCount <= 4);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-motion.test.ts tests/hex-quality.test.ts
```

Expected: FAIL because `lib/hex-world/motion.ts` and the new quality fields do not exist.

- [ ] **Step 3: Implement minimal motion module and quality fields**

Use a stable FNV-style integer hash similar to existing particle seeding. Phase is `(hash >>> 0) / 0xffffffff * Math.PI * 2`. `deterministicMotionBucket` must throw for `bucketCount < 1` and return a value in `[0, bucketCount)`.

Implement:

```ts
export function expSmoothingAlpha(delta: number, response: number) {
  return 1 - Math.exp(-Math.max(0, delta) * Math.max(0, response));
}
```

Normal profile values:

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

Reduced profile:

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

`useReducedHexMotion()` subscribes to `window.matchMedia('(prefers-reduced-motion: reduce)')`, reads `.matches`, handles `change`, and removes the listener on unmount.

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

### Task 2: Premium Opening Camera and Build-Stable Framing

**Files:**
- Modify: `lib/hex-world/camera.ts`
- Modify: `components/hex-world/HexDioramaCamera.tsx`
- Modify: `tests/hex-camera.test.ts`
- Create: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- Change build helper to:
  ```ts
  export function getBuildCameraPose(bounds: HexIslandBounds, aspect: number): HexCameraPose;
  ```
- Add:
  ```ts
  export function getOpeningCameraPose(overview: HexCameraPose): HexCameraPose;
  ```
- `HexDioramaCamera` consumes `motionProfile: HexMotionProfile` and `reducedMotion: boolean`.

- [ ] **Step 1: Write RED camera tests**

In `tests/hex-camera.test.ts`, add explicit sample data locally:

```ts
import type { HexTileDTO } from '@/lib/hex-world/types';

const motionTiles = [
  { q: 0, r: 0, height: 0, unlocked: true, terrainType: 'grass' },
  { q: 4, r: -2, height: 0.15, unlocked: true, terrainType: 'grass' },
] as HexTileDTO[];

test('build framing is derived from island bounds instead of hover anchor', () => {
  const bounds = getUnlockedIslandBounds(motionTiles);
  const pose = getBuildCameraPose(bounds, 16 / 9);
  assert.deepEqual(pose.target, getOverviewCameraPose(bounds, 16 / 9).target);
});

test('opening pose starts wider and higher than final overview', () => {
  const overview = getOverviewCameraPose(getUnlockedIslandBounds(motionTiles), 16 / 9);
  const opening = getOpeningCameraPose(overview);
  assert.ok(opening.distance > overview.distance);
  assert.ok(opening.position[1] > overview.position[1]);
});
```

Create `tests/hex-premium-motion-contract.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('build camera does not chase hovered placement anchor', async () => {
  const camera = await source('../components/hex-world/HexDioramaCamera.tsx');
  const math = await source('../lib/hex-world/camera.ts');
  assert.doesNotMatch(math, /function getBuildCameraPose\([^)]*anchor/);
  assert.match(camera, /motionProfile/);
  assert.match(camera, /getOpeningCameraPose/);
});
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-camera.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because current Build camera accepts `anchor`, opening pose does not exist, and camera has no motion profile.

- [ ] **Step 3: Implement stable Build framing and opening reveal**

Build pose starts from Overview and tightens slightly without changing target per hover:

```ts
export function getBuildCameraPose(bounds: HexIslandBounds, aspect: number): HexCameraPose {
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
}
```

Opening pose scales the overview camera vector away from target by about `1.12` and adds about `0.8` world units to Y. `distance` must be `overview.distance * 1.12`.

On first mount:
- reduced motion: set final pose immediately;
- normal motion: set camera to opening pose, controls target to final overview target, leave `scriptedMotion.current = true`, and interpolate into final pose.

Use `expSmoothingAlpha(delta, motionProfile.cameraResponse)` instead of hard-coded `5.2`. User orbit `onStart` still cancels scripted travel.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-camera.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/camera.ts components/hex-world/HexDioramaCamera.tsx tests/hex-camera.test.ts tests/hex-premium-motion-contract.test.ts
git commit -m "feat: refine premium hex camera"
```

---

### Task 3: Terrain Tone Variation, Hover Lift, and Build-State Pulse

**Files:**
- Modify: `components/hex-world/HexTileInstances.tsx`
- Modify: `lib/hex-world/rendering.ts`
- Modify: `tests/hex-world-rendering.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- Add:
  ```ts
  export function getTerrainDisplayColor(input: {
    terrainType: HexTerrainType;
    q: number;
    r: number;
    state: 'normal' | 'hovered' | 'selected' | 'valid' | 'invalid' | 'expansion';
    materialVariation: 'full' | 'reduced';
  }): string;
  ```
- `HexTileInstances` consumes `motionProfile: HexMotionProfile` and `profile: HexQualityProfile`.

- [ ] **Step 1: Write RED tests**

Add to `tests/hex-world-rendering.test.ts`:

```ts
import { getTerrainDisplayColor } from '@/lib/hex-world/rendering';

test('terrain display variation is deterministic and subtle', () => {
  const a = getTerrainDisplayColor({ terrainType: 'grass', q: 2, r: 3, state: 'normal', materialVariation: 'full' });
  const b = getTerrainDisplayColor({ terrainType: 'grass', q: 2, r: 3, state: 'normal', materialVariation: 'full' });
  const c = getTerrainDisplayColor({ terrainType: 'grass', q: 8, r: -3, state: 'normal', materialVariation: 'full' });
  assert.equal(a, b);
  assert.notEqual(a, c);
});
```

Add source contract:

```ts
const tiles = await source('../components/hex-world/HexTileInstances.tsx');
assert.match(tiles, /hoverResponse/);
assert.match(tiles, /InstancedMesh/);
assert.doesNotMatch(tiles, /<mesh\s+key=\{.*tile/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-world-rendering.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because color helper and hover interpolation do not exist.

- [ ] **Step 3: Implement deterministic material color and targeted instance animation**

Keep one instanced mesh per terrain group. Tone variation uses stable q/r hashing and stays within the spec envelopes: grass ±4–7%, soil ±4–6%, stone ±3–5% lightness/value. Interactive state colors override normal variation.

Hover target lift is `0.055`; selected target lift `0.035`; normal target `0`. Use `expSmoothingAlpha(delta, motionProfile.hoverResponse)`.

Do not animate every normal tile indefinitely. Keep frame work active only while a batch has hover/selection/rise state that is still converging.

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
- `HexSelectionEffects` consumes `motionProfile` and `invalidPulseNonce`.
- Ghost preview uses `motionProfile.ghostBobScale` and retains existing `ghost` material semantics.

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

Selection ring uses one group/material ref. Pulse only opacity/scale in a restrained range, e.g. scale `1 → 1.025`; invalid pulse may be slightly faster. Use `useFrame`, not React state per frame.

Move ghost preview into a focused internal `AnimatedBuildingPreview` component in `HexWorld3D.tsx`, or a new file only if it exceeds ~50 lines. Apply:

```ts
const y = baseY + Math.sin(clock.elapsedTime * 1.6 + phase) * 0.02 * motionProfile.ghostBobScale;
```

Invalid ghost keeps muted coral tint through existing ghost material path; no dynamic light.

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

### Task 5: Smooth Building Selection, Rotation, and Confirmed Visual Events

**Files:**
- Create: `lib/hex-world/visual-events.ts`
- Modify: `components/hex-world/HexBuildings.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `tests/hex-builder-ui-contract.test.ts`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- Create shared type:
  ```ts
  import type { HexCoord } from './types';

  export type HexConfirmedVisualEvent =
    | { kind: 'placed'; buildingId: string; coord: HexCoord; nonce: number }
    | { kind: 'moved'; buildingId: string; coord: HexCoord; nonce: number }
    | { kind: 'rotated'; buildingId: string; nonce: number }
    | { kind: 'expanded'; coords: HexCoord[]; nonce: number }
    | null;
  ```
- `HexBuildController` owns `visualEvent: HexConfirmedVisualEvent` and `visualEventNonceRef`.
- `HexBuildings` consumes `visualEvent`, `motionProfile`, and `reducedMotion`.

- [ ] **Step 1: Write RED contract tests**

In `tests/hex-builder-ui-contract.test.ts`, add:

```ts
assert.match(controller, /new Set\(snapshot\.buildings\.map\(\(building\) => building\.id\)\)/);
assert.match(controller, /confirmed\.snapshot\.buildings\.find/);
assert.match(controller, /setVisualEvent/);
```

In premium contract test:

```ts
const buildings = await source('../components/hex-world/HexBuildings.tsx');
const events = await source('../lib/hex-world/visual-events.ts').catch(() => '');
assert.match(buildings, /useFrame/);
assert.match(buildings, /visualEvent/);
assert.match(events, /HexConfirmedVisualEvent/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-builder-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because shared event type and animated building wrapper do not exist.

- [ ] **Step 3: Implement semantic events after server confirmation**

For Place, capture IDs before request:

```ts
const previousIds = new Set(snapshot.buildings.map((building) => building.id));
```

After confirmed success, derive:

```ts
const placed = confirmed.snapshot.buildings.find((building) => !previousIds.has(building.id));
```

Only then set `{ kind: 'placed', buildingId: placed.id, coord, nonce }`.

Move/Rotate set their visual events only after their server calls succeed. Expansion event is set in `handleExpansionConfirmed`, also only after server success. Land-switch effect sets visual event to `null`.

- [ ] **Step 4: Implement smooth building transform ownership**

Create focused `AnimatedHexBuilding` inside `HexBuildings.tsx`, with refs for current position/scale/yaw. Selection uses `motionProfile.selectResponse`.

For `placed`, initialize the visual at `targetY + 0.65` unless reduced motion and settle over `placementDurationMs`. For `moved`, use a smaller `+0.25` settle. Rotation interpolates the shortest expected 60° transition over `rotationDurationMs`.

Do not delay snapshot updates: persisted state updates immediately after confirmed response; motion is presentation only.

- [ ] **Step 5: Run GREEN**

```bash
node --import tsx --test tests/hex-builder-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-undo-ui-contract.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/hex-world/visual-events.ts components/hex-world/HexBuildings.tsx components/hex-world/HexBuildController.tsx components/hex-world/HexWorld3D.tsx tests/hex-builder-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-undo-ui-contract.test.ts
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
- One `points` draw call for transient Place/Move particles.
- Invalid clicks increment `invalidPulseNonce` but do not create a confirmed event and do not call API.

- [ ] **Step 1: Write RED render-budget tests**

```ts
const placement = await source('../components/hex-world/HexPlacementEffects.tsx').catch(() => '');
assert.equal((placement.match(/<points\b/g) ?? []).length, 1);
assert.doesNotMatch(placement, /hexWorldAPI|fetch\(|prisma/);
```

Premium contract:

```ts
const world = await source('../components/hex-world/HexWorld3D.tsx');
const controller = await source('../components/hex-world/HexBuildController.tsx');
assert.match(world, /HexPlacementEffects/);
assert.match(controller, /invalidPulseNonce/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because placement effect module and invalid pulse nonce do not exist.

- [ ] **Step 3: Implement invalid pulse without mutation**

Inside `confirmPlacementAt(coord)`, perform the existing client validation. On `!placement.ok`, increment `invalidPulseNonce` and return before `placementLockRef.current = true` or `hexWorldAPI.place`.

- [ ] **Step 4: Implement bounded effect pool**

Allocate one `Float32Array` sized for High maximum (`20 * 3`). On confirmed Place/Move event, deterministically populate `quality.placementParticleCount` points around the action coordinate. Animate one points material opacity/size over event lifetime. Do not create one React element per particle.

For `expanded`, this component may later render a low-count mist group in Task 10; keep the event switch exhaustive.

- [ ] **Step 5: Run GREEN**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-builder-ui-contract.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

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
- `HexAmbientDecor` consumes `profile: HexQualityProfile` and `motionProfile: HexMotionProfile`.
- Trees/flowers/sprouts use `deterministicMotionBucket(key, bucketCount)`.
- Rocks/paths remain static.

- [ ] **Step 1: Write RED contracts**

```ts
const ambient = await source('../components/hex-world/HexAmbientDecor.tsx');
assert.match(ambient, /deterministicMotionBucket/);
assert.match(ambient, /vegetationMotion/);
assert.match(ambient, /motionProfile/);
assert.match(ambient, /rocks/);
assert.match(ambient, /paths/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because ambient decor is static and has no quality-aware buckets.

- [ ] **Step 3: Implement phase-bucket vegetation**

Use 4 deterministic motion buckets for High, 2 for Medium, and 1 minimal/static bucket for Mobile. Prefer grouping instanced batches by bucket so each bucket can rotate/translate as one parent rather than rebuilding every instance every frame.

Tree canopy amplitude: roughly `0.5°–1.5°`; trunk much smaller. Flowers/sprouts lower amplitude. Rocks and paths stay outside animated groups.

No `Math.random()` during render.

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
- `HexSkyAtmosphere` consumes `motionProfile` and existing `profile`.
- Each bounded cloud layer receives a separate deterministic drift multiplier.
- Exactly one directional light remains.
- Model material changes remain local Three materials; no mandatory remote model loading.

- [ ] **Step 1: Write RED contracts**

```ts
const sky = await source('../components/hex-world/HexSkyAtmosphere.tsx');
const lighting = await source('../components/hex-world/HexWorldLighting.tsx');
assert.match(sky, /cloudParallaxScale/);
assert.match(sky, /motionProfile/);
assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
assert.doesNotMatch(`${sky}\n${lighting}`, /EffectComposer|Bloom|DepthOfField|volumetric/i);
```

Keep existing `tests/hex-building-art.test.ts` exact catalog/local-dispatch assertions and add no remote URL requirement.

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-building-art.test.ts tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL on new cloud/motion profile contract.

- [ ] **Step 3: Implement bounded parallax and material tune**

Retain current cloud count. Split cloud meshes into their existing layer identity and move layers at separate horizontal rates; add tiny vertical drift. Scale by `profile.cloudParallaxScale * motionProfile.ambientScale`. Reduced motion naturally drives ambient scale to zero.

Tune lighting without adding lights: warm directional key, slightly cooler hemisphere fill, restrained contact shadow. Keep emissive-only warm windows; no point lights.

Adjust model material colors/roughness for coherent cream/terracotta/moss/warm wood/stone. Do not add shader dependencies.

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
- `HexWaterSurface` consumes `motionProfile` and extended quality profile.
- Uses deterministic phase buckets.
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

Split water tiles into 3 motion buckets High, 2 Medium, 1 Mobile. Apply tiny Y/scale or opacity variation per bucket, not arbitrary per-tile frame updates. Keep translucent turquoise, moderately high roughness, `depthWrite={false}`.

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
- Existing `newlyAddedKeys` remains the server-confirmed tile trigger.
- `HexConfirmedVisualEvent` uses `{ kind: 'expanded', coords, nonce }` for mist effects.
- Stagger order is deterministic from sorted `(q,r)`.
- Expansion remains non-undoable.

- [ ] **Step 1: Write RED expansion contracts**

In `tests/hex-premium-motion-contract.test.ts` add:

```ts
test('confirmed expansion uses deterministic stagger and visual-only mist', async () => {
  const tiles = await source('../components/hex-world/HexTileInstances.tsx');
  const effects = await source('../components/hex-world/HexPlacementEffects.tsx');
  const controller = await source('../components/hex-world/HexBuildController.tsx');
  assert.match(tiles, /stagger/i);
  assert.match(effects, /expanded|expansion/i);
  assert.match(controller, /setUndo\(null\)/);
  assert.doesNotMatch(controller, /undo.*expansion|expansion.*undo/i);
});
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-expansion-ui-contract.test.ts tests/hex-premium-motion-contract.test.ts
```

Expected: FAIL because rise animation has no deterministic per-tile stagger/mist contract.

- [ ] **Step 3: Implement confirmed expansion sequence**

After server success, sort new coords by `q` then `r`; derive each tile index delay in `0–180ms`. Existing rise uses that delay plus the remaining `motionProfile.expansionDurationMs` for ease-out.

`HexPlacementEffects` handles the `expanded` event with a low-count mist/dust effect at expansion edge. Existing bounds-aware `shouldReframeForCoords` remains the only reframe decision; no reframe when new tiles remain within safe bounds.

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

### Task 11: Central Reduced-Motion, Quality, and Visibility Wiring

**Files:**
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: scene components touched above to receive the resolved profiles rather than querying media state independently
- Modify: `tests/hex-premium-motion-contract.test.ts`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/hex-phase2-acceptance.test.ts`
- Modify: `tests/hex-builder-ui-contract.test.ts`

**Interfaces:**
- `HexWorld3D` is the single owner of:
  ```ts
  const reducedMotion = useReducedHexMotion();
  const motionProfile = resolveHexMotionProfile({ quality: profile, reducedMotion });
  ```
- Child components receive `profile` / `motionProfile` via props.
- Decorative frame loops may early-return when `document.visibilityState === 'hidden'`.

- [ ] **Step 1: Write RED ownership/accessibility contracts**

```ts
test('world resolves reduced motion once and children consume the resolved profile', async () => {
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  const childPaths = [
    '../components/hex-world/HexDioramaCamera.tsx',
    '../components/hex-world/HexTileInstances.tsx',
    '../components/hex-world/HexSelectionEffects.tsx',
    '../components/hex-world/HexAmbientDecor.tsx',
    '../components/hex-world/HexSkyAtmosphere.tsx',
    '../components/hex-world/HexWaterSurface.tsx',
    '../components/hex-world/HexBuildings.tsx',
    '../components/hex-world/HexPlacementEffects.tsx',
  ];
  assert.match(world, /useReducedHexMotion/);
  assert.match(world, /resolveHexMotionProfile/);
  for (const path of childPaths) {
    const child = await source(path);
    assert.doesNotMatch(child, /matchMedia\(/);
  }
});
```

Extend `tests/hex-builder-ui-contract.test.ts` to keep the click-to-place assertions and `assert.doesNotMatch(placementBar, />Place</)`.

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-premium-motion-contract.test.ts tests/hex-render-budget.test.ts tests/hex-phase2-acceptance.test.ts tests/hex-builder-ui-contract.test.ts
```

Expected: FAIL until profile ownership is centralized.

- [ ] **Step 3: Centralize profile wiring**

Resolve quality + reduced motion once in `HexWorld3D`. Pass `motionProfile` to camera, tiles, selection, ambient decor, water, sky, buildings, ghost, placement effects. Pass quality profile only where visual budget decisions are required.

Do not add React Context unless prop threading exceeds these current scene modules; props are the default for this phase.

In long-running decorative loops, use a cheap hidden-page early return if needed; do not add a global event bus.

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
- Modify tests only when a discovered issue is first reproduced with a RED regression.
- Never weaken an assertion to make CI green.

**Interfaces:**
- No new runtime interfaces; this task verifies the complete feature.

- [ ] **Step 1: Run complete pure Hex suite**

```bash
PURE_HEX_TESTS=$(find tests -maxdepth 1 -name 'hex-*.test.ts' ! -name 'hex-world-undo-db.test.ts' -print | sort | tr '\n' ' ')
node --import tsx --test $PURE_HEX_TESTS tests/garden-hex-integration.test.ts tests/production-startup.test.ts
```

Expected: PASS, zero failures.

- [ ] **Step 2: Run authoritative Undo DB + Redis integration**

With a local Postgres matching CI and Redis 7:

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

- [ ] **Step 5: Desktop High visual acceptance**

Verify exactly:

```text
Open Garden
→ island visible immediately
→ opening camera settles softly and is interruptible
→ clouds drift independently
→ vegetation does not move in lockstep
→ pond motion is asynchronous and restrained
→ Build
→ choose component
→ hover valid/invalid cells
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

- [ ] **Step 6: Reduced-motion visual acceptance**

Enable reduced motion and verify:

```text
No cinematic opening travel
No placement drop/overshoot
No ghost bob
Vegetation/cloud decorative motion absent or minimal
State colors and valid/invalid feedback remain clear
Camera reaches correct framing quickly
Click-to-place/Undo/Move/Expand semantics unchanged
```

- [ ] **Step 7: Mobile visual acceptance**

At approximately 390px viewport / DPR 3 verify Mobile profile:

```text
No horizontal overflow
Safe-area controls remain usable
No optional water glints
Particle count restrained
World remains readable
Touch click-to-place reliable
Orbit/pinch does not accidentally place during camera gestures
```

If a gesture conflict appears, first write a failing regression before modifying pointer behavior.

- [ ] **Step 8: Open PR with release checklist**

PR body must contain:

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

Reject/repair before readiness if any appear:

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

- [ ] **Step 10: Integrate only after owner approval**

When the invoking user explicitly authorizes merge, squash-merge only the exact verified PR head SHA. If merge is not authorized, stop at a ready PR and report verification evidence.

- [ ] **Step 11: Verify Railway only after merge/deploy authorization**

For an authorized production deploy, verify Railway source is the merged `main` commit. Check build/runtime logs for:

```text
Next production build success
npx prisma migrate deploy reports existing migrations already applied
Next server starts successfully
/api/health passes
Redis remains reachable for Undo
no destructive cleanup command
```

This graphics pass introduces no migration; any new graphics-related Prisma migration is a scope violation.

- [ ] **Step 12: Re-run gates after any late fix**

Any issue discovered after Steps 1–4 must follow RED → GREEN and then repeat Steps 1–4 before the feature can be called verified.
