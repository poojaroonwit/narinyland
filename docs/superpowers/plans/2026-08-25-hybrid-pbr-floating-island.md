# Hybrid PBR Floating Island Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining procedural-color Narinyland World presentation with a locally served, asset-driven PBR floating island that visually approaches the approved realistic references while preserving all existing Hex Homestead gameplay authority.

**Architecture:** Keep the current deterministic continuous terrain topology, organic cliff shell, invisible hex picking proxy, Build/Grow overlays, camera authority, farming, interactions, persistence, undo and server contracts. Add a pinned CC0 asset manifest and deterministic vendor pipeline, then layer PBR terrain/cliff materials, instanced scanned vegetation/rocks, PBR-authored core buildings, physical water and a local HDRI environment on top of the existing gameplay geometry. Runtime code resolves only local `/assets/hex-world/...` paths; third-party URLs exist only in versioned provenance/manifest data consumed before `next build`.

**Tech Stack:** Next.js 16, React 19, React Three Fiber 9, Drei 10, Three.js 0.182, TypeScript, Node 22, Docker/Railway, existing Hex Homestead CI.

**Spec:** `docs/superpowers/specs/2026-08-25-hybrid-pbr-floating-island-design.md`

## Global Constraints

- The island remains a floating landmass in the sky.
- Normal World mode never exposes gameplay hex seams.
- Build/Grow may show contextual hex guidance only.
- Hex coordinates, authoritative tile heights, unlock state, placement, expansion, farming, interactions, points/economy, undo and persistence remain unchanged.
- No Prisma schema, API contract, auth or server-authority changes.
- No WebGPU migration and no mandatory heavy post-processing stack.
- Exactly one directional light remains the primary shadow-casting light.
- Existing `high`, `medium`, `mobile` are the only runtime cost buckets.
- Existing reduced-motion and World Visual Motion v2 behavior remains authoritative.
- Repeated vegetation, grass and rock geometry must be instanced or bounded.
- No `Math.random()` in deterministic World presentation.
- Browser/runtime code must not call `api.polyhaven.com`, `dl.polyhaven.org`, Poly Haven pages, or any other third-party asset host.
- Production build fails on missing or checksum-invalid required PBR assets; it must not silently restore the retired primitive visual path.
- Final PR removes dead duplicate flat/procedural render paths replaced by PBR equivalents.
- Final completion requires full Hex Homestead CI on the exact branch head.
- Do not merge until the user explicitly requests `merge`; after merge verify Railway production uses the resulting `main` SHA with `SUCCESS`.

## Pinned v1 Asset Selection

All source assets are CC0 Poly Haven assets. Resolution names below are source-selection targets; the resolved manifest committed by Task 1 records exact immutable file URLs and SHA-256 values.

| Purpose | Poly Haven asset ID | Variant target |
| --- | --- | --- |
| lush grass terrain | `leafy_grass` | 1K maps; high may use 2K diffuse/normal |
| exposed soil | `dirt` | 1K maps |
| compacted path | `raked_dirt` | 1K maps |
| cliff/rock face | `rock_face` | 1K maps; high may use 2K diffuse/normal |
| building wood | `weathered_planks` | 1K maps |
| building plaster | `plastered_wall` | 1K maps |
| roof surface | `roof_tiles` | 1K maps |
| primary deciduous tree | `tree_small_02` | 1K glTF, lowest usable supplied LOD for mobile |
| meadow shrub | `shrub_03` | 1K glTF |
| fern | `fern_02` | 1K glTF |
| grass tuft | `grass_medium_01` | 1K glTF |
| rock set | `rock_moss_set_01` | 1K glTF |
| stump/root dressing | `tree_stump_01` | 1K glTF |
| environment lighting | `meadow` | 1K HDR default, 2K HDR high when budget permits |

Core Home/Barn/Storage/Workshop v1 use the existing authoritative building dispatch with rebuilt UV-mapped authored geometry and the pinned plaster/wood/roof/rock materials. They do not depend on an unverified third-party building model and do not retain the current flat-material primitive model as a fallback.

## File Structure

Create:

```text
assets/hex-world/
  pbr-source-catalog.json
  pbr-manifest.json
  NOTICE.md
scripts/
  resolve-hex-pbr-manifest.mjs
  vendor-hex-pbr-assets.mjs
lib/hex-world/pbr/
  asset-manifest.ts
  asset-paths.ts
  terrain-materials.ts
  quality-assets.ts
components/hex-world/pbr/
  HexPBRAssetPreloader.tsx
  HexPBRTerrain.tsx
  HexPBRCliff.tsx
  HexPBRVegetation.tsx
  HexPBRBuildings.tsx
  HexPBRWater.tsx
  HexPBREnvironment.tsx
tests/
  hex-pbr-manifest.test.ts
  hex-pbr-vendor-contract.test.ts
  hex-pbr-runtime-boundary.test.ts
  hex-pbr-terrain.test.ts
  hex-pbr-vegetation.test.ts
  hex-pbr-buildings.test.ts
  hex-pbr-environment.test.ts
```

Modify:

```text
package.json
Dockerfile
components/hex-world/HexWorld3D.tsx
components/hex-world/terrain/HexNaturalTerrain.tsx
components/hex-world/terrain/HexIslandCliffShell.tsx
components/hex-world/HexAmbientDecor.tsx
components/hex-world/HexTerrainDetails.tsx
components/hex-world/HexWaterSurface.tsx
components/hex-world/HexSkyAtmosphere.tsx
components/hex-world/HexWorldLighting.tsx
components/hex-world/models/HexStructureModels.tsx
components/hex-world/models/HexNatureModels.tsx
lib/hex-world/natural-terrain.ts
lib/hex-world/island-boundary.ts
lib/hex-world/quality.ts
existing visual-contract tests that intentionally encode replaced implementation details
```

---

### Task 1: Pin and verify the CC0 asset supply chain

**Files:**
- Create: `assets/hex-world/pbr-source-catalog.json`
- Create: `assets/hex-world/pbr-manifest.json`
- Create: `assets/hex-world/NOTICE.md`
- Create: `scripts/resolve-hex-pbr-manifest.mjs`
- Create: `scripts/vendor-hex-pbr-assets.mjs`
- Create: `lib/hex-world/pbr/asset-manifest.ts`
- Create: `lib/hex-world/pbr/asset-paths.ts`
- Modify: `package.json`
- Modify: `Dockerfile`
- Test: `tests/hex-pbr-manifest.test.ts`
- Test: `tests/hex-pbr-vendor-contract.test.ts`
- Test: `tests/hex-pbr-runtime-boundary.test.ts`

**Interfaces:**
- `HexPBRManifest` is the versioned runtime/build contract.
- `getPBRAssetPath(assetKey, fileKey, quality)` returns a local `/assets/hex-world/...` URL only.
- `vendor-hex-pbr-assets.mjs` consumes the resolved manifest, downloads missing files, verifies SHA-256 and writes into `public/assets/hex-world/`.

- [ ] **Step 1: Add failing manifest and runtime-boundary tests**

Create tests that require all pinned source IDs from the table above, `license: 'CC0'`, exact file-level `url`, `sha256`, and local output path fields in the resolved manifest. Require runtime helpers to reject any URL not beginning with `/assets/hex-world/` and scan `components/hex-world`, `lib/hex-world` for `polyhaven.com`, `dl.polyhaven.org`, `api.polyhaven.com`.

Example core assertion:

```ts
assert.equal(manifest.version, 1);
for (const asset of manifest.assets) {
  assert.equal(asset.license, 'CC0');
  for (const file of Object.values(asset.files)) {
    assert.match(file.url, /^https:\/\//);
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    assert.match(file.out, /^[a-z0-9_./-]+$/);
  }
}
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --import tsx --test tests/hex-pbr-manifest.test.ts tests/hex-pbr-vendor-contract.test.ts tests/hex-pbr-runtime-boundary.test.ts
```

Expected: FAIL because the PBR manifest/vendor/runtime modules do not exist.

- [ ] **Step 3: Create the source catalog with the exact pinned IDs**

`pbr-source-catalog.json` contains only the asset IDs listed above, required map roles, preferred resolution and allowed fallback resolution. Do not use search-at-build behavior.

- [ ] **Step 4: Implement one-time manifest resolver**

`resolve-hex-pbr-manifest.mjs` uses Node `fetch` against Poly Haven file metadata for each explicit source ID, selects only the requested 1K/2K glTF/HDR/JPG/PNG entries, downloads each selected file once, computes SHA-256 using `node:crypto`, and writes a fully resolved `pbr-manifest.json` containing the exact URL/hash/output mapping.

The resolver is a developer maintenance command only. It is not invoked by browser code, `next build`, Railway runtime, or application startup.

- [ ] **Step 5: Resolve and commit the exact manifest and NOTICE**

Run:

```bash
node scripts/resolve-hex-pbr-manifest.mjs
```

Review generated entries manually. `NOTICE.md` records Poly Haven, every source asset ID, CC0, source page and resolution used.

- [ ] **Step 6: Implement deterministic vendoring with checksum verification**

`vendor-hex-pbr-assets.mjs`:

```js
for (const asset of manifest.assets) {
  for (const file of Object.values(asset.files)) {
    const destination = path.join(outputRoot, file.out);
    if (await fileMatchesSha256(destination, file.sha256)) continue;
    const response = await fetch(file.url);
    if (!response.ok) throw new Error(`PBR_ASSET_DOWNLOAD_FAILED:${asset.id}:${file.out}`);
    await writeAtomic(destination, Buffer.from(await response.arrayBuffer()));
    if (!(await fileMatchesSha256(destination, file.sha256))) {
      throw new Error(`PBR_ASSET_CHECKSUM_MISMATCH:${asset.id}:${file.out}`);
    }
  }
}
```

No silent fallback and no partial destination writes.

- [ ] **Step 7: Add package scripts and Docker cache boundary**

Add:

```json
"assets:pbr:resolve": "node scripts/resolve-hex-pbr-manifest.mjs",
"assets:pbr:vendor": "node scripts/vendor-hex-pbr-assets.mjs",
"prebuild": "node scripts/vendor-hex-pbr-assets.mjs"
```

In Docker `builder`, copy `assets/hex-world/` plus vendor script before the full source copy and run `npm run assets:pbr:vendor` so unchanged manifest assets reuse a Docker layer. `npm run build` then performs a checksum-fast no-op in `prebuild` when files are already present.

- [ ] **Step 8: Run focused tests and vendor twice**

Run:

```bash
node --import tsx --test tests/hex-pbr-manifest.test.ts tests/hex-pbr-vendor-contract.test.ts tests/hex-pbr-runtime-boundary.test.ts
npm run assets:pbr:vendor
npm run assets:pbr:vendor
```

Expected: tests PASS; second vendor run downloads nothing and exits 0 after checksum validation.

- [ ] **Step 9: Commit**

Commit message: `feat: pin hybrid PBR asset pipeline`

---

### Task 2: Add quality-aware local PBR loading primitives

**Files:**
- Create: `lib/hex-world/pbr/quality-assets.ts`
- Create: `lib/hex-world/pbr/terrain-materials.ts`
- Create: `components/hex-world/pbr/HexPBRAssetPreloader.tsx`
- Modify: `lib/hex-world/quality.ts`
- Test: `tests/hex-pbr-manifest.test.ts`
- Test: `tests/hex-pbr-runtime-boundary.test.ts`

**Interfaces:**

```ts
export type HexPBRTextureSet = {
  baseColor: string;
  normal: string;
  roughness: string;
  ao?: string;
};

export function getPBRTextureSet(
  material: 'grass' | 'soil' | 'path' | 'cliff' | 'wood' | 'plaster' | 'roof',
  quality: HexQualityName,
): HexPBRTextureSet;

export function getPBRModelPath(
  model: 'tree' | 'shrub' | 'fern' | 'grassTuft' | 'rockSet' | 'stump',
  quality: HexQualityName,
): string;
```

- [ ] **Step 1: Write failing quality-selection tests**

Require high to select at most 2K where the manifest contains a 2K variant, medium 1K, mobile 1K/lowest supplied model LOD. Require no new quality names and no remote path output.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --import tsx --test tests/hex-pbr-manifest.test.ts tests/hex-pbr-runtime-boundary.test.ts
```

Expected: FAIL on missing quality asset helpers/preloader.

- [ ] **Step 3: Extend `HexQualityProfile` with explicit PBR budgets**

Add bounded fields:

```ts
pbrTextureTier: '2k' | '1k';
pbrVegetationScale: 1 | 0.65 | 0.32;
pbrCliffPropBudget: 42 | 24 | 10;
pbrGroundPropBudget: 180 | 96 | 36;
pbrEnvironmentResolution: '2k' | '1k';
```

Values:
- high: `2k`, `1`, `42`, `180`, `2k`
- medium: `1k`, `0.65`, `24`, `96`, `1k`
- mobile: `1k`, `0.32`, `10`, `36`, `1k`

Adaptive quality semantics remain unchanged.

- [ ] **Step 4: Implement local texture/model path resolution**

Use only the committed resolved manifest. Throw a deterministic development/build error on missing logical roles; never return procedural fallback assets.

- [ ] **Step 5: Implement `HexPBRAssetPreloader`**

Use Drei/Three preload facilities for shared terrain textures and HDRI first, then only model paths needed by present world decor/building categories. Avoid eager-loading every catalog asset on mobile.

- [ ] **Step 6: Verify GREEN**

Run focused tests plus:

```bash
node --import tsx --test tests/hex-adaptive-quality.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: add quality-aware PBR asset loading`

---

### Task 3: Replace flat terrain and cliff shading with PBR materials

**Files:**
- Create: `components/hex-world/pbr/HexPBRTerrain.tsx`
- Create: `components/hex-world/pbr/HexPBRCliff.tsx`
- Modify: `lib/hex-world/natural-terrain.ts`
- Modify: `lib/hex-world/island-boundary.ts`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify/retire: `components/hex-world/terrain/HexNaturalTerrain.tsx`
- Modify/retire: `components/hex-world/terrain/HexIslandCliffShell.tsx`
- Test: `tests/hex-pbr-terrain.test.ts`
- Update: `tests/hex-natural-terrain.test.ts`
- Update: `tests/hex-island-boundary.test.ts`
- Update: `tests/hex-naturalistic-world-contract.test.ts`

**Interfaces:**
- Terrain geometry keeps authoritative centers/heights and shared crack-free corners.
- `NaturalTerrainMeshData` gains UV/material-group metadata only.
- Cliff geometry keeps boundary/topology and gains UV/material groups only.

- [ ] **Step 1: Write failing PBR terrain contracts**

Require texture-based `map`, `normalMap`, `roughnessMap`, sRGB base-color configuration, repeat wrapping, and local asset paths. Require no flat vertex-color material as the normal World terrain/cliff renderer.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --import tsx --test tests/hex-pbr-terrain.test.ts tests/hex-natural-terrain.test.ts tests/hex-island-boundary.test.ts
```

Expected: FAIL on missing PBR renderers/UV metadata.

- [ ] **Step 3: Add deterministic terrain UV and material groups**

Use world-projected XZ UVs at a stable meter scale. Keep center and corner positions exactly unchanged. Group triangles into grass/soil/path/stone/water-bank presentation classes without writing to source tile state.

- [ ] **Step 4: Implement `HexPBRTerrain`**

Create one geometry with material groups or a bounded number of geometry views. Load pinned base-color/normal/roughness maps, set base color to `THREE.SRGBColorSpace`, repeat wrapping, anisotropy bounded by renderer capability, and restrained normal scale. No displacement that changes gameplay silhouette in v1.

- [ ] **Step 5: Add cliff UV projection and `HexPBRCliff`**

Project UVs using dominant vertical-face axes and preserve the exact organic boundary shell. Use the pinned `rock_face` maps plus a darker soil lip material. Add no per-hex cliff chunks.

- [ ] **Step 6: Cut `HexWorld3D` over to PBR terrain/cliff**

Mount:

```tsx
<HexPBRTerrain ... />
<HexPBRCliff ... />
<HexTileInstances presentation="proxy" ... />
```

Keep the contextual build grid exactly where it is.

- [ ] **Step 7: Remove dead flat terrain/cliff normal-World paths**

After replacement-specific tests pass, delete or reduce old components to shared pure helpers only if still imported elsewhere. No hidden runtime fallback.

- [ ] **Step 8: Verify GREEN**

Run focused terrain/cliff tests plus graphics/render-budget tests.

- [ ] **Step 9: Commit**

Commit message: `feat: render PBR terrain and cliffs`

---

### Task 4: Replace procedural vegetation and ground props with instanced scanned assets

**Files:**
- Create: `components/hex-world/pbr/HexPBRVegetation.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify/retire: `components/hex-world/HexAmbientDecor.tsx`
- Modify/retire: `components/hex-world/HexTerrainDetails.tsx`
- Modify: `components/hex-world/models/HexNatureModels.tsx`
- Test: `tests/hex-pbr-vegetation.test.ts`
- Update: `tests/hex-premium-motion-contract.test.ts`
- Update: `tests/hex-render-budget.test.ts`

**Interfaces:**
- Uses pinned local GLTF assets: `tree_small_02`, `shrub_03`, `fern_02`, `grass_medium_01`, `rock_moss_set_01`, `tree_stump_01`.
- Uses deterministic world seed/tile metadata and existing PBR quality budgets.
- World Visual Motion v2 wind remains presentation-only.

- [ ] **Step 1: Write failing vegetation contracts**

Require `useGLTF`/GLTF loading from local asset paths, `InstancedMesh` for repeated compatible meshes, deterministic transforms, alpha-tested foliage materials, v2 wind scale use, and absence of the old procedural canopy/grass-cone path in normal World rendering.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --import tsx --test tests/hex-pbr-vegetation.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-render-budget.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement deterministic scatter data**

Create pure scatter helpers that map unlocked grass/path/cliff-adjacent tiles to bounded model instances using existing deterministic ratio/hash functions. Exclude building footprints, path centers and water tiles. Density multiplies `pbrVegetationScale` and never exceeds profile budgets.

- [ ] **Step 4: Implement GLTF geometry/material extraction once per asset**

Clone or reference static geometry/materials once, normalize model scale to Narinyland world units and construct instanced batches. Preserve alpha maps/alphaTest for foliage; set texture color spaces correctly.

- [ ] **Step 5: Preserve wind without per-leaf animation**

Apply the existing two-frequency world wind to whole grass/shrub/tree instances or small instance groups. Reduced motion freezes decorative sway. Do not introduce skeletal foliage or per-frame React state.

- [ ] **Step 6: Replace ambient procedural normal-World decor**

Use PBR vegetation/rock/stump layers as the default. Remove dead dodecahedron/sphere/cone canopy and ground-cover fallback paths after tests lock PBR coverage.

- [ ] **Step 7: Reuse PBR assets for buildable tree/pond dressing**

`HexNatureModels` keeps building keys and interaction footprint, but visible tree and pond-edge rock/reed dressing use the same local PBR asset library rather than procedural blob geometry.

- [ ] **Step 8: Verify GREEN**

Run focused vegetation/motion/render-budget tests and production typecheck/build.

- [ ] **Step 9: Commit**

Commit message: `feat: render scanned PBR vegetation`

---

### Task 5: Rebuild core structures as UV-mapped PBR architecture

**Files:**
- Create: `components/hex-world/pbr/HexPBRBuildings.tsx`
- Modify: `components/hex-world/models/HexStructureModels.tsx`
- Modify: `components/hex-world/HexBuildingModels.tsx`
- Modify: `components/hex-world/HexBuildings.tsx` only for renderer dispatch if necessary
- Test: `tests/hex-pbr-buildings.test.ts`
- Update: `tests/hex-graphics-quality-pass.test.ts`
- Update: `tests/hex-building-models.test.ts`

**Interfaces:**
- Existing building keys remain `home`, `barn`, `storage`, `workshop` plus existing nature keys.
- Existing authoritative tile height, tier, selected, ghost and interaction behavior remain unchanged.
- Materials come from pinned `weathered_planks`, `plastered_wall`, `roof_tiles`, cliff/stone set and existing local glass/metal physical values.

- [ ] **Step 1: Write failing PBR building contracts**

Require the four core structure cases, UV-capable authored roof/wall geometry, `map` + `normalMap` + `roughnessMap` for wall/wood/roof surfaces, distinct glass/metal physical materials, and no old flat-color structure renderer as a fallback.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --import tsx --test tests/hex-pbr-buildings.test.ts tests/hex-graphics-quality-pass.test.ts tests/hex-building-models.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Split geometry from material binding**

Keep structure geometry helpers small and explicit: foundation, wall panels, gable panels, pitched roof planes, beams, porch/threshold, window frame/glass, doors, chimney/vent. Add stable UVs to custom gable/roof BufferGeometry. Do not change building footprint or collision/selection data.

- [ ] **Step 4: Bind real PBR materials**

Home: plaster + timber + terracotta roof + stone foundation.
Barn: weathered plank walls + darker timber + roof tiles/slates + stone footings.
Storage: plank siding + worn roof + stone threshold.
Workshop: plaster/timber combination + roof + glass + restrained metal details.

Texture repeat is based on world meters so board/roof scale remains believable across structures.

- [ ] **Step 5: Preserve tier/ghost/selection behavior**

Tier details use the same PBR material library. Ghost mode reuses geometry but overrides opacity/tint without discarding texture detail. `HexBuildings` remains the sole presentation-motion owner.

- [ ] **Step 6: Remove flat-material fallback**

After all four keys are covered by PBR structure dispatch, delete or stop exporting the superseded normal renderer. Development-only missing-key markers are allowed; production fallback is not.

- [ ] **Step 7: Verify GREEN**

Run focused building tests, motion tests, lint and build.

- [ ] **Step 8: Commit**

Commit message: `feat: rebuild PBR homestead structures`

---

### Task 6: Add physical water and local HDRI image-based lighting

**Files:**
- Create: `components/hex-world/pbr/HexPBRWater.tsx`
- Create: `components/hex-world/pbr/HexPBREnvironment.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify/retire: `components/hex-world/HexWaterSurface.tsx`
- Modify: `components/hex-world/HexSkyAtmosphere.tsx`
- Modify: `components/hex-world/HexWorldLighting.tsx`
- Test: `tests/hex-pbr-environment.test.ts`
- Update: `tests/hex-graphics-quality-pass.test.ts`
- Update: `tests/hex-world-smoothness-contract.test.ts`

**Interfaces:**
- Uses pinned `meadow` HDRI through local path only.
- Water keeps current two-frequency motion and ripple budget.
- One directional light remains the only shadow owner.

- [ ] **Step 1: Write failing environment contracts**

Require local HDRI/Environment usage, water normal texture, physical water IOR around `1.33`, `metalness={0}`, no CubeCamera/SSR/Reflector, and exactly one directional light.

- [ ] **Step 2: Verify RED**

Run environment + graphics + smoothness tests.

- [ ] **Step 3: Implement `HexPBREnvironment`**

Load the local `meadow` HDRI and set it as scene environment for image-based lighting/reflections. Keep Narinyland sky/fog/cloud visuals as the visible background (`background={false}` or equivalent). Use quality-selected 2K high / 1K medium/mobile HDRI paths.

- [ ] **Step 4: Implement `HexPBRWater`**

Preserve deterministic bucket motion/ripples. Load a local normal map from the water/terrain material set, animate normal offset at bounded speed, use `MeshPhysicalMaterial` with `ior≈1.33`, `metalness=0`, restrained transmission/opacity and environment intensity. Keep shoreline dressing from the PBR vegetation layer.

- [ ] **Step 5: Retune direct/ambient lighting for IBL**

Reduce hemisphere/ambient fill enough to let normal/roughness maps read. Preserve ref-based interpolation and one directional shadow light. No heavy post-processing.

- [ ] **Step 6: Cut over and remove old water fallback**

`HexWorld3D` mounts `HexPBREnvironment` and `HexPBRWater`; the old normal World water renderer is retired after tests pass.

- [ ] **Step 7: Verify GREEN**

Run focused environment tests, complete graphics/motion tests, lint and production build.

- [ ] **Step 8: Commit**

Commit message: `feat: add HDRI lighting and PBR water`

---

### Task 7: Loading, budget enforcement and old-renderer removal

**Files:**
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: Hex World loading/preload component(s) already used by the garden flow
- Modify: `tests/hex-render-budget.test.ts`
- Modify: `tests/hex-naturalistic-world-contract.test.ts`
- Create: `tests/hex-pbr-cutover.test.ts`

**Interfaces:**
- PBR essentials preload before final World reveal.
- Browser runtime remains local-only.
- Existing quality tiers and gameplay authority remain unchanged.

- [ ] **Step 1: Write failing cutover/budget test**

Require:
- PBR preloader mounted in World;
- no import/mount of retired flat terrain/cliff/water/procedural vegetation/flat core building normal renderers;
- no remote runtime asset URLs;
- high/medium/mobile PBR budgets in `quality.ts`;
- exactly one shadow directional light;
- no heavy post-processing.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --import tsx --test tests/hex-pbr-cutover.test.ts tests/hex-render-budget.test.ts tests/hex-naturalistic-world-contract.test.ts
```

Expected: FAIL until final cutover/removal is complete.

- [ ] **Step 3: Integrate PBR preload with existing loading treatment**

Keep the current Narinyland loader visible while essential terrain/HDRI assets suspend/load. Do not render primitive placeholders behind it.

- [ ] **Step 4: Remove superseded visual files/exports**

Delete dead runtime components only after search confirms no imports. Keep gameplay infrastructure: `HexTileInstances` proxy, `HexBuildGridOverlay`, terrain/cliff pure geometry helpers, selection effects, building motion, player controller, living state and server-side code.

- [ ] **Step 5: Verify local-only runtime scan**

Run repository search over runtime code for `http://`, `https://`, `polyhaven`, `api.polyhaven`, `dl.polyhaven` and ensure only `assets/hex-world/*`, resolver/vendor scripts and docs/NOTICE contain third-party source URLs.

- [ ] **Step 6: Verify GREEN**

Run all PBR tests plus existing render-budget/naturalistic/world-motion tests.

- [ ] **Step 7: Commit**

Commit message: `refactor: complete hybrid PBR renderer cutover`

---

### Task 8: Exact-head production verification and PR handoff

**Files:**
- Tests/docs only if an intentionally replaced source-contract assertion is stale.
- No Prisma/API/auth/economy/persistence changes.

- [ ] **Step 1: Audit the branch diff against base `8b328b0c5c0f8cf54f63977d0f3e66f4bf18d1b4`**

Confirm no changes under `prisma/`, mutation API routes, auth, points/economy authority, persistence or undo implementation. Confirm asset source URLs are confined to manifest/provenance/vendor tooling.

- [ ] **Step 2: Run asset vendor from an empty generated output**

Delete `public/assets/hex-world/` locally/CI, run `npm run assets:pbr:vendor`, verify all hashes and required outputs, then run it again to verify cached/no-op behavior.

- [ ] **Step 3: Run the complete Hex Homestead CI on exact final head**

Required gates:
1. dependency advisory gate;
2. Prisma validation;
3. migrations;
4. security regressions;
5. complete Hex pure suite including all PBR contracts;
6. DB/Redis undo integration;
7. farm regression;
8. lint;
9. production build with PBR vendoring;
10. production runtime smoke.

- [ ] **Step 4: Verify production build contains local assets**

Check `.next`/standalone/public output or runtime smoke endpoints for representative files:
- grass base color;
- grass normal;
- cliff base color;
- tree GLTF/GLB;
- rock set GLTF/GLB;
- meadow HDRI.

- [ ] **Step 5: Open draft PR**

Title: `feat: add hybrid PBR floating island`

PR body records:
- pinned CC0 asset IDs;
- RED/GREEN CI run numbers for supply chain, terrain/cliff, vegetation, buildings, environment, cutover;
- final exact head SHA;
- full CI result;
- asset size/budget summary;
- confirmation that browser runtime uses local assets only.

- [ ] **Step 6: Mark ready only after exact-head GREEN**

Keep unmerged until explicit `merge` instruction.

- [ ] **Step 7: After explicit merge, squash with expected-head protection and verify Railway**

Require Railway deployment metadata `commitHash` to equal the resulting `main` SHA and deployment status `SUCCESS` before claiming Hybrid PBR is live.
