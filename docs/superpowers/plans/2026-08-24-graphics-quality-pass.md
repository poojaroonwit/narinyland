# Premium Graphics Quality Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Narinyland’s floating-hex homestead into a premium handcrafted miniature using richer deterministic procedural graphics while preserving gameplay authority and mobile performance budgets.

**Architecture:** Keep the existing React Three Fiber scene composition and instanced rendering model. Add a shared presentation theme and one bounded terrain-detail layer, then improve each existing graphics module independently: terrain/underside, lighting/atmosphere, vegetation/water, structures/nature, crops, and camera. All new state is derived presentation-only data from seed, coordinates, quality profile, and a small visual-environment projection.

**Tech Stack:** Next.js 16.3.x, React 19, TypeScript, Three.js, React Three Fiber, Drei, Tailwind CSS, Node `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-08-24-graphics-quality-pass-design.md`

## Global Constraints

- Preserve Prisma schema, migrations, API contracts, auth, billing, homestead economy, expansion rules, placement authority, and save schema.
- Preserve `high`, `medium`, and `mobile` as the source-of-truth quality profiles.
- Max DPR remains `1.75` high, `1.35` medium, `1` mobile.
- One primary shadow-casting directional light maximum.
- No `EffectComposer`, bloom, depth-of-field, SSAO, SSR, real-time planar/cubemap reflections, remote GLB dependencies, or WebGPU-only rendering.
- Preserve instancing for repeated terrain, vegetation, rocks, flowers, and new small terrain details.
- No per-frame allocation in animation loops; hidden-tab and reduced-motion behavior remain supported.
- Decorative variation is deterministic and client-only; it is never persisted.

## File Structure

### New files
- `lib/hex-world/visual-theme.ts` — centralized procedural palette/material constants and pure deterministic presentation helpers.
- `components/hex-world/HexTerrainDetails.tsx` — bounded instanced grass/fleck/soil detail layer derived from existing tiles.
- `tests/hex-graphics-quality-pass.test.ts` — source-contract and pure presentation regression suite.

### Modified files
- `components/hex-world/HexWorld3D.tsx` — compose terrain details and pass a small visual environment to atmosphere/lighting.
- `components/hex-world/HexTileInstances.tsx` — theme-driven terrain material values while preserving one batch per terrain.
- `components/hex-world/HexIslandUnderside.tsx` — boundary-derived floating-land silhouette.
- `components/hex-world/HexWorldLighting.tsx` — theme-driven warm sun/cool fill and stronger bounded contact depth.
- `components/hex-world/HexAmbientDecor.tsx` — richer deterministic tree/flower/rock/path silhouettes with existing motion buckets.
- `components/hex-world/HexWaterSurface.tsx` — quality-aware layered water highlights.
- `components/hex-world/HexSkyAtmosphere.tsx` — visual environment mood projection.
- `components/hex-world/models/HexStructureModels.tsx` — cohesive foundation/roof/trim/window helpers and role props.
- `components/hex-world/models/HexNatureModels.tsx` — improved tree/pond/garden silhouettes.
- `components/hex-world/HexLivingWorldLayer.tsx` — crop-stage presentation helpers and subtle ready-state emphasis.
- `lib/hex-world/camera.ts` — slightly more lateral overview/focus composition.

---

### Task 1: Lock graphics contracts and shared visual theme

**Files:**
- Create: `tests/hex-graphics-quality-pass.test.ts`
- Create: `lib/hex-world/visual-theme.ts`

**Interfaces:**
- Produces: `HEX_VISUAL_THEME`, `HexVisualEnvironment`, `getHexVisualEnvironment(input)`, `getTerrainPresentation(terrainType, variation)`.
- Later tasks consume the theme and environment only; no engine modules import graphics code.

- [ ] **Step 1: Write the failing graphics contract**

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('premium graphics pass keeps bounded procedural architecture', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const quality = await source('lib/hex-world/quality.ts');
  assert.match(world, /HexTerrainDetails/);
  assert.match(world, /getHexVisualEnvironment/);
  assert.doesNotMatch(world, /EffectComposer|Bloom|DepthOfField|SSAO|SSR/);
  assert.match(quality, /maxDpr:\s*1\.75/);
  assert.match(quality, /maxDpr:\s*1\.35/);
  assert.match(quality, /maxDpr:\s*1,/);
});

test('visual theme centralizes terrain structure water and atmosphere palettes', async () => {
  const theme = await source('lib/hex-world/visual-theme.ts');
  for (const token of ['terrain', 'structures', 'vegetation', 'water', 'atmosphere']) assert.match(theme, new RegExp(token));
  assert.match(theme, /HexVisualEnvironment/);
  assert.match(theme, /getHexVisualEnvironment/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts`

Expected: FAIL because `visual-theme.ts` and `HexTerrainDetails` do not exist.

- [ ] **Step 3: Implement the pure presentation theme**

Create `visual-theme.ts` with a data-only theme and a small visual environment:

```ts
import type { FarmSeason } from '@/lib/family-farm-progression';
import type { HexTerrainType } from './types';

export type HexVisualEnvironment = {
  season: FarmSeason;
  weather: 'sunny' | 'rainy' | 'cloudy';
  daylight: number;
};

export const HEX_VISUAL_THEME = {
  terrain: {
    grass: { base: '#86a86f', dark: '#6f925e', roughness: 0.94 },
    soil: { base: '#9a7050', dark: '#79543d', roughness: 0.97 },
    stone: { base: '#99978d', dark: '#79786f', roughness: 1 },
    water: { base: '#5db7b3', dark: '#3f9497', roughness: 0.46 },
  },
  structures: {
    cream: '#f3e5c7', wood: '#825d43', trim: '#d9b98d', roof: '#b76755', workshopRoof: '#6f8d76',
  },
  vegetation: { trunk: '#7c5d43', leaf: '#75985f', leafLight: '#8bab6c', flower: '#dc91a1' },
  water: { deep: '#4d9fa0', surface: '#69c5c0', highlight: '#d8ffff' },
  atmosphere: { day: '#dceef0', evening: '#eadfcf', rain: '#cbdde0', fog: '#dceef0' },
} as const;

export function getHexVisualEnvironment(input: { season?: FarmSeason; weather?: string; timeMinutes?: number }): HexVisualEnvironment {
  const time = input.timeMinutes ?? 720;
  const daylight = Math.max(0, Math.min(1, 1 - Math.abs(time - 720) / 720));
  return {
    season: input.season ?? 'spring',
    weather: input.weather === 'rainy' ? 'rainy' : input.weather === 'cloudy' ? 'cloudy' : 'sunny',
    daylight,
  };
}

export function getTerrainPresentation(terrainType: HexTerrainType) {
  return HEX_VISUAL_THEME.terrain[terrainType];
}
```

- [ ] **Step 4: Run the focused test**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts`

Expected: theme assertions PASS; world composition assertion remains RED until Task 2.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/visual-theme.ts tests/hex-graphics-quality-pass.test.ts
git commit -m "test: lock premium graphics architecture"
```

### Task 2: Terrain richness and boundary-derived island underside

**Files:**
- Create: `components/hex-world/HexTerrainDetails.tsx`
- Modify: `components/hex-world/HexTileInstances.tsx`
- Modify: `components/hex-world/HexIslandUnderside.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Test: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:**
- `HexTerrainDetails({ tiles, seed, profile }: { tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile })`.
- Add pure helper `getBoundaryTiles(tiles: HexTileDTO[]): HexTileDTO[]` exported from `HexIslandUnderside.tsx` or a local pure helper module if needed for testing.

- [ ] **Step 1: Extend the failing contract**

```ts
test('terrain detail and underside remain deterministic and instanced', async () => {
  const details = await source('components/hex-world/HexTerrainDetails.tsx');
  const underside = await source('components/hex-world/HexIslandUnderside.tsx');
  const tiles = await source('components/hex-world/HexTileInstances.tsx');
  assert.match(details, /instancedMesh/);
  assert.match(details, /ambientDensity/);
  assert.match(details, /seed/);
  assert.match(underside, /getBoundaryTiles/);
  assert.match(underside, /instancedMesh/);
  assert.match(tiles, /getTerrainPresentation|HEX_VISUAL_THEME/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts`

Expected: FAIL on missing `HexTerrainDetails` and boundary helper.

- [ ] **Step 3: Implement deterministic terrain details**

Use at most three instanced batches: grass tufts, stone/dirt flecks, and soil-row accents. Build placements in `useMemo` from `seed`, tile coordinates, terrain type, and `profile.ambientDensity`. Never mutate tile metadata.

Density contract:

```ts
const densityStride = profile.ambientDensity === 1 ? 3 : profile.ambientDensity === 0.75 ? 5 : 8;
const eligible = tiles.filter((tile, index) => tile.unlocked && index % densityStride === 0);
```

Use deterministic coordinate hashing rather than `Math.random()`.

- [ ] **Step 4: Theme the base terrain batches**

Keep exactly one `instancedMesh` per terrain type in `HexTileInstances`; use theme roughness and colors while retaining existing hover/selection/valid/invalid colors.

- [ ] **Step 5: Rework underside placement from actual island boundary**

A tile is a boundary tile when at least one axial neighbor is absent or locked. Build a bounded sampled list from those boundary tiles plus a small central-core cluster. Use only instanced dodecahedra/cones and deterministic variation.

- [ ] **Step 6: Compose `HexTerrainDetails` in `HexWorld3D`**

Place it after base tiles and before buildings so it remains world dressing and never intercepts pointer events.

- [ ] **Step 7: Run focused + existing render-budget tests**

Run:
`node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-world-budget.test.ts tests/hex-world-visuals.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/hex-world/HexTerrainDetails.tsx components/hex-world/HexTileInstances.tsx components/hex-world/HexIslandUnderside.tsx components/hex-world/HexWorld3D.tsx tests/hex-graphics-quality-pass.test.ts
git commit -m "feat: enrich floating island terrain"
```

### Task 3: Lighting and living atmosphere

**Files:**
- Modify: `components/hex-world/HexWorldLighting.tsx`
- Modify: `components/hex-world/HexSkyAtmosphere.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Test: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:**
- `HexWorldLighting({ profile, environment })` consumes `HexVisualEnvironment`.
- `HexSkyAtmosphere({ profile, motionProfile, environment })` consumes the same small visual object.

- [ ] **Step 1: Add failing contracts**

```ts
test('lighting keeps one shadow owner and atmosphere accepts visual environment only', async () => {
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  const sky = await source('components/hex-world/HexSkyAtmosphere.tsx');
  assert.equal((lighting.match(/directionalLight/g) ?? []).length, 1);
  assert.match(lighting, /HexVisualEnvironment/);
  assert.match(sky, /HexVisualEnvironment/);
  assert.doesNotMatch(sky, /HomesteadLifeState|HomesteadLifeAction/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts`

- [ ] **Step 3: Derive environment once in `HexWorld3D`**

```ts
const visualEnvironment = getHexVisualEnvironment({
  season: props.livingState?.season,
  weather: props.livingState?.weather,
  timeMinutes: props.livingState?.timeMinutes,
});
```

Pass only this object to sky/lighting.

- [ ] **Step 4: Tune lighting**

Use warm sun, cool hemisphere fill, slightly lower global ambient, stronger but bounded contact opacity. Keep shadow map sizing from the profile and one directional light.

- [ ] **Step 5: Tune atmosphere**

Interpolate background/fog color from daylight/weather/season without allocating new colors every frame. Reuse memoized `THREE.Color` values. Keep existing bounded cloud count and parallax.

- [ ] **Step 6: Run focused + reduced-motion/budget tests**

Run:
`node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-motion.test.ts tests/hex-world-budget.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/HexWorldLighting.tsx components/hex-world/HexSkyAtmosphere.tsx components/hex-world/HexWorld3D.tsx tests/hex-graphics-quality-pass.test.ts
git commit -m "feat: deepen homestead lighting and atmosphere"
```

### Task 4: Vegetation and water silhouettes

**Files:**
- Modify: `components/hex-world/HexAmbientDecor.tsx`
- Modify: `components/hex-world/HexWaterSurface.tsx`
- Modify: `components/hex-world/models/HexNatureModels.tsx`
- Test: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:** existing public component props remain unchanged.

- [ ] **Step 1: Add failing source contracts**

```ts
test('vegetation and water stay quality-aware and batched', async () => {
  const decor = await source('components/hex-world/HexAmbientDecor.tsx');
  const water = await source('components/hex-world/HexWaterSurface.tsx');
  assert.match(decor, /SwayInstanceBatch/);
  assert.match(decor, /canopy/i);
  assert.match(water, /waterDetail/);
  assert.match(water, /waterGlintCount/);
  assert.doesNotMatch(water, /CubeCamera|Reflector|MeshReflectorMaterial/);
});
```

- [ ] **Step 2: Run and verify RED on new detail assertions**

- [ ] **Step 3: Upgrade trees/flowers/rocks/paths**

Keep current motion buckets. Render 2–3 canopy-lobe batches per tree bucket with deterministic offsets/scales and two green tones. Add deterministic flower palette/silhouette variation and rock/path transform variation; do not create one mesh per plant.

- [ ] **Step 4: Upgrade water by quality**

Keep instanced base water for all tiers. For `medium/high`, add one bounded ripple/highlight batch; for `high`, allow the existing higher glint count. `mobile` renders base water only.

- [ ] **Step 5: Improve procedural pond**

Add a clearer bank ring, reeds, two bounded lily pads, and less symmetric rock placement using local deterministic constants. No new prop interface.

- [ ] **Step 6: Run focused + visual budget tests**

Run:
`node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-world-budget.test.ts tests/hex-motion-acceptance.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/HexAmbientDecor.tsx components/hex-world/HexWaterSurface.tsx components/hex-world/models/HexNatureModels.tsx tests/hex-graphics-quality-pass.test.ts
git commit -m "feat: enrich vegetation and water"
```

### Task 5: Cohesive procedural building family

**Files:**
- Modify: `components/hex-world/models/HexStructureModels.tsx`
- Test: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:** `HexStructureModel` public props remain unchanged.

- [ ] **Step 1: Add failing structural contract**

```ts
test('structure models share miniature construction primitives', async () => {
  const structures = await source('components/hex-world/models/HexStructureModels.tsx');
  for (const helper of ['Foundation', 'RoofTrim', 'Window', 'DoorFrame']) assert.match(structures, new RegExp(`function ${helper}|const ${helper}`));
  for (const key of ['home', 'barn', 'storage', 'workshop']) assert.match(structures, new RegExp(`case '${key}'`));
  assert.doesNotMatch(structures, /https?:\/\//);
});
```

- [ ] **Step 2: Run and verify RED**

- [ ] **Step 3: Extract local primitive helpers**

Implement `Foundation`, `RoofTrim`, `DoorFrame`, and keep `Window`. Helpers accept only geometry/material presentation props; they do not know building progression or gameplay state.

- [ ] **Step 4: Apply shared language to all four structures**

Add foundation/plinth, thicker roof silhouette/overhang, consistent beam/trim proportions, larger readable doors/windows, and one role-specific prop group per building. Preserve tier details and ghost/selected behavior.

- [ ] **Step 5: Run focused + model coverage tests**

Run:
`node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-building-models.test.ts tests/hex-homestead-life-v3-ui.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hex-world/models/HexStructureModels.tsx tests/hex-graphics-quality-pass.test.ts
git commit -m "feat: unify homestead building art style"
```

### Task 6: Garden and crop-stage graphics

**Files:**
- Modify: `components/hex-world/models/HexNatureModels.tsx`
- Modify: `components/hex-world/HexLivingWorldLayer.tsx`
- Test: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:**
- Add pure exported helper `getCropVisualStage(progress: number): 'sprout' | 'young' | 'mature' | 'ready'`.
- It is presentation-only and must not be used by action/readiness logic.

- [ ] **Step 1: Add failing pure-stage test**

```ts
import { getCropVisualStage } from '../components/hex-world/HexLivingWorldLayer';

test('crop visual stages are deterministic presentation ranges', () => {
  assert.equal(getCropVisualStage(0.1), 'sprout');
  assert.equal(getCropVisualStage(0.4), 'young');
  assert.equal(getCropVisualStage(0.7), 'mature');
  assert.equal(getCropVisualStage(0.9), 'ready');
});
```

- [ ] **Step 2: Run and verify RED**

- [ ] **Step 3: Improve garden base**

Darken/warm the tilled-soil base, strengthen furrow geometry, and remove generic permanent sprouts that visually conflict with authoritative crop samples.

- [ ] **Step 4: Implement crop-specific stage geometry**

Use `getCropVisualStage(sample.progress)` to vary stem height, leaf count/scale, fruit visibility, and crop-specific silhouette. Watered ground uses a subtle darker soil disc/patch rather than a bright blue decal. Ready stage gets a tiny bounded scale/bob or emissive lift; action readiness remains controlled by existing engine data.

- [ ] **Step 5: Run crop/living-world tests**

Run:
`node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-living-homestead.test.ts tests/hex-living-homestead-ui.test.ts tests/hex-homestead-life-v3-ui.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hex-world/models/HexNatureModels.tsx components/hex-world/HexLivingWorldLayer.tsx tests/hex-graphics-quality-pass.test.ts
git commit -m "feat: clarify garden crop growth graphics"
```

### Task 7: Diorama camera composition and final presentation polish

**Files:**
- Modify: `lib/hex-world/camera.ts`
- Modify if needed: `components/hex-world/HexDioramaCamera.tsx`
- Modify if needed: `components/hex-world/HexPlacementEffects.tsx`
- Test: `tests/hex-camera.test.ts`
- Test: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:** camera function signatures remain unchanged.

- [ ] **Step 1: Update camera acceptance tests first**

Test that overview remains wider than focus, focus retains substantial island context, build pose is more top-down than overview, portrait penalty remains, and opening pose remains wider/higher than overview.

- [ ] **Step 2: Run camera tests and verify RED only for intentionally changed composition assertions**

Run: `node --import tsx --test tests/hex-camera.test.ts`

- [ ] **Step 3: Tune camera coefficients minimally**

Target overview coefficients around lateral `0.64`, height `0.56`, depth `0.72`; focus uses the same view direction at about `0.76` of overview distance; build remains higher/top-down. Keep no-pan OrbitControls and current min/max polar limits unless a test demonstrates a collision.

- [ ] **Step 4: Tune placement/expansion colors only if needed**

Use theme colors for dust/mist/settle effects; do not create new authoritative events.

- [ ] **Step 5: Run camera + motion + placement tests**

Run:
`node --import tsx --test tests/hex-camera.test.ts tests/hex-motion.test.ts tests/hex-land-placement-audio.test.ts tests/hex-graphics-quality-pass.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/hex-world/camera.ts components/hex-world/HexDioramaCamera.tsx components/hex-world/HexPlacementEffects.tsx tests/hex-camera.test.ts tests/hex-graphics-quality-pass.test.ts
git commit -m "feat: polish diorama composition"
```

### Task 8: Full regression, production build, PR, and deploy verification

**Files:**
- No new product code unless a regression exposes a real issue.
- Update only stale visual source-contract tests where the old assertion conflicts with the approved spec.

**Interfaces:** none.

- [ ] **Step 1: Run the complete Hex pure suite**

Run:
```bash
PURE_HEX_TESTS=$(find tests -maxdepth 1 -name 'hex-*.test.ts' ! -name 'hex-world-undo-db.test.ts' -print | sort | tr '\n' ' ')
node --import tsx --test $PURE_HEX_TESTS tests/garden-hex-integration.test.ts tests/production-startup.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run DB/Redis undo integration and existing farm regression**

Use the repository CI commands unchanged. Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS with no new lint errors.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Next.js compile and TypeScript PASS.

- [ ] **Step 5: Review diff scope**

Confirm changed product files are limited to graphics/presentation modules and tests/docs. Confirm there are no Prisma/API/auth/billing/economy changes and no remote model URLs or heavy post-processing imports.

- [ ] **Step 6: Open PR and require exact-head CI success**

PR body must state the quality/performance contract and list the exact feature-head SHA used for CI verification.

- [ ] **Step 7: Merge only after exact-head CI success**

Use expected-head SHA protection when merging.

- [ ] **Step 8: Verify Railway production**

Verify Railway deployment metadata matches the merge commit, build logs show successful compile + TypeScript, deployment reaches `SUCCESS`, migrations recover if Postgres wakes slowly, and Next.js logs `✓ Ready`.

- [ ] **Step 9: Record visual-verification limitation accurately**

If no interactive browser screenshot/session is available, report that CI/build/runtime are verified but do not claim live visual inspection.
