# Naturalistic Floating Homestead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Narinyland's visible stacked-hex / miniature presentation with one believable naturalistic floating homestead while keeping the existing hex grid as the only gameplay authority.

**Architecture:** Separate presentation geometry from gameplay geometry. A deterministic continuous terrain mesh and boundary-driven cliff shell render the island, while exact existing hex coordinates remain behind an invisible picking proxy and contextual Build/Grow overlays. Existing R3F quality, motion, lighting, buildings, farming, interaction, persistence, undo, and server contracts remain authoritative.

**Tech Stack:** Next.js 16, React 19, React Three Fiber 9, Drei 10, Three.js 0.182, TypeScript, Node test runner, existing Hex Homestead CI.

**Spec:** `docs/superpowers/specs/2026-08-24-naturalistic-floating-homestead-design.md`

## Global Constraints

- The island remains floating in the sky.
- Keep Next.js + React Three Fiber + Three.js; no engine or WebGPU migration.
- Hex coordinates, tile heights, terrain type, unlock state, building placement, expansion, farming, interactions, economy, undo, and persistence remain authoritative and unchanged.
- Presentation geometry must never write back into authoritative state.
- Normal World mode must not use visible stacked hex cylinders as its primary terrain.
- Exact tile picking remains mapped to authoritative hex coordinates through a transparent proxy.
- Build/Grow grid visuals are contextual only.
- No runtime third-party model or texture URLs.
- No new package dependency is required for the initial overhaul.
- Existing high / medium / mobile are the only runtime cost buckets.
- Repeated vegetation and secondary props remain instanced or otherwise bounded.
- No `Math.random()` in deterministic world presentation.
- Preserve reduced-motion behavior and World Visual Motion v2 motion architecture.
- Preserve exactly one primary directional shadow-casting light.
- No mandatory Bloom, SSAO, SSR, DOF, motion blur, or heavyweight post-processing stack.
- No Prisma schema, API contract, authentication, or persistence changes.
- Final completion requires the full Hex Homestead CI to pass on the exact final branch head.
- Do not merge until the user explicitly requests `merge`; after merge verify Railway serves the resulting `main` SHA before claiming it live.

---

### Task 1: Build deterministic continuous terrain geometry

**Files:**
- Create: `lib/hex-world/natural-terrain.ts`
- Create: `tests/hex-natural-terrain.test.ts`

**Interfaces:**
- Consumes: `HexTileDTO[]`, world `seed`, `axialToWorld`, `hexKey`, `hexNeighbors`.
- Produces:
  ```ts
  export type NaturalTerrainBoundaryEdge = {
    tileKey: string;
    start: [number, number, number];
    end: [number, number, number];
    outward: [number, number];
    terrainType: HexTerrainType;
  };

  export type NaturalTerrainMeshData = {
    positions: number[];
    indices: number[];
    colors: number[];
    boundaryEdges: NaturalTerrainBoundaryEdge[];
    tileCenters: Record<string, [number, number, number]>;
  };

  export function buildNaturalTerrainMesh(
    tiles: HexTileDTO[],
    seed: string,
  ): NaturalTerrainMeshData;
  ```

- [ ] **Step 1: Write failing geometry tests**

Cover real behavior:

```ts
const a = tile(0, 0, 0);
const b = tile(1, 0, 0.3);
const first = buildNaturalTerrainMesh([a, b], 'world-seed');
const second = buildNaturalTerrainMesh([a, b], 'world-seed');
assert.deepEqual(first, second);
assert.deepEqual([a.height, b.height], [0, 0.3]);
assert.equal(first.boundaryEdges.length, 10);
```

Also reconstruct triangle edges from `positions/indices` and assert the two neighboring hexes use position-matched vertices along their shared edge so there is no visual crack. Verify locked tiles produce neither visible triangles nor boundary ownership. Verify all generated coordinates are finite and source tile objects remain unchanged.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --import tsx --test tests/hex-natural-terrain.test.ts`

Expected: FAIL because `lib/hex-world/natural-terrain.ts` does not exist.

- [ ] **Step 3: Implement deterministic shared-corner mesh generation**

Use pointy-top hex corners around each authoritative center:

```ts
function hexCornerXZ(centerX: number, centerZ: number, corner: number) {
  const angle = Math.PI / 180 * (60 * corner - 30);
  return [centerX + Math.cos(angle), centerZ + Math.sin(angle)] as const;
}
```

Quantize X/Z to a stable key such as `Math.round(value * 100000)`. Accumulate every unlocked tile height touching a corner and resolve the visual corner Y from the mean of those authoritative heights plus deterministic presentation-only micro variation capped at `0.018`. Use the exact authoritative tile height for each fan center. Emit six center→corner→corner triangles per unlocked non-water tile, terrain-aware restrained vertex colors, tile-center lookup, and outer edges only where `hexNeighbors(tile)[direction]` is not unlocked. Do not mutate input or use `Math.random()`.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `node --import tsx --test tests/hex-natural-terrain.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: generate continuous natural terrain`

---

### Task 2: Render continuous terrain and make hexes interaction-only

**Files:**
- Create: `components/hex-world/terrain/HexNaturalTerrain.tsx`
- Create: `components/hex-world/terrain/HexBuildGridOverlay.tsx`
- Modify: `components/hex-world/HexTileInstances.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Create: `tests/hex-naturalistic-world-contract.test.ts`
- Update: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:**
- Consumes: `buildNaturalTerrainMesh`, current `HexQualityProfile`, existing `validKeys`, `invalidKeys`, `hoveredKey`, `selectedKey`, expansion preview, tile callbacks.
- Produces: visible continuous terrain; invisible exact hex picking proxy; contextual grid overlay.

- [ ] **Step 1: Write failing world-architecture contracts**

Require:
- `HexWorld3D` mounts `HexNaturalTerrain` before detail/vegetation layers;
- `HexTileInstances` supports proxy-only presentation and keeps instance-ID pointer mapping;
- proxy material disables visible color contribution (`colorWrite={false}` or equivalent transparent/no-depth presentation);
- `HexBuildGridOverlay` is mounted only when placement / move / expansion guidance is active;
- normal terrain no longer relies on `<cylinderGeometry args={[1, 1, HEX_TILE_DEPTH, 6]}>` as the visible World surface;
- `HexNaturalTerrain` uses `BufferGeometry`, computes vertex normals, receives shadows, and does not own gameplay pointer callbacks;
- no `Math.random()` or remote URL.

- [ ] **Step 2: Run focused contracts and verify RED**

Run: `node --import tsx --test tests/hex-naturalistic-world-contract.test.ts tests/hex-graphics-quality-pass.test.ts`

Expected: FAIL because natural terrain/proxy separation does not exist.

- [ ] **Step 3: Implement `HexNaturalTerrain`**

Memoize `buildNaturalTerrainMesh(tiles, seed)`. Construct one `THREE.BufferGeometry` with `position`, `color`, `index`, `computeVertexNormals()`, and stable bounding data. Use a physically restrained `meshStandardMaterial` with `vertexColors`, `metalness={0}`, terrain-scale roughness around `0.88–0.96`, receiveShadow and non-water castShadow. This task establishes continuous shape first; richer surface breakup is Task 4.

- [ ] **Step 4: Convert `HexTileInstances` into a hidden picking proxy in normal presentation**

Add explicit prop:

```ts
presentation?: 'visible' | 'proxy';
```

Default can remain `'visible'` for isolated backward compatibility, but `HexWorld3D` must pass `presentation="proxy"`. Proxy mode:
- keeps `instancedMesh`, instance ordering, pointer move/out/click, rise lifecycle if required for authoritative expansion interaction;
- removes visible material contribution using `meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}`;
- does not perform hover/selected visual lift or per-instance colors because those now belong to overlays.

- [ ] **Step 5: Implement contextual `HexBuildGridOverlay`**

Render instanced thin rings / translucent six-sided guides at exact `axialToWorld` positions. Consume authoritative tile height only. Show only provided guidance keys and use the established valid/invalid/selected palette. No permanent full-map grid.

- [ ] **Step 6: Wire scene composition**

`HexWorld3D` should mount:

```tsx
<HexNaturalTerrain tiles={snapshot.tiles} seed={snapshot.world.seed} profile={profile} />
<HexTileInstances ... presentation="proxy" />
<HexBuildGridOverlay ... />
```

The overlay visibility condition is derived from existing state already passed into the world: building preview/valid/invalid sets and expansion placement preview. Do not change API or controller authority.

- [ ] **Step 7: Run focused contracts and verify GREEN**

Run: `node --import tsx --test tests/hex-natural-terrain.test.ts tests/hex-naturalistic-world-contract.test.ts tests/hex-graphics-quality-pass.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat: separate natural terrain from hex picking`

---

### Task 3: Generate one organic geological cliff shell

**Files:**
- Create: `lib/hex-world/island-boundary.ts`
- Create: `components/hex-world/terrain/HexIslandCliffShell.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify or retire visual primary role: `components/hex-world/HexIslandUnderside.tsx`
- Create: `tests/hex-island-boundary.test.ts`
- Update: `tests/hex-naturalistic-world-contract.test.ts`

**Interfaces:**
- Consumes: `NaturalTerrainBoundaryEdge[]`, world seed, quality profile.
- Produces:
  ```ts
  export type IslandCliffMeshData = {
    positions: number[];
    indices: number[];
    colors: number[];
  };

  export function buildIslandCliffMesh(
    edges: NaturalTerrainBoundaryEdge[],
    seed: string,
  ): IslandCliffMeshData;
  ```

- [ ] **Step 1: Write failing boundary/cliff tests**

Verify deterministic output, finite geometry, non-empty shell for a starter island, every top edge starts at the terrain boundary coordinates, lower vertices are below top vertices, underside taper moves lower positions inward rather than outward, and source boundary data is unchanged. Source contract must reject `dodecahedronGeometry` as the primary island underside renderer.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --import tsx --test tests/hex-island-boundary.test.ts tests/hex-naturalistic-world-contract.test.ts`

Expected: FAIL because boundary shell modules do not exist.

- [ ] **Step 3: Implement deterministic cliff mesh**

For each outer edge, derive a stable edge seed from `tileKey + start/end`. Use deterministic ratios for:
- soil lip depth: `0.16–0.28`;
- rock wall depth: `1.35–2.8`;
- lower taper: `0.62–0.78` toward island center;
- restrained lateral erosion jitter <= `0.08` world units.

Emit connected quad strips for soil band and rock band with triangles. Vertex colors encode earth-to-rock transition. `Math.random()` forbidden.

- [ ] **Step 4: Implement `HexIslandCliffShell`**

Build BufferGeometry from terrain boundary edges. Use one or two physically restrained materials/groups (earth and rock) or vertex-color standard material. Compute normals. Allow small existing floating fragments only as secondary composition, never as the island mass itself.

- [ ] **Step 5: Replace old underside in `HexWorld3D`**

Mount `HexIslandCliffShell` as the visible island side/underside. Remove `HexIslandUnderside` from primary scene composition. Keep any pure `getBoundaryTiles` helper only if other tests/imports still require it; do not leave two competing underside renderers.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-natural-terrain.test.ts tests/hex-island-boundary.test.ts tests/hex-naturalistic-world-contract.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: render organic floating island shell`

---

### Task 4: Ground the palette and terrain/vegetation materials

**Files:**
- Modify: `lib/hex-world/visual-theme.ts`
- Modify: `lib/hex-world/quality.ts`
- Modify: `components/hex-world/HexTerrainDetails.tsx`
- Modify: `components/hex-world/HexAmbientDecor.tsx`
- Update: `tests/hex-graphics-quality-pass.test.ts`
- Update: `tests/hex-premium-motion-contract.test.ts`
- Update: `tests/hex-naturalistic-world-contract.test.ts`

**Interfaces:**
- Consumes: current quality profile, deterministic visual ratio, v2 wind profile.
- Produces: restrained natural palette, bounded natural ground vegetation, branch/leaf-cluster trees with existing wind.

- [ ] **Step 1: Write failing natural-material / vegetation contracts**

Require:
- restrained terrain palette tokens for grass, exposed soil, path dirt, cliff rock, damp bank;
- quality profile contains explicit natural detail budgets such as `groundCoverPerTile` and `treeLeafClusters` with high > medium > mobile;
- terrain detail remains instanced and deterministic;
- ambient trees include branch geometry and multiple leaf-cluster batches;
- no dodecahedron canopy is used as the dominant World tree canopy;
- no `Math.random()` or remote asset URLs;
- existing `worldWindScale/worldWindSecondaryScale` remains used.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-naturalistic-world-contract.test.ts`

Expected: FAIL on old palette, missing budgets, and dodecahedron canopy.

- [ ] **Step 3: Extend quality budgets without new tier names**

Add bounded fields:

```ts
groundCoverPerTile: 5 | 3 | 1;
treeLeafClusters: 7 | 5 | 3;
cliffDetailScale: 1 | 0.7 | 0.4;
```

Keep adaptive high/medium/mobile logic unchanged.

- [ ] **Step 4: Ground `HEX_VISUAL_THEME`**

Shift terrain and structures away from pastel saturation. Add explicit tokens like:

```ts
terrain.pathDirt
terrain.cliffRock
terrain.dampBank
structures.glass
structures.metal
```

Keep seasonal/weather environment API unchanged.

- [ ] **Step 5: Naturalize ground details while preserving instancing**

Replace single chunky grass cones with multiple narrow blade/clump batches and smaller irregular stone flecks. Keep deterministic density and build/path readability. Use profile budgets; do not create one React component per blade.

- [ ] **Step 6: Naturalize ambient tree silhouette**

Retain instanced `SwayInstanceBatch` and v2 two-frequency wind. Use:
- tapered trunk batch;
- 2–3 branch batches with thin cylinders at stable offsets/angles;
- several small non-uniform leaf-cluster batches around branch endpoints rather than one geometric canopy mass.

Individual clusters may use low-segment rounded geometry, but the overall canopy silhouette must be irregular and branch-led, not a single sphere/dodecahedron. Maintain deterministic bucket phase and quality budgets.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-premium-motion-contract.test.ts tests/hex-naturalistic-world-contract.test.ts tests/hex-adaptive-quality.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat: naturalize terrain and vegetation`

---

### Task 5: Rebuild core structures and nature assets with believable massing

**Files:**
- Modify: `components/hex-world/models/HexStructureModels.tsx`
- Modify: `components/hex-world/models/HexNatureModels.tsx`
- Modify: `components/hex-world/HexBuildings.tsx`
- Update: `tests/hex-graphics-quality-pass.test.ts`
- Update: `tests/hex-naturalistic-world-contract.test.ts`

**Interfaces:**
- Consumes: existing `buildingKey`, `tier`, `ghost`, `selected`; current building transform/persistence lifecycle.
- Produces: naturalistic authored geometry for Home/Barn/Storage/Workshop and buildable nature objects without changing model dispatch or DTOs.

- [ ] **Step 1: Write failing natural-structure contracts**

Replace the old “miniature construction primitives” assertion with behavior/design architecture requirements:
- Home/Barn/Storage/Workshop cases remain present;
- helper geometry includes `PitchedRoof`, `WallPanel` or equivalent material-separated architectural helpers;
- primary roofs do not use `coneGeometry`;
- windows use a distinct glass material token;
- foundations/thresholds/beams remain separate geometry;
- core structure source has no runtime URL;
- `HexBuildings` still receives authoritative tile height and has no API/Prisma writes;
- buildable tree no longer uses `dodecahedronGeometry` as canopy.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-naturalistic-world-contract.test.ts`

Expected: FAIL on box+cone primary massing and buildable tree canopy.

- [ ] **Step 3: Add reusable authored architectural primitives**

Inside `HexStructureModels.tsx` or focused local helpers, implement:
- `StoneFoundation` with segmented stones / grounded skirt;
- `WallPanel` with controlled thickness and optional siding strips;
- `PitchedRoof` using `bufferGeometry` roof planes + ridge/fascia, not a rotated four-sided cone;
- `NaturalWindow` with frame, dark glass, restrained emissive only at evening-compatible existing level;
- `TimberBeam` / threshold helpers.

Keep geometry local and reusable; no new dependency.

- [ ] **Step 4: Recompose the four structures**

Home: plaster/siding + timber trim + pitched roof + porch/threshold.
Barn: timber/plank wall treatment + larger door + pitched/gabled roof + grounded foundation.
Storage: compact shed proportions + believable roof/eaves/door.
Workshop: rural workshop with timber/plaster separation, chimney/vent and glass.

Use the same existing building keys and tier embellishments. Avoid exaggerated selected scaling inside the models so `HexBuildings` remains the single selection motion owner.

- [ ] **Step 5: Naturalize buildable nature models**

Tree: trunk + branches + irregular leaf clusters. Flower patch: smaller petals/leaves and less geometric heads. Pond: smoother irregular bank silhouette with natural stone/reed dressing and no obvious six-sided base. Garden patch: rectangular/organic soil bed dressing rather than a visible hex cylinder.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts tests/hex-naturalistic-world-contract.test.ts tests/hex-premium-motion-contract.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: rebuild naturalistic homestead models`

---

### Task 6: Naturalize water, lighting, atmosphere, and camera scale perception

**Files:**
- Modify: `components/hex-world/HexWaterSurface.tsx`
- Modify: `components/hex-world/HexWorldLighting.tsx`
- Modify: `components/hex-world/HexSkyAtmosphere.tsx`
- Modify: `lib/hex-world/camera.ts`
- Modify: `tests/hex-camera.test.ts`
- Update: `tests/hex-graphics-quality-pass.test.ts`
- Update: `tests/hex-world-smoothness-contract.test.ts`
- Update: `tests/hex-naturalistic-world-contract.test.ts`

**Interfaces:**
- Consumes: existing water motion profile, environment state, one-light architecture, semantic camera intents and idle breathing.
- Produces: physically calmer water, natural daylight/haze, less tabletop World camera while preserving build-camera precision and manual authority.

- [ ] **Step 1: Write failing environmental contracts**

Require:
- water preserves two-frequency motion and 3/1/0 ripple budget but uses physically plausible `metalness={0}`, water IOR/physical parameters if `meshPhysicalMaterial` is used, and shallow/deep/damp-bank tokens;
- exactly one directional shadow light remains;
- no heavy post-processing/SSR/CubeCamera;
- World overview vertical-to-lateral slope is lower than current tabletop framing while Build pose remains more top-down than overview;
- camera manual authority/idle breathing constants remain intact;
- sky has below-island haze / softened horizon cue and bounded cloud layers.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --import tsx --test tests/hex-camera.test.ts tests/hex-graphics-quality-pass.test.ts tests/hex-world-smoothness-contract.test.ts tests/hex-naturalistic-world-contract.test.ts`

Expected: FAIL on old camera framing/environment contracts.

- [ ] **Step 3: Improve water treatment**

Preserve existing WaterBucket/ripple motion. Prefer `meshPhysicalMaterial` only if the current Three/R3F types compile cleanly, with restrained values such as `metalness={0}`, `ior={1.33}`, low `transmission` and bounded opacity; otherwise use `meshStandardMaterial` with the same physical restraint. Add deterministic shallow/deep tint variation and bank dressing through existing natural terrain/detail layers. No per-water-body reflection camera.

- [ ] **Step 4: Tune natural light and atmosphere**

Keep ref-based interpolation. Neutralize overly yellow daylight, lower ambient wash, preserve soft contact depth. Strengthen fog/haze below and around the island without hiding gameplay. Keep one directional shadow owner and bounded clouds.

- [ ] **Step 5: Lower World overview camera**

Adjust `getOverviewCameraPose` toward a more location-scale angle, e.g. vertical coefficient around `0.42–0.46` while lateral/depth remain larger. Keep portrait distance penalty. Preserve `getBuildCameraPose` as clearly more top-down than overview. Do not change semantic camera command keys or `HexDioramaCamera` idle/manual lifecycle.

- [ ] **Step 6: Update camera test wording and assertions intentionally**

Rename “diorama” wording to naturalistic location-scale framing and assert a lower overview slope plus unchanged portrait/context/build behavior. Do not weaken the manual-camera regression.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-camera.test.ts tests/hex-graphics-quality-pass.test.ts tests/hex-world-smoothness-contract.test.ts tests/hex-naturalistic-world-contract.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat: ground floating island atmosphere`

---

### Task 7: Verify architecture boundaries and production compatibility

**Files:**
- Update tests only if a stale assertion encodes an intentionally replaced visual implementation.
- No schema/API/persistence files should change.

**Interfaces:**
- Consumes: complete feature branch.
- Produces: exact-head evidence that presentation overhaul did not change gameplay/server authority.

- [ ] **Step 1: Check branch diff for forbidden scope changes**

Compare against base `826aa59b56fca0feb34548ff8598510716d4dea5`. Confirm there are no changes under:
- `prisma/`
- mutation API routes
- auth
- economy/points authority
- undo semantics
unless an evidence-backed build/test fix is strictly required. If such a change appears unintentionally, remove it.

- [ ] **Step 2: Run complete Hex Homestead CI on the exact final branch head**

Required gates:
1. dependency advisory gate;
2. Prisma validation;
3. migrations;
4. security regressions;
5. complete Hex pure suite;
6. DB/Redis undo integration;
7. farm regression;
8. lint;
9. production build;
10. production runtime smoke.

- [ ] **Step 3: Resolve only evidence-backed failures and rerun exact-head CI**

Do not merge a red head. If a legacy source contract expects the intentionally retired visible-hex/miniature implementation, update that assertion only after the replacement-specific test is already RED/GREEN proven.

- [ ] **Step 4: Open/update a draft PR with exact TDD evidence**

PR title: `feat: naturalize the floating homestead`

Record RED/GREEN CI run numbers for the major terrain, cliff, vegetation/material, structures, and environment slices. Record final exact head SHA and full CI result.

- [ ] **Step 5: Mark ready for review after exact-head GREEN**

Keep the PR unmerged until the user explicitly says `merge`.

- [ ] **Step 6: After explicit merge request, squash merge with expected-head protection**

Then verify Railway production metadata contains the resulting `main` SHA with deployment status `SUCCESS` before saying the visual overhaul is live.
