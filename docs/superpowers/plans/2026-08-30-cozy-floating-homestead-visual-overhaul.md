# Cozy Floating Homestead — Floating Island Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Narinyland’s normal World view from a shallow floating terrain slab into a substantial cozy fantasy homestead island with a deep multi-spire rock core, deterministic surrounding debris, below-island atmosphere, stronger top/underside separation, and camera framing that clearly reveals the island volume.

**Architecture:** Keep the overhaul presentation-only and deterministic. Derive the island body from the existing natural-terrain boundary plus world seed; keep `HexWorld3D.tsx` as an orchestrator; put procedural debris composition in a pure helper; reuse existing local PBR assets, quality buckets, R3F/Drei scene layers, and authoritative transparent tile proxy. Do not change gameplay, persistence, schemas, expansion authority, or person traversal.

**Tech Stack:** Next.js 16, React 19, TypeScript, Three.js 0.182, `@react-three/fiber` 9.5, `@react-three/drei` 10.7, Node test runner + `tsx`, Prisma/Postgres, Redis integration CI, Railway production.

**Spec:** `docs/superpowers/specs/2026-08-30-cozy-floating-homestead-visual-overhaul-design.md`

## Global Constraints

- Rendering-only change: no Prisma schema, save format, API, HexWorld authority, Homestead Life state, expansion rules, building footprints, placement validation, tile picking, selection, or movement authority changes.
- Preserve `HexTileInstances presentation="proxy"` as the authoritative invisible picking surface.
- Reuse the existing local soil/cliff PBR texture sets and scanned rock-set model; no runtime external asset fetches.
- Keep normal and roughness maps active on the island body; do not replace PBR with flat or unlit color.
- Preserve exactly one primary directional shadow owner and avoid mandatory Bloom, DOF, SSAO, SSR, planar reflection, or other heavyweight post-processing.
- Keep existing quality names `high`, `medium`, and `mobile`; mobile must retain the deep primary island silhouette while reducing secondary debris/detail.
- No per-frame island mesh regeneration. Geometry and placement generation must be deterministic and memoized from stable inputs.
- World mode must not create an island-scale support-plane cue below the island.
- Build mode stays operational and more top-down than World overview; manual OrbitControls behavior remains authoritative after user interaction.
- Waterfall simulation, physics, destructible geometry, dynamic deformation, and new gameplay islands are outside this implementation.
- Every implementation task follows RED → verify RED → GREEN → verify GREEN → commit.

---

## File Structure

### New files

- `lib/hex-world/floating-island-composition.ts` — pure deterministic floating-fragment placement from island bounds, seed, and quality.
- `tests/hex-floating-island-composition.test.ts` — deterministic debris composition and quality-budget tests.
- `tests/hex-floating-island-presentation.test.ts` — source-level contracts for PBR layering, atmosphere, shadow ownership, scene wiring, and no gameplay authority leakage.

### Main modified files

- `lib/hex-world/island-boundary.ts`
- `components/hex-world/pbr/HexPBRCliff.tsx`
- `components/hex-world/pbr/HexPBRFloatingFragments.tsx`
- `components/hex-world/HexWorld3D.tsx`
- `components/hex-world/HexSkyAtmosphere.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `lib/hex-world/camera.ts`
- `tests/hex-island-boundary.test.ts`
- `tests/hex-naturalistic-world-contract.test.ts`
- `tests/hex-pbr-cutover.test.ts`
- `tests/hex-pbr-environment.test.ts`
- `tests/hex-camera.test.ts`
- `tests/hex-render-budget.test.ts`

---

## Task 1: Deep Multi-Strata Island Core and Regional Spires

**Files:**
- Modify: `lib/hex-world/island-boundary.ts`
- Modify: `tests/hex-island-boundary.test.ts`
- Modify: `tests/hex-naturalistic-world-contract.test.ts`

**Interfaces:**

Change the material groups to three vertical zones:

```ts
export type IslandCliffMaterial = 'soil' | 'upperRock' | 'lowerRock';
```

Use a deterministic per-boundary-vertex profile shaped by shared regional spire sectors:

```ts
type CliffVertexProfile = {
  grassOverhang: number;
  soilLipDepth: number;
  upperRockOffset: number;
  midRockDepth: number;
  lowerTaper: number;
  spireDepth: number;
  erosionJitter: number;
  spireInfluence: number;
};
```

The top vertex remains exactly on the natural-terrain boundary. The soil band moves slightly inward beneath that edge so the unchanged grass top visually overhangs it. Lower bands descend substantially farther and use several seed-derived angular regions so neighboring vertices share broad spire influence instead of independent noise.

- [ ] **Step 1: Extend geometry tests with the new silhouette contract**

Add tests to `tests/hex-island-boundary.test.ts` that require:

```ts
test('floating island core is substantially deeper than the old slab profile', () => {
  const terrain = buildNaturalTerrainMesh([
    tile(0, 0, 0.15), tile(1, 0, 0.1), tile(0, 1, 0.05),
    tile(-1, 1, 0.08), tile(-1, 0, 0.02), tile(0, -1, 0.06),
  ], 'deep-island');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'deep-island');
  const ys = cliff.positions.filter((_, index) => index % 3 === 1);
  assert.ok(Math.min(...ys) < -4, `expected substantial underside depth, got ${Math.min(...ys)}`);
  assert.ok(Math.min(...ys) > -7.5, 'island depth must remain bounded');
});

test('lower silhouette has several regional depth influences instead of one equal-depth ring', () => {
  const terrain = buildNaturalTerrainMesh([
    tile(0, 0), tile(1, 0), tile(0, 1), tile(-1, 1), tile(-1, 0), tile(0, -1), tile(1, -1),
  ], 'regional-spires');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'regional-spires');
  const lower = [] as number[];
  for (let index = 1; index < cliff.positions.length; index += 3) {
    const y = cliff.positions[index];
    if (y < -2.5) lower.push(Number(y.toFixed(1)));
  }
  assert.ok(new Set(lower).size >= 3, 'lower core should contain several coherent depth bands');
});

test('cliff exposes soil upper-rock and lower-rock material groups', () => {
  const terrain = buildNaturalTerrainMesh([tile(0, 0)], 'groups');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'groups');
  assert.deepEqual(cliff.groups.map((group) => group.material), ['soil', 'upperRock', 'lowerRock']);
});
```

Keep the existing deterministic, finite, non-mutating, top-boundary, and inward-taper tests.

Update `tests/hex-naturalistic-world-contract.test.ts` so the boundary contract looks for the new profile vocabulary:

```ts
assert.match(boundary, /grassOverhang/);
assert.match(boundary, /soilLipDepth/);
assert.match(boundary, /midRockDepth/);
assert.match(boundary, /spireDepth/);
assert.match(boundary, /spireInfluence/);
assert.match(boundary, /lowerTaper/);
assert.doesNotMatch(boundary, /Math\.random/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-island-boundary.test.ts tests/hex-naturalistic-world-contract.test.ts
```

Expected: FAIL because the current mesh has only `soil`/`rock`, the old `rockWallDepth`, and insufficient depth.

- [ ] **Step 3: Implement regional profile generation**

Keep the stable hash approach already used in `island-boundary.ts`. Add a stable angular sector helper so neighboring vertices share spire influence:

```ts
function spireRegion(point: [number, number, number], center: [number, number]): number {
  const angle = Math.atan2(point[2] - center[1], point[0] - center[0]);
  const normalized = (angle + Math.PI) / (Math.PI * 2);
  return Math.min(4, Math.floor(normalized * 5));
}
```

Derive the profile from the vertex key plus the region key. Use bounded values in these ranges:

```ts
grassOverhang: 0.05 .. 0.16
soilLipDepth: 0.22 .. 0.42
upperRockOffset: -0.08 .. 0.1
midRockDepth: 1.2 .. 2.0
lowerTaper: 0.28 .. 0.55
spireDepth: 2.2 .. 4.1
spireInfluence: 0.35 .. 1
local erosion jitter: approximately -0.12 .. 0.12
```

Construct four vertical rings per boundary edge:

1. terrain boundary top,
2. inset soil base,
3. mid rock shoulder,
4. deep lower/spire contour.

Append triangles in contiguous material group order: all soil faces first, then upper-rock faces, then lower-rock faces. Preserve finite UVs and existing `colors` output length. The deep contour must taper inward overall but not converge to a single center point.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-island-boundary.test.ts tests/hex-naturalistic-world-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/island-boundary.ts tests/hex-island-boundary.test.ts tests/hex-naturalistic-world-contract.test.ts
git commit -m "feat: sculpt deep floating island core"
```

---

## Task 2: Three-Layer PBR Cliff Readability

**Files:**
- Modify: `components/hex-world/pbr/HexPBRCliff.tsx`
- Create: `tests/hex-floating-island-presentation.test.ts`
- Modify: `tests/hex-pbr-environment.test.ts`

**Interfaces:**

`HexPBRCliff` continues to accept:

```ts
{ tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile }
```

It renders one mesh with three material groups. Soil uses the soil texture bundle. Upper and lower rock use the existing local cliff texture bundle with different bounded tint/normal response.

- [ ] **Step 1: Write RED PBR layer contracts**

Create `tests/hex-floating-island-presentation.test.ts` with source-level checks:

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('floating island cliff renders three PBR geological layers', async () => {
  const cliff = await source('components/hex-world/pbr/HexPBRCliff.tsx');
  assert.equal((cliff.match(/<meshStandardMaterial\b/g) ?? []).length, 3);
  assert.match(cliff, /material === 'soil'/);
  assert.match(cliff, /material === 'upperRock'/);
  assert.match(cliff, /material === 'lowerRock'/);
  assert.ok((cliff.match(/normalMap=/g) ?? []).length >= 3);
  assert.ok((cliff.match(/roughnessMap=/g) ?? []).length >= 3);
  assert.doesNotMatch(cliff, /meshBasicMaterial|https?:\/\/|Math\.random/);
});
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-floating-island-presentation.test.ts tests/hex-pbr-environment.test.ts
```

Expected: FAIL because the current cliff has only two PBR materials.

- [ ] **Step 3: Implement three material slots and deeper-scale UV tuning**

Map shell groups using:

```ts
const materialIndex = { soil: 0, upperRock: 1, lowerRock: 2 } as const;
for (const group of shell.groups) next.addGroup(group.start, group.count, materialIndex[group.material]);
```

Keep one owned soil bundle and one owned rock bundle; reuse the rock bundle across both rock materials and dispose it once. Tune repeats for the larger vertical body, approximately:

```ts
const CLIFF_SOIL_REPEAT = [2.1, 3.0] as const;
const CLIFF_ROCK_REPEAT = [2.7, 4.2] as const;
```

Use bounded material tuning such as:

```tsx
<meshStandardMaterial attach="material-0" ... color="#94745d" normalScale={new THREE.Vector2(0.52, 0.52)} roughness={0.98} />
<meshStandardMaterial attach="material-1" ... color="#8f918d" normalScale={new THREE.Vector2(0.74, 0.74)} roughness={0.96} />
<meshStandardMaterial attach="material-2" ... color="#727b80" normalScale={new THREE.Vector2(0.84, 0.84)} roughness={0.98} />
```

Do not introduce a new asset source or extra shadow-casting light.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-floating-island-presentation.test.ts tests/hex-pbr-environment.test.ts tests/hex-naturalistic-world-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/pbr/HexPBRCliff.tsx tests/hex-floating-island-presentation.test.ts tests/hex-pbr-environment.test.ts tests/hex-naturalistic-world-contract.test.ts
git commit -m "feat: layer floating island PBR cliff"
```

---

## Task 3: Deterministic Floating Debris Composition

**Files:**
- Create: `lib/hex-world/floating-island-composition.ts`
- Create: `tests/hex-floating-island-composition.test.ts`
- Modify: `components/hex-world/pbr/HexPBRFloatingFragments.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `tests/hex-pbr-cutover.test.ts`
- Modify: `tests/hex-floating-island-presentation.test.ts`

**Interfaces:**

```ts
export type FloatingIslandFragmentPlacement = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

export function buildFloatingIslandFragmentPlacements(input: {
  bounds: HexIslandBounds;
  seed: string;
  quality: HexQualityName;
}): FloatingIslandFragmentPlacement[];
```

Change the component signature to:

```ts
export function HexPBRFloatingFragments({
  tiles,
  seed,
  profile,
}: {
  tiles: HexTileDTO[];
  seed: string;
  profile: HexQualityProfile;
})
```

- [ ] **Step 1: Write RED pure-composition tests**

Create `tests/hex-floating-island-composition.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFloatingIslandFragmentPlacements } from '@/lib/hex-world/floating-island-composition';
import type { HexIslandBounds } from '@/lib/hex-world/camera';

const bounds: HexIslandBounds = {
  minX: -6, maxX: 6, minZ: -5, maxZ: 5,
  center: [0, 0, 0], radius: 8,
};

test('floating fragment composition is deterministic and quality bounded', () => {
  const high = buildFloatingIslandFragmentPlacements({ bounds, seed: 'island', quality: 'high' });
  const medium = buildFloatingIslandFragmentPlacements({ bounds, seed: 'island', quality: 'medium' });
  const mobile = buildFloatingIslandFragmentPlacements({ bounds, seed: 'island', quality: 'mobile' });
  assert.deepEqual(high, buildFloatingIslandFragmentPlacements({ bounds, seed: 'island', quality: 'high' }));
  assert.equal(high.length, 10);
  assert.equal(medium.length, 7);
  assert.equal(mobile.length, 4);
  assert.ok(mobile.length < high.length);
});

test('fragments stay below the playable top and vary in distance scale and height', () => {
  const items = buildFloatingIslandFragmentPlacements({ bounds, seed: 'composition', quality: 'high' });
  assert.ok(items.every((item) => item.position[1] <= -2.4));
  assert.ok(items.every((item) => Number.isFinite(item.position[0] + item.position[1] + item.position[2] + item.scale)));
  assert.ok(new Set(items.map((item) => item.position[1].toFixed(1))).size >= 4);
  assert.ok(new Set(items.map((item) => item.scale.toFixed(2))).size >= 4);
  const radii = items.map((item) => Math.hypot(item.position[0] - bounds.center[0], item.position[2] - bounds.center[2]));
  assert.ok(Math.max(...radii) - Math.min(...radii) > bounds.radius * 0.2);
});
```

Update `tests/hex-pbr-cutover.test.ts` to require the helper and forbid the old fixed array:

```ts
assert.match(fragments, /buildFloatingIslandFragmentPlacements/);
assert.doesNotMatch(fragments, /const FRAGMENTS/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-floating-island-composition.test.ts tests/hex-pbr-cutover.test.ts
```

Expected: FAIL because the helper does not exist and fragments are currently hardcoded.

- [ ] **Step 3: Implement deterministic placement helper**

Use a local stable hash/ratio helper; do not use `Math.random`. Fixed quality counts are:

```ts
const COUNT: Record<HexQualityName, number> = { high: 10, medium: 7, mobile: 4 };
```

For each index derive angle, radial distance, vertical position, rotation, and scale. Keep the composition asymmetric by adding a seed-derived angular offset and per-index angle jitter rather than equal radial spacing.

Bound placement approximately to:

```ts
radius: bounds.radius * 0.92 .. bounds.radius * 1.48
y: -2.6 .. -7.4
scale: 0.34 .. 0.9
```

Ensure the first four placements are the strongest compositionally so mobile keeps the major masses rather than an arbitrary slice.

- [ ] **Step 4: Wire the component to island bounds**

Inside `HexPBRFloatingFragments.tsx`:

```ts
const bounds = useMemo(() => getUnlockedIslandBounds(tiles), [tiles]);
const placements = useMemo(
  () => buildFloatingIslandFragmentPlacements({ bounds, seed, quality: profile.name }),
  [bounds, profile.name, seed],
);
```

Preserve the existing local scanned `rockSet`, normalization, instanced rendering, material cloning/disposal, and no-raycast behavior.

In `HexWorld3D.tsx` change:

```tsx
<HexPBRFloatingFragments tiles={snapshot.tiles} seed={snapshot.world.seed} profile={profile} />
```

- [ ] **Step 5: Run GREEN**

```bash
node --import tsx --test tests/hex-floating-island-composition.test.ts tests/hex-pbr-cutover.test.ts tests/hex-floating-island-presentation.test.ts tests/hex-render-budget.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/hex-world/floating-island-composition.ts components/hex-world/pbr/HexPBRFloatingFragments.tsx components/hex-world/HexWorld3D.tsx tests/hex-floating-island-composition.test.ts tests/hex-pbr-cutover.test.ts tests/hex-floating-island-presentation.test.ts tests/hex-render-budget.test.ts
git commit -m "feat: compose floating island debris"
```

---

## Task 4: Below-Island Clouds, Haze, and Removal of the World Support-Plane Cue

**Files:**
- Modify: `components/hex-world/HexSkyAtmosphere.tsx`
- Modify: `components/hex-world/HexWorldLighting.tsx`
- Modify: `tests/hex-floating-island-presentation.test.ts`
- Modify: `tests/hex-pbr-environment.test.ts`
- Modify: `tests/hex-render-budget.test.ts`

- [ ] **Step 1: Add RED atmosphere/shadow contracts**

Extend `tests/hex-floating-island-presentation.test.ts`:

```ts
test('World sells altitude with below-island cloud layers and no island-scale contact floor', async () => {
  const sky = await source('components/hex-world/HexSkyAtmosphere.tsx');
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  assert.match(sky, /BELOW_ISLAND_CLOUDS/);
  assert.match(sky, /BelowIslandHaze/);
  assert.match(lighting, /explore\s*&&\s*<ContactShadows/);
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
});
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-floating-island-presentation.test.ts tests/hex-pbr-environment.test.ts tests/hex-render-budget.test.ts
```

Expected: FAIL because `ContactShadows` currently renders in World mode and the cloud constant is not yet explicit.

- [ ] **Step 3: Lower and layer the cloud field**

Rename the cloud composition constant to `BELOW_ISLAND_CLOUDS` and move the main cloud Y positions below the new core, using varied layers roughly from `-6.3` to `-10.2`. Keep X/Z spread broad enough to frame rather than hide the island.

Move `BelowIslandHaze` downward so its nearest disc begins around `-5.2`, with later discs progressively lower and larger. Keep low opacity and existing weather tinting. Preserve motion via `cloudParallaxScale` and reduced-motion behavior through the existing motion profile.

- [ ] **Step 4: Restrict ContactShadows to Explore/person view**

Keep the existing one directional light and hemisphere/ambient interpolation. Render contact shadows only when the camera is person-scale:

```tsx
{explore && (
  <ContactShadows
    position={[0, -0.03, 0]}
    opacity={contactOpacity}
    scale={42}
    blur={contactBlur}
    far={10}
    resolution={profile.contactShadowResolution}
  />
)}
```

World mode therefore relies on real directional shadows and the island body/atmosphere, removing the large invisible-floor cue.

- [ ] **Step 5: Run GREEN**

```bash
node --import tsx --test tests/hex-floating-island-presentation.test.ts tests/hex-pbr-environment.test.ts tests/hex-render-budget.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hex-world/HexSkyAtmosphere.tsx components/hex-world/HexWorldLighting.tsx tests/hex-floating-island-presentation.test.ts tests/hex-pbr-environment.test.ts tests/hex-render-budget.test.ts
git commit -m "feat: deepen floating island atmosphere"
```

---

## Task 5: World Camera Framing That Reveals the Underside

**Files:**
- Modify: `lib/hex-world/camera.ts`
- Modify: `tests/hex-camera.test.ts`

**Interfaces:**

Keep existing semantic camera functions. Only tune pure pose math; do not change `HexDioramaCamera` interaction ownership unless a regression proves it necessary.

- [ ] **Step 1: Write RED framing tests**

Extend `tests/hex-camera.test.ts`:

```ts
test('overview intentionally lifts its target and uses a lower viewing slope to reveal island depth', () => {
  const bounds = getUnlockedIslandBounds([tile(-5, 0), tile(5, 0)]);
  const overview = getOverviewCameraPose(bounds, 16 / 9);
  const vertical = overview.position[1] - overview.target[1];
  const lateral = Math.abs(overview.position[0] - overview.target[0]);
  assert.ok(overview.target[1] > bounds.center[1]);
  assert.ok(vertical / lateral < 0.62);
});

test('build camera remains centered on gameplay surface and more top-down than floating-island overview', () => {
  const bounds = getUnlockedIslandBounds(motionTiles);
  const overview = getOverviewCameraPose(bounds, 16 / 9);
  const build = getBuildCameraPose(bounds, 16 / 9);
  assert.deepEqual(build.target, bounds.center);
  const overviewSlope = Math.abs(overview.position[1] - overview.target[1]) / Math.abs(overview.position[0] - overview.target[0]);
  const buildSlope = Math.abs(build.position[1] - build.target[1]) / Math.abs(build.position[0] - build.target[0]);
  assert.ok(buildSlope > overviewSlope);
});
```

Replace the old assertion that Build target equals Overview target, because Overview now intentionally lifts its look target for silhouette composition while Build remains centered on the operational surface.

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-camera.test.ts
```

Expected: FAIL because Overview currently targets `bounds.center` exactly and Build inherits that target.

- [ ] **Step 3: Tune pure camera pose math**

Use a small radius-bounded target lift in Overview:

```ts
const target: [number, number, number] = [
  bounds.center[0],
  bounds.center[1] + Math.min(0.8, bounds.radius * 0.05),
  bounds.center[2],
];
```

Keep the existing distance rule and portrait penalty. Lower the overview Y coefficient from `0.44` to approximately `0.38` while retaining the current X/Z orientation:

```ts
position: [
  target[0] + distance * 0.68,
  target[1] + distance * 0.38,
  target[2] + distance * 0.76,
]
```

Build mode uses `bounds.center` as its target and keeps the existing more-top-down coefficients. Focus mode keeps its semantic focus behavior and uses Overview only for distance context.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-camera.test.ts
```

Expected: PASS, including portrait framing, opening pose, semantic command key, and manual OrbitControls authority contracts.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/camera.ts tests/hex-camera.test.ts
git commit -m "feat: frame floating island underside"
```

---

## Task 6: Scene Integration, Edge Readability, and Performance Guardrails

**Files:**
- Modify: `components/hex-world/HexWorld3D.tsx` only if Task 3 wiring did not already complete all props
- Modify: `tests/hex-floating-island-presentation.test.ts`
- Modify: `tests/hex-naturalistic-world-contract.test.ts`
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/hex-pbr-cutover.test.ts`

**Scope decision:** Do not add a new vegetation subsystem in this phase. Existing PBR vegetation already supplies trees, shrubs, ferns, grass tufts, rock sets, and stumps with deterministic quality-bounded instancing. The new grass-overhang/soil rim plus deeper cliff is the edge-readability mechanism for this overhaul; extra roots or bespoke rim vegetation remain unnecessary unless visual review after implementation proves a concrete gap.

- [ ] **Step 1: Strengthen scene-level RED contracts**

Extend `tests/hex-floating-island-presentation.test.ts` so the final World scene must satisfy:

```ts
test('World composes the deep island without changing authoritative picking', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.match(world, /<HexPBRCliff[^>]*tiles=\{snapshot\.tiles\}[^>]*seed=\{snapshot\.world\.seed\}/);
  assert.match(world, /<HexPBRFloatingFragments[^>]*tiles=\{snapshot\.tiles\}[^>]*seed=\{snapshot\.world\.seed\}/);
  assert.match(world, /<HexPBRTerrain[^>]*tiles=\{snapshot\.tiles\}/);
  assert.match(world, /<HexTileInstances[^>]*presentation=["']proxy["']/);
  assert.doesNotMatch(world, /EffectComposer|Bloom|DepthOfField|SSAO|SSR|CubeCamera/);
});
```

Add a source contract that the floating-island presentation files stay visual-only:

```ts
for (const path of [
  'components/hex-world/pbr/HexPBRCliff.tsx',
  'components/hex-world/pbr/HexPBRFloatingFragments.tsx',
  'components/hex-world/HexSkyAtmosphere.tsx',
  'lib/hex-world/floating-island-composition.ts',
]) {
  assert.doesNotMatch(await source(path), /fetch\(|hexWorldAPI|prisma|api\//);
}
```

- [ ] **Step 2: Run RED or confirm the new contracts are already GREEN from prior tasks**

```bash
node --import tsx --test \
  tests/hex-floating-island-presentation.test.ts \
  tests/hex-naturalistic-world-contract.test.ts \
  tests/hex-render-budget.test.ts \
  tests/hex-pbr-cutover.test.ts
```

If any new contract is RED, fix only the scene integration required by that contract. Do not add unrelated polish.

- [ ] **Step 3: Verify quality and rendering invariants**

Confirm through tests/source that:

- `HexPBRFloatingFragments` remains instanced.
- `HexPBRVegetation` remains instanced.
- high-quality DPR ceiling remains `1.75`.
- one directional light remains the only primary shadow owner.
- mobile still renders `HexPBRCliff` and therefore the deep primary silhouette.
- `HexWorld3D` contains no procedural island math.
- no external URL or runtime asset fetch enters the floating-island path.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test \
  tests/hex-floating-island-presentation.test.ts \
  tests/hex-naturalistic-world-contract.test.ts \
  tests/hex-render-budget.test.ts \
  tests/hex-pbr-cutover.test.ts \
  tests/hex-pbr-environment.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit any focused integration fixes**

```bash
git add components/hex-world/HexWorld3D.tsx tests/hex-floating-island-presentation.test.ts tests/hex-naturalistic-world-contract.test.ts tests/hex-render-budget.test.ts tests/hex-pbr-cutover.test.ts tests/hex-pbr-environment.test.ts
git commit -m "test: lock floating island visual contracts"
```

If Step 2 was already fully green and no files changed, do not create an empty commit.

---

## Task 7: Full Verification, Feature PR, and Production Handoff Gate

**Files:**
- No product-code changes expected unless verification finds a concrete regression.
- The approved design and this plan must be included in the feature branch history.

**Branching:**

Create implementation branch `feat/cozy-floating-homestead-visual-overhaul` from the tip of `design/cozy-floating-homestead-visual-overhaul`, so both approved documents travel with the implementation. The pull request targets `main`.

- [ ] **Step 1: Run all floating-island focused tests together**

```bash
node --import tsx --test \
  tests/hex-island-boundary.test.ts \
  tests/hex-floating-island-composition.test.ts \
  tests/hex-floating-island-presentation.test.ts \
  tests/hex-naturalistic-world-contract.test.ts \
  tests/hex-pbr-cutover.test.ts \
  tests/hex-pbr-environment.test.ts \
  tests/hex-render-budget.test.ts \
  tests/hex-camera.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full local pure suite**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

```bash
npm run build
```

Expected: PASS with the existing PBR asset vendoring and Next.js production build.

- [ ] **Step 5: Review the final diff against the approved constraints**

Confirm the diff contains no change under Prisma schema/migrations, no save/API authority changes, no new external assets, no replacement of transparent picking authority, no new heavy renderer dependency, and no new shadow-casting light.

- [ ] **Step 6: Open a non-draft PR to `main`**

PR title:

```text
feat: overhaul cozy floating island visuals
```

PR body must summarize:

- deep multi-strata island core and multiple regional spires,
- three-layer PBR geological read,
- deterministic quality-bounded floating debris,
- below-island clouds/haze and World contact-floor removal,
- overview camera underside framing,
- gameplay/persistence unchanged,
- local verification results.

Do not merge at this step.

- [ ] **Step 7: Require fresh `Hex Homestead CI` on the exact PR head**

The workflow must pass its existing gates:

1. install dependencies,
2. production dependency audit,
3. Prisma validation,
4. migrations against CI Postgres,
5. security hardening regressions,
6. Hex Homestead pure tests,
7. DB/Redis integration,
8. existing farm regression,
9. lint,
10. production build,
11. production runtime smoke.

Expected: workflow conclusion `success` on the exact feature head SHA.

- [ ] **Step 8: Stop at the merge approval gate**

Report the PR number, exact head SHA, changed files, focused-test result, full CI run number, and mergeability. Do not merge until the user explicitly authorizes merge.

- [ ] **Step 9: After explicit merge authorization only, verify Railway production**

After merge, confirm:

- `main` points to the merge commit,
- Railway service `narinyland` auto-deploys that exact commit,
- deployment status reaches `SUCCESS`,
- runtime starts Next.js successfully and healthcheck `/api/health` passes.

Only then claim the new floating-island graphics are live in production.

---

## Acceptance Checklist

- [ ] Default World view visibly reads as a floating island rather than a thin slab.
- [ ] Main core has a clear grass-top / exposed-soil / upper-rock / lower-rock progression.
- [ ] Deepest silhouette points are roughly 2–3× the old body depth while staying bounded.
- [ ] Several broad regional spires/masses are visible; no perfect cone and no equal-depth teeth ring.
- [ ] Debris composition is seed-derived, asymmetric, quality-bounded, instanced, and below the playable top.
- [ ] Clouds/haze reinforce altitude below the island and do not cross the playable top.
- [ ] World mode has no island-scale ContactShadows support plane.
- [ ] Top remains warm/readable; lower rock reads cooler/darker through PBR tint and lighting, not unlit color.
- [ ] Overview camera reveals the underside; Build remains more top-down and operational.
- [ ] Mobile retains the deep primary island silhouette.
- [ ] Tile picking, selection, placement, expansion, saves, Homestead Life state, and person movement authority are unchanged.
- [ ] Focused tests, full tests, lint, production build, and fresh PR CI all pass before merge.
