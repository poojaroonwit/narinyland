# Premium Cozy MMORPG Explore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Narinyland's prototype-looking Explore presentation with a polished cozy stylized MMORPG layer while preserving all existing world/build/farm persistence and behavior.

**Architecture:** Keep `HexWorldSnapshot`, Homestead Life, build state, and player traversal authoritative. Add deterministic Explore-only presentation modules for ground dressing, environmental density, structure detail, atmosphere, avatar animation, and HUD; `HexWorld3D` mounts these only when `viewMode === 'person'`, while World mode keeps the current diorama/rendering path.

**Tech Stack:** Next.js 16, React 19, TypeScript, Three.js 0.182, @react-three/fiber 9.5, @react-three/drei 10.7, Tailwind CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-24-premium-cozy-mmorpg-explore-design.md`

## Global Constraints

- No database schema, server API, building footprint, rotation, farming, expansion, undo, or multiplayer changes.
- Explore decoration is presentation-only and deterministic from existing seed/tile/building/environment data.
- World mode remains the default and preserves its existing builder/diorama presentation.
- Movement remains camera-relative and constrained to unlocked tiles.
- Keep one primary shadow-casting directional light and no mandatory EffectComposer/Bloom/DOF pipeline.
- Repeated Explore vegetation/ground details must be instanced or batched and density must scale with the existing quality profile.
- Do not invent combat HP/MP, skills, quests, sprint, jump, physics, touch joystick, or character customization.
- Reduced-motion handling remains centralized and disables decorative motion without removing essential locomotion cues.

---

### Task 1: Deterministic Explore decoration budgets and samples

**Files:**
- Create: `lib/hex-world/explore-decoration.ts`
- Modify: `lib/hex-world/quality.ts`
- Create: `tests/hex-explore-decoration.test.ts`

**Interfaces:**
- Produces `ExploreDecorationKind = 'turf' | 'flower' | 'shrub' | 'rock' | 'path' | 'reed'`.
- Produces `ExploreDecorationSample = { kind; x; y; z; scale; rotation; tone }`.
- Produces `getExploreDecorationSamples({ seed, tiles, profile }): ExploreDecorationSample[]`.
- Extends `HexQualityProfile` with `exploreGroundPerTile`, `exploreDecorPerTile`, and `exploreStructureDetail`.

- [ ] **Step 1: Write failing deterministic/budget tests**

Create fixtures with unlocked grass/soil/stone/water tiles. Assert repeated calls return deep-equal samples, mobile emits fewer samples than medium/high, no locked tile contributes samples, and the total sample count is bounded by `tiles.length * (exploreGroundPerTile + exploreDecorPerTile)`.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --import tsx --test tests/hex-explore-decoration.test.ts`
Expected: FAIL because `explore-decoration.ts` and quality fields do not exist.

- [ ] **Step 3: Implement the pure deterministic generator and quality budgets**

Use `deterministicVisualRatio(seed, q, r, salt)` and `axialToWorld` only. Generate turf/flower/shrub/rock/path/reed samples from terrain type with no React/Three side effects. Add bounded profile values: high `exploreGroundPerTile: 4`, `exploreDecorPerTile: 3`, `exploreStructureDetail: 1`; medium `3/2/0.75`; mobile `1/1/0.4`.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `node --import tsx --test tests/hex-explore-decoration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: add deterministic explore decoration budgets`

---

### Task 2: Explore ground and environment presentation layers

**Files:**
- Create: `components/hex-world/HexExploreGroundLayer.tsx`
- Create: `components/hex-world/HexExploreEnvironmentLayer.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Create: `tests/hex-explore-presentation.test.ts`

**Interfaces:**
- `HexExploreGroundLayer({ tiles, seed, profile })` renders deterministic turf/dirt/path surface dressing with `instancedMesh` batches and no API calls.
- `HexExploreEnvironmentLayer({ tiles, seed, profile, reducedMotion })` renders flowers/shrubs/rocks/reeds with bounded instancing.
- `HexWorld3D` mounts both only inside `viewMode === 'person'`.

- [ ] **Step 1: Write failing source-contract tests**

Assert both new components use `instancedMesh`, contain no `fetch`, `hexWorldAPI`, or Prisma references, and `HexWorld3D` renders them only inside the person-mode branch while keeping `HexTileInstances`, `HexTerrainDetails`, and `HexAmbientDecor` for World mode compatibility.

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `node --import tsx --test tests/hex-explore-presentation.test.ts`
Expected: FAIL because the Explore layers are missing.

- [ ] **Step 3: Implement `HexExploreGroundLayer`**

Use shallow opaque cylinder/disc and box/stone instances positioned slightly above tile tops. Turf patches overlap cell boundaries; soil uses flattened brown patches/furrow strips; stone/path samples use irregular stepping stones. Do not affect raycasting/walkability.

- [ ] **Step 4: Implement `HexExploreEnvironmentLayer`**

Batch flowers, grass tufts/shrubs, rocks, and reeds by kind. Animate only a small deterministic sway amplitude when `reducedMotion === false`; avoid per-frame allocations.

- [ ] **Step 5: Wire person-only layers into `HexWorld3D`**

Keep base tile/building systems mounted for authoritative geometry but add the richer layers only for `viewMode === 'person'`.

- [ ] **Step 6: Run targeted and render-budget tests**

Run: `node --import tsx --test tests/hex-explore-presentation.test.ts tests/hex-render-budget.test.ts tests/hex-world-rendering.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit: `feat: add lush explore ground and environment`

---

### Task 3: Designed player avatar and cozy RPG camera

**Files:**
- Modify: `components/hex-world/HexPlayerAvatar.tsx`
- Modify: `components/hex-world/HexPlayerController.tsx`
- Modify: `tests/hex-player-controller-contract.test.ts`
- Create: `tests/hex-explore-avatar.test.ts`

**Interfaces:**
- Preserve `HexPlayerAvatar` props: `moving: boolean`, `reducedMotion: boolean`, forwarded `THREE.Group` ref.
- Preserve `HexPlayerController` props and traversal helpers.

- [ ] **Step 1: Write failing avatar/camera tests**

Assert avatar source contains dedicated arm/leg/torso refs and walk-cycle rotation updates rather than only one whole-body bob. Update camera contract to require `minDistance={2.6}`, `maxDistance={5.2}`, a default reset position in the 3.4-4.2 unit range, and unchanged editable-target/WASD protections.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --import tsx --test tests/hex-explore-avatar.test.ts tests/hex-player-controller-contract.test.ts`
Expected: FAIL on old primitive animation/camera values.

- [ ] **Step 3: Rebuild the procedural avatar**

Use separate torso/pelvis/upper-lower limb groups, readable boots/hands, layered tunic/jacket, belt, scarf/collar, backpack/pouch, and multi-piece hair. Keep adult scale around the existing family-member scale. Use transform animation: opposing arm/leg swing, foot lift, torso counter-rotation, pelvis movement, idle breathing/weight shift; reduced motion removes decorative idle/bob but keeps essential walk limb movement.

- [ ] **Step 4: Tune the controller camera**

Set target around upper torso/head height, `minDistance={2.6}`, `maxDistance={5.2}`, lower RPG pitch, default camera offset around 3.8 world units, stronger but smooth follow damping, and no change to walkability or movement input logic.

- [ ] **Step 5: Run player and camera regression tests**

Run: `node --import tsx --test tests/hex-explore-avatar.test.ts tests/hex-player-controller-contract.test.ts tests/hex-player-exploration.test.ts tests/hex-camera.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit: `feat: upgrade explore avatar and camera`

---

### Task 4: Person-scale structure details and atmosphere

**Files:**
- Create: `components/hex-world/HexExploreStructureDetails.tsx`
- Create: `components/hex-world/HexExploreAtmosphere.tsx`
- Modify: `components/hex-world/HexWorldLighting.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `lib/hex-world/visual-theme.ts`
- Create: `tests/hex-explore-atmosphere.test.ts`

**Interfaces:**
- `HexExploreStructureDetails({ buildings, tiles, profile })` adds porch/steps/lantern/planter/crate/barrel/fence details around existing building anchors only.
- `HexExploreAtmosphere({ profile, environment })` owns Explore fog and distant low-detail floating-island silhouettes; visual-only.
- `HexWorldLighting` accepts optional `viewMode?: HexViewMode` and keeps exactly one `directionalLight`.

- [ ] **Step 1: Write failing atmosphere/detail contracts**

Assert Explore detail/atmosphere components contain no persistence/network calls; one directional shadow light remains; no EffectComposer/Bloom/DOF appears; `HexWorld3D` mounts structure details/atmosphere only in person mode.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --import tsx --test tests/hex-explore-atmosphere.test.ts tests/hex-render-budget.test.ts`
Expected: FAIL because modules are missing.

- [ ] **Step 3: Implement structure detail overlay**

For `home`, `barn`, `storage`, and `workshop`, derive anchor world transforms and add eye-level porch steps, timber/stone accents, lanterns, planters, crates/barrels, and entrance props. Scale density by `profile.exploreStructureDetail`; do not alter building transforms/footprints.

- [ ] **Step 4: Implement Explore atmosphere and lighting tune**

Use scene fog and simple low-poly distant island/cloud silhouettes, warmer key/cooler fill balance, and slightly stronger local contrast in person mode. Keep one directional light and current shadow/DPR bounds.

- [ ] **Step 5: Extend centralized Explore palette**

Add Explore character/ground/structure accent values to `HEX_VISUAL_THEME`; avoid scattered arbitrary color constants in new modules.

- [ ] **Step 6: Run atmosphere/render/motion tests**

Run: `node --import tsx --test tests/hex-explore-atmosphere.test.ts tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit: `feat: add cozy explore structure detail and atmosphere`

---

### Task 5: Explore MMORPG HUD without fake combat systems

**Files:**
- Create: `components/hex-world/HexExploreHUD.tsx`
- Modify: `components/hex-world/HexGameplayOverlay.tsx`
- Modify: `components/hex-world/HexWorldToolbar.tsx`
- Create: `tests/hex-explore-hud.test.ts`

**Interfaces:**
- `HexExploreHUD` consumes only existing `HomesteadLifeState`, `snapshot.points`, `musicMuted`, and callbacks for Bag, Goals, music, reset, and return-to-World.
- World mode continues using `HexLivingHUD` + `HexWorldToolbar` unchanged in purpose.

- [ ] **Step 1: Write failing HUD contracts**

Assert Explore HUD reads `level`, `xp`, `energy`, `maxEnergy`, `coins`, `hearts`, and `points`; exposes Bag/Goals/World actions; includes safe-area positioning; and does not contain HP, MP, combat skills/spells, or fake quest data.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --import tsx --test tests/hex-explore-hud.test.ts`
Expected: FAIL because `HexExploreHUD` is missing.

- [ ] **Step 3: Implement compact RPG HUD**

Desktop: bottom-left player/progression card, bottom-center concise movement/action strip, bottom-right Bag/Goals/World utilities. Mobile: safe-area compact strip plus the existing keyboard-movement disclosure. Keep center screen unobstructed and preserve minimum 44px touch targets.

- [ ] **Step 4: Switch overlay chrome by view mode**

In person mode render `HexExploreHUD` instead of the full persistent World HUD/toolbar combination. Keep inventory/goals sheets and callbacks unchanged. In world mode retain the existing `HexLivingHUD` and `HexWorldToolbar` to preserve builder contracts.

- [ ] **Step 5: Run HUD/UI regression tests**

Run: `node --import tsx --test tests/hex-explore-hud.test.ts tests/hex-view-mode.test.ts tests/hex-gameplay-ui-simplification.test.ts tests/hex-ui-consistency.test.ts`
Expected: PASS after updating only stale contracts that explicitly assumed one toolbar for both modes.

- [ ] **Step 6: Commit**

Commit: `feat: add cozy MMORPG explore HUD`

---

### Task 6: Full regression, build, runtime smoke, and final scope review

**Files:**
- Modify only files from Tasks 1-5 if concrete failures are found.

**Interfaces:**
- No new interfaces.

- [ ] **Step 1: Run all Hex pure tests**

Run the workflow-equivalent command used by `.github/workflows/hex-homestead-ci.yml`:
`PURE_HEX_TESTS=$(find tests -maxdepth 1 -name 'hex-*.test.ts' ! -name 'hex-world-undo-db.test.ts' -print | sort | tr '\n' ' '); node --import tsx --test $PURE_HEX_TESTS tests/garden-hex-integration.test.ts tests/production-startup.test.ts`
Expected: 0 failures.

- [ ] **Step 2: Run existing farm regression**

Run: `node --import tsx --test tests/family-farm-game.test.ts`
Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: PASS with TypeScript compilation successful.

- [ ] **Step 5: Run production runtime smoke through repository CI**

Open/update the feature PR to trigger `Hex Homestead CI`; require the workflow's database/Redis integration and standalone `/api/health` + `/login` smoke steps to pass.

- [ ] **Step 6: Review final diff against spec**

Confirm: person-only visual layers, deterministic bounded density, richer avatar/camera/ground/structures/atmosphere/HUD, no schema/API/multiplayer/combat/physics changes, and World mode remains intact.

- [ ] **Step 7: Commit verification fixes if any**

Commit: `fix: harden premium explore presentation`
