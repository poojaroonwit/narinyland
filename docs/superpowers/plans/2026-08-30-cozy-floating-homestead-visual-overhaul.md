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

**Files:** Modify `lib/hex-world/island-boundary.ts`, `tests/hex-island-boundary.test.ts`, `tests/hex-naturalistic-world-contract.test.ts`.

**Interfaces:**

```ts
export type IslandCliffMaterial = 'soil' | 'upperRock' | 'lowerRock';

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

The top vertex remains exactly on the natural-terrain boundary. Soil starts slightly inward beneath it, creating a real turf-overhang read without changing the gameplay surface. The rock core uses shared seed-derived angular regions so nearby boundary vertices form broad spires instead of noisy independent teeth.

- [ ] **Step 1: Add failing geometry contracts**

Extend `tests/hex-island-boundary.test.ts`:

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

test('lower silhouette has several regional depth influences', () => {
  const terrain = buildNaturalTerrainMesh([
    tile(0, 0), tile(1, 0), tile(0, 1), tile(-1, 1),
    tile(-1, 0), tile(0, -1), tile(1, -1),
  ], 'regional-spires');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'regional-spires');
  const lower: number[] = [];
  for (let index = 1; index < cliff.positions.length; index += 3) {
    const y = cliff.positions[index];
    if (y < -2.5) lower.push(Number(y.toFixed(1)));
  }
  assert.ok(new Set(lower).size >= 3);
});

test('cliff exposes soil upper-rock and lower-rock groups', () => {
  const terrain = buildNaturalTerrainMesh([tile(0, 0)], 'groups');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'groups');
  assert.deepEqual(cliff.groups.map((group) => group.material), ['soil', 'upperRock', 'lowerRock']);
});
```

Keep the existing deterministic, finite, non-mutating, top-boundary, and inward-taper tests. Update `tests/hex-naturalistic-world-contract.test.ts` to require `grassOverhang`, `soilLipDepth`, `midRockDepth`, `spireDepth`, `spireInfluence`, and `lowerTaper`, while still rejecting `Math.random`.

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-island-boundary.test.ts tests/hex-naturalistic-world-contract.test.ts
```

Expected: FAIL because the current mesh has only `soil`/`rock`, uses `rockWallDepth`, and is too shallow.

- [ ] **Step 3: Implement coherent regional profile generation**

Keep the existing stable hash. Add a five-region angular helper:

```ts
function spireRegion(point: [number, number, number], center: [number, number]): number {
  const angle = Math.atan2(point[2] - center[1], point[0] - center[0]);
  const normalized = (angle + Math.PI) / (Math.PI * 2);
  return Math.min(4, Math.floor(normalized * 5));
}
```

Seed-select one primary region and one different secondary region. Guarantee the primary region receives `spireInfluence = 1`; secondary receives at least `0.78`; remaining regions resolve in `0.35 .. 0.72`. This guarantees at least one strong deep silhouette mass for every seed instead of relying on a lucky hash.

Use bounded profile values:

```text
grassOverhang 0.05 .. 0.16
soilLipDepth 0.22 .. 0.42
upperRockOffset -0.08 .. 0.10
midRockDepth 1.20 .. 2.00
lowerTaper 0.28 .. 0.55
spireDepth 2.80 .. 4.20
erosionJitter approximately -0.12 .. 0.12
```

Create four vertical contours per boundary edge: terrain top → inset soil base → mid-rock shoulder → deep spire contour. Compute all soil indices first, then all upper-rock indices, then all lower-rock indices so material groups remain contiguous. Preserve finite UVs, `colors` length, deterministic output, and overall inward taper. Do not converge all lower points to the island center.

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

**Files:** Modify `components/hex-world/pbr/HexPBRCliff.tsx`, create `tests/hex-floating-island-presentation.test.ts`, modify `tests/hex-pbr-environment.test.ts`.

- [ ] **Step 1: Add failing PBR layer contract**

Create `tests/hex-floating-island-presentation.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('floating island cliff renders three PBR geological layers', async () => {
  const cliff = await source('components/hex-world/pbr/HexPBRCliff.tsx');
  assert.equal((cliff.match(/<meshStandardMaterial\b/g) ?? []).length, 3);
  assert.match(cliff, /soil/);
  assert.match(cliff, /upperRock/);
  assert.match(cliff, /lowerRock/);
  assert.ok((cliff.match(/normalMap=/g) ?? []).length >= 3);
  assert.ok((cliff.match(/roughnessMap=/g) ?? []).length >= 3);
  assert.doesNotMatch(cliff, /meshBasicMaterial|https?:\/\/|Math\.random/);
});
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-floating-island-presentation.test.ts tests/hex-pbr-environment.test.ts
```

Expected: FAIL because the current cliff has two material slots.

- [ ] **Step 3: Implement three PBR material slots**

Map groups directly:

```ts
const materialIndex = { soil: 0, upperRock: 1, lowerRock: 2 } as const;
for (const group of shell.groups) {
  next.addGroup(group.start, group.count, materialIndex[group.material]);
}
```

Keep one owned soil texture bundle and one owned rock bundle; reuse the rock maps on both rock materials and dispose once. Use deeper-body repeats around soil `[2.1, 3.0]` and rock `[2.7, 4.2]`.

Use three `meshStandardMaterial` elements with the existing maps. Target bounded visual tuning: warm soil near `#94745d`, neutral upper rock near `#8f918d`, cooler/darker lower rock near `#727b80`; normal scales roughly `0.52`, `0.74`, `0.84`; roughness approximately `0.96–0.98`. No new assets or lights.

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

**Files:** Create `lib/hex-world/floating-island-composition.ts`, `tests/hex-floating-island-composition.test.ts`; modify `components/hex-world/pbr/HexPBRFloatingFragments.tsx`, `components/hex-world/HexWorld3D.tsx`, `tests/hex-pbr-cutover.test.ts`, `tests/hex-floating-island-presentation.test.ts`.

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

Change `HexPBRFloatingFragments` props to `{ tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile }`.

- [ ] **Step 1: Add failing pure composition tests**

Create `tests/hex-floating-island-composition.test.ts` with a fixed `HexIslandBounds` and require deterministic output, exact counts `10/7/4` for high/medium/mobile, all placements below `bounds.center[1] - 2.4`, finite transforms, at least four distinct Y buckets, at least four distinct scales on high, and radial spread greater than `bounds.radius * 0.2`.

Update `tests/hex-pbr-cutover.test.ts`:

```ts
assert.match(fragments, /buildFloatingIslandFragmentPlacements/);
assert.doesNotMatch(fragments, /const FRAGMENTS/);
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-floating-island-composition.test.ts tests/hex-pbr-cutover.test.ts
```

Expected: FAIL because composition is still a four-item hardcoded constant.

- [ ] **Step 3: Implement pure composition helper**

Use a stable local hash/ratio; never `Math.random`. Counts:

```ts
const COUNT: Record<HexQualityName, number> = { high: 10, medium: 7, mobile: 4 };
```

Derive angle, radius, Y, rotation, and scale per index. Use a seed-derived angular offset plus per-index jitter to avoid equal radial spacing. Bound radius to about `0.92 .. 1.48 * bounds.radius`, Y to `bounds.center[1] - 2.6 .. bounds.center[1] - 7.4`, and scale to `0.34 .. 0.90`. Sort/construct the four strongest masses first so mobile preserves the composition anchors.

- [ ] **Step 4: Integrate with the scanned rock-set renderer**

In `HexPBRFloatingFragments.tsx`:

```ts
const bounds = useMemo(() => getUnlockedIslandBounds(tiles), [tiles]);
const placements = useMemo(
  () => buildFloatingIslandFragmentPlacements({ bounds, seed, quality: profile.name }),
  [bounds, profile.name, seed],
);
```

Preserve `useGLTF`, the existing local `rockSet`, normalization, instanced meshes, material cloning/disposal, and disabled raycast.

In `HexWorld3D.tsx`:

```tsx
<HexPBRFloatingFragments
  tiles={snapshot.tiles}
  seed={snapshot.world.seed}
  profile={profile}
/>
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

## Task 4: Below-Island Atmosphere and No World Support Plane

**Files:** Modify `components/hex-world/HexSkyAtmosphere.tsx`, `components/hex-world/HexWorldLighting.tsx`, `tests/hex-floating-island-presentation.test.ts`, `tests/hex-pbr-environment.test.ts`, `tests/hex-render-budget.test.ts`.

- [ ] **Step 1: Add failing atmosphere/shadow contract**

Extend `tests/hex-floating-island-presentation.test.ts`:

```ts
test('World sells altitude with below-island clouds and no island-scale contact floor', async () => {
  const sky = await source('components/hex-world/HexSkyAtmosphere.tsx');
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  assert.match(sky, /BELOW_ISLAND_CLOUDS/);
  assert.match(sky, /BelowIslandHaze/);
  assert.match(lighting, /explore\s*&&\s*\([\s\S]*?<ContactShadows/);
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
});
```

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-floating-island-presentation.test.ts tests/hex-pbr-environment.test.ts tests/hex-render-budget.test.ts
```

Expected: FAIL because World currently renders the contact-shadow plane and the cloud composition is not yet explicitly below-island.

- [ ] **Step 3: Lower and layer the cloud field**

Rename the cloud constant to `BELOW_ISLAND_CLOUDS`. Move the main cloud Y values into roughly `-6.3 .. -10.2`, with broad X/Z spread around the island. Move the first below-island haze disc to about `-5.2` and place subsequent layers progressively lower/larger. Preserve low opacity, weather/season tint, parallax, and existing motion profile behavior. Clouds must not cross the playable top.

- [ ] **Step 4: Restrict ContactShadows to person-scale Explore**

Keep the existing directional/hemisphere/ambient interpolation. Render `ContactShadows` only inside:

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

World mode then has no invisible island-sized support floor.

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

**Files:** Modify `lib/hex-world/camera.ts`, `tests/hex-camera.test.ts`.

Keep the existing semantic camera functions. Do not change `HexDioramaCamera` ownership unless a regression demonstrates a need.

- [ ] **Step 1: Add failing framing tests**

Extend `tests/hex-camera.test.ts`:

```ts
test('overview lifts its target and lowers viewing slope to reveal island depth', () => {
  const bounds = getUnlockedIslandBounds([tile(-5, 0), tile(5, 0)]);
  const overview = getOverviewCameraPose(bounds, 16 / 9);
  const vertical = overview.position[1] - overview.target[1];
  const lateral = Math.abs(overview.position[0] - overview.target[0]);
  assert.ok(overview.target[1] > bounds.center[1]);
  assert.ok(vertical / lateral < 0.62);
});

test('build camera stays on gameplay center and more top-down than overview', () => {
  const bounds = getUnlockedIslandBounds(motionTiles);
  const overview = getOverviewCameraPose(bounds, 16 / 9);
  const build = getBuildCameraPose(bounds, 16 / 9);
  assert.deepEqual(build.target, bounds.center);
  const overviewSlope = Math.abs(overview.position[1] - overview.target[1]) / Math.abs(overview.position[0] - overview.target[0]);
  const buildSlope = Math.abs(build.position[1] - build.target[1]) / Math.abs(build.position[0] - build.target[0]);
  assert.ok(buildSlope > overviewSlope);
});
```

Replace the old assertion that Build target equals Overview target.

- [ ] **Step 2: Run RED**

```bash
node --import tsx --test tests/hex-camera.test.ts
```

Expected: FAIL because Overview currently targets `bounds.center` and has a steeper `0.44/0.68` vertical/lateral ratio.

- [ ] **Step 3: Tune pure camera math**

Overview target:

```ts
const target: [number, number, number] = [
  bounds.center[0],
  bounds.center[1] + Math.min(0.8, bounds.radius * 0.05),
  bounds.center[2],
];
```

Keep the existing distance and portrait penalty. Use position coefficients approximately `[0.68, 0.38, 0.76]` relative to that target. Build mode uses `bounds.center` directly and retains its more-top-down `[0.52, 0.72, 0.66]` composition. Focus keeps current semantics and only consumes Overview for distance context.

- [ ] **Step 4: Run GREEN**

```bash
node --import tsx --test tests/hex-camera.test.ts
```

Expected: PASS, including portrait framing, opening pose, semantic command key, and manual OrbitControls contracts.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/camera.ts tests/hex-camera.test.ts
git commit -m "feat: frame floating island underside"
```

---

## Task 6: Scene Integration and Performance Guardrails

**Files:** Modify `components/hex-world/HexWorld3D.tsx` only if Task 3 wiring requires it; modify `tests/hex-floating-island-presentation.test.ts`, `tests/hex-naturalistic-world-contract.test.ts`, `tests/hex-render-budget.test.ts`, `tests/hex-pbr-cutover.test.ts`.

**Scope decision:** Do not create a new vegetation subsystem. Existing PBR vegetation already provides deterministic, quality-bounded trees, shrubs, ferns, grass tufts, rock sets, and stumps. In this overhaul the geometry-driven turf overhang and exposed-soil rim supply the new edge cue; extra root meshes remain outside the minimal implementation unless visual review proves a specific defect.

- [ ] **Step 1: Add/strengthen scene contracts**

In `tests/hex-floating-island-presentation.test.ts` require the World scene to pass tiles+seed into `HexPBRCliff` and `HexPBRFloatingFragments`, retain `HexPBRTerrain`, retain `HexTileInstances presentation="proxy"`, and reject `EffectComposer`, Bloom, DOF, SSAO, SSR, and CubeCamera.

Also loop over `HexPBRCliff.tsx`, `HexPBRFloatingFragments.tsx`, `HexSkyAtmosphere.tsx`, and `floating-island-composition.ts` and reject `fetch(`, `hexWorldAPI`, `prisma`, and `api/` references.

- [ ] **Step 2: Run integration contracts**

```bash
node --import tsx --test \
  tests/hex-floating-island-presentation.test.ts \
  tests/hex-naturalistic-world-contract.test.ts \
  tests/hex-render-budget.test.ts \
  tests/hex-pbr-cutover.test.ts
```

If a contract is RED, fix only the missing scene integration. If already GREEN, make no empty compatibility commit.

- [ ] **Step 3: Confirm rendering invariants**

The tests/source must prove: fragments remain instanced; PBR vegetation remains instanced; high DPR ceiling remains `1.75`; one directional light remains the only primary shadow owner; mobile still renders the deep `HexPBRCliff`; `HexWorld3D` contains no procedural island math; no external asset source enters the island path.

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

- [ ] **Step 5: Commit focused integration fixes if files changed**

```bash
git add components/hex-world/HexWorld3D.tsx tests/hex-floating-island-presentation.test.ts tests/hex-naturalistic-world-contract.test.ts tests/hex-render-budget.test.ts tests/hex-pbr-cutover.test.ts tests/hex-pbr-environment.test.ts
git commit -m "test: lock floating island visual contracts"
```

Skip the commit when the worktree has no changes.

---

## Task 7: Full Verification, Feature PR, and Production Handoff Gate

**Branching:** Create `feat/cozy-floating-homestead-visual-overhaul` from the tip of `design/cozy-floating-homestead-visual-overhaul`, so the approved spec and plan travel with implementation. PR base is `main`.

- [ ] **Step 1: Run all focused tests**

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

- [ ] **Step 2: Run full local tests**

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

Expected: PASS with existing PBR vendoring and Next.js production build.

- [ ] **Step 5: Review final diff against constraints**

Confirm no Prisma/schema/migration change, save/API authority change, new external asset source, picking-authority replacement, heavyweight renderer dependency, or new shadow-casting light.

- [ ] **Step 6: Open a non-draft PR to `main`**

Title:

```text
feat: overhaul cozy floating island visuals
```

Body summarizes deep regional-spire geometry, three-layer PBR cliff, deterministic quality-bounded debris, below-island atmosphere and World contact-floor removal, camera framing, unchanged gameplay/persistence, and local verification.

Do not merge.

- [ ] **Step 7: Require fresh `Hex Homestead CI` on the exact PR head**

The workflow must pass install, production dependency audit, Prisma validation, migrations on CI Postgres, security regressions, Hex pure tests, DB/Redis integration, farm regression, lint, production build, and runtime smoke.

Expected: workflow conclusion `success` on the exact feature head SHA.

- [ ] **Step 8: Stop at merge approval gate**

Report PR number, exact head SHA, changed files, focused/full tests, CI run number, and mergeability. Do not merge until the user explicitly authorizes merge.

- [ ] **Step 9: After explicit merge authorization only, verify Railway production**

Confirm `main` points to the merge commit; Railway `narinyland` auto-deploys that exact commit; deployment reaches `SUCCESS`; Next.js starts successfully; `/api/health` passes. Only then claim the floating-island graphics are live.

---

## Acceptance Checklist

- [ ] Default World view reads immediately as a floating island rather than a thin slab.
- [ ] Main core shows grass top → exposed soil → upper rock → lower rock.
- [ ] Deepest silhouette points are roughly 2–3× the old body depth while bounded.
- [ ] Several broad regional spires/masses are visible; no perfect cone or equal-depth teeth ring.
- [ ] Debris is seed-derived, asymmetric, quality-bounded, instanced, and below playable top.
- [ ] Clouds/haze reinforce altitude below the island and never intersect the playable top.
- [ ] World mode has no island-scale ContactShadows support plane.
- [ ] Top remains warm/readable; lower rock is cooler/darker through PBR tint and lighting.
- [ ] Overview reveals underside; Build remains more top-down and operational.
- [ ] Mobile retains the deep primary silhouette.
- [ ] Tile picking, selection, placement, expansion, saves, Homestead Life state, and person movement authority are unchanged.
- [ ] Focused tests, full tests, lint, build, and fresh PR CI pass before merge.
