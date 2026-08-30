# Cozy Floating Homestead — Floating Island Visual Overhaul

Date: 2026-08-30
Status: Approved direction, implementation not started
Target: Narinyland 3D floating-island world

## Goal

Make Narinyland read immediately as a warm, premium **floating homestead island in the sky**, not a thin land plate with terrain textures. The change must be obvious from the normal World camera before the player interacts with anything.

The visual target combines cozy family-sim readability with a stronger fantasy floating-island silhouette. The top remains welcoming and grounded; the underside becomes deeper, more sculptural, and more atmospheric.

## Current Problem

The current scene already has PBR terrain, a boundary-driven cliff shell, floating rock fragments, sky haze, lighting, vegetation, structures, and camera framing. However, the island body is visually too shallow relative to its footprint. The current cliff profile uses a small soil lip and a rock wall roughly 1.35–2.8 world units deep with a relatively smooth radial taper. This makes the world read more like a thick terrain slab than a dramatic floating island.

Floating fragments are also placed from a small fixed set, and the current contact shadow under the island can weaken the sky-floating illusion by suggesting an invisible support plane.

Previous work on terrain texture readability remains valid but is not sufficient for this goal. This redesign changes the 3D silhouette and depth cues, not merely the material contrast.

## Approved Art Direction

### Cozy Floating Homestead

The island should have three strongly readable vertical zones:

1. **Living top** — soft grass, soil paths, farm plots, home, vegetation, family activity.
2. **Earth rim** — visible grass overhang and exposed warm soil around the boundary.
3. **Rock core** — a substantially deeper irregular stone body tapering into multiple downward spires instead of one smooth cone-like wall.

The visual mood should remain friendly, bright, and playable. The underside should add drama without turning the game into dark fantasy.

## Success Criteria

From the default World overview camera, without opening UI or entering Explore mode:

- The island must visibly read as floating above clouds.
- The underside must occupy enough screen space to feel volumetric.
- The silhouette must contain multiple irregular downward rock masses/spires.
- The top surface must remain dominant enough for building and farming readability.
- The boundary must show a clear grass/soil/rock transition.
- Smaller floating fragments should reinforce the main island rather than feel like four manually positioned props.
- Lighting must separate the warm top from the cooler underside while preserving PBR material response.
- Cloud/haze layers must sit clearly below and around the island, never visually intersecting the playable top.
- Build mode, selection, placement, movement, saves, authoritative hex state, and Homestead Life state must be unchanged.

## Architecture

The overhaul stays presentation-only. Existing authoritative tiles, buildings, persistence, expansion logic, and gameplay state are not modified.

The main rendering order remains centered in `HexWorld3D.tsx`:

- sky / atmosphere
- environment lighting
- island cliff/core
- floating fragments
- terrain
- proxy picking mesh / build grid
- water / vegetation / dressing
- buildings / living world
- camera

The redesign introduces richer geometry derived deterministically from the existing terrain boundary and world seed. No new database fields are required.

## 1. Island Body and Silhouette

### Current behavior

`buildIslandCliffMesh()` generates a soil band and a single rock-wall band from each boundary edge. Its lower point is radially tapered toward the island center.

### New behavior

Replace the simple two-band vertical profile with a multi-level sculpted island core.

Each boundary vertex should deterministically derive a profile from the existing world seed:

- grass/soil overhang offset
- soil lip depth
- upper-rock inset/outset
- mid-rock depth
- lower-rock taper
- primary spire depth
- local erosion/jitter
- spire influence weight

The main rock core should be approximately **2–3× deeper than the current visual body** at its most important silhouette points. Exact depths remain bounded and scale-aware rather than hardcoding one giant cone.

The bottom must not converge into a single center point. Instead, deterministic regional anchors should form several broad rock lobes/spires. Neighboring boundary vertices should share regional influences so the geometry remains coherent rather than noisy.

### Shape language

Prefer:

- broad natural overhangs
- stepped rock masses
- asymmetrical downward spires
- occasional flatter shelves
- a few strong silhouette cuts

Avoid:

- perfect cone
- equal-depth teeth around every edge
- noisy per-vertex spikes
- repeated hexagonal outlines
- stalactite forest density

## 2. Grass Lip and Exposed Soil

The top edge should visually separate from the rock core.

The grass surface can extend slightly beyond the upper soil band in selected deterministic segments, creating a natural turf overhang. This should be geometry-driven or boundary-offset-driven, not a fake transparent fringe.

The exposed soil band should be thicker and more visible than today but remain secondary to the rock body. Existing local soil PBR textures remain the source material.

Target read from overview:

`grass top → dark green/soil edge → warm brown earth → cooler stone core`

## 3. Rock Core Materials

Keep the existing local PBR cliff texture set and material ownership model.

Material tuning should create clearer vertical separation:

- upper soil: warmer, slightly brighter
- upper rock: neutral stone
- lower rock: subtly cooler/darker through lighting and bounded material tint, not a flat unlit color

Normal and roughness maps remain active. No replacement with vertex-color-only rendering.

Large-scale UV repetition must be tuned so the deeper core does not visibly tile like wallpaper.

## 4. Rock Spires and Secondary Masses

The main shell should carry the primary silhouette. Additional attached or near-attached rock masses may be generated as a bounded secondary layer if the shell alone cannot produce convincing volume.

Secondary masses must:

- be deterministic from world seed
- remain presentation-only
- use instancing where repeated model assets are used
- avoid intersecting the playable top
- stay within quality-tier budgets
- cluster near the underside, not randomly across the whole sky

High quality may show the full set; medium reduces count; mobile keeps only the most compositionally important masses.

## 5. Floating Debris / Mini-Islands

Replace the current impression of four manually placed rock fragments with a deterministic composition derived from island bounds and seed.

Composition rules:

- 6–12 potential placements on high quality, fewer on medium/mobile
- most pieces below the playable top
- several close to the main silhouette, a few farther away for depth
- varied scale and vertical position
- avoid even radial spacing
- never block the default camera view of important buildings
- use the existing local scanned rock-set model

A small number of larger fragments may resemble tiny broken-off island pieces, but they must not imply playable land unless the expansion system actually unlocks them.

## 6. Clouds and Atmospheric Depth

The cloud system should sell altitude by placing the strongest cloud/haze layers **below the island body**.

Changes:

- lower the main cloud field relative to the playable top
- distribute clouds at multiple Y depths below the island
- keep some distant horizon haze behind the island
- avoid cloud meshes intersecting the grass top or buildings
- make cloud parallax subtly reinforce camera movement

The below-island haze should frame the lower spires but not wash them out completely.

The scene background remains bright and cozy, with weather/season variation preserved.

## 7. Lighting

The top remains warm and readable. The underside gains stronger form separation.

Lighting intent:

- one existing directional shadow owner remains authoritative
- warm directional daylight from above/side
- hemisphere/ambient fill remains bounded
- lower rock receives less warm fill, giving a naturally cooler/darker underside
- no extra shadow-casting key lights
- no heavyweight post-processing requirement

The current `ContactShadows` treatment should be reconsidered for World mode. A ground-like shadow plane directly beneath the island should not imply physical support. If contact shadows are still useful for buildings/top-surface grounding, they should be restricted/repositioned so they do not create an island-sized floor cue.

## 8. Camera and Framing

The World overview camera must expose the new underside.

The default framing should show enough top surface for gameplay while allowing a visibly deeper lower body in frame. The camera may become slightly lower or the target may shift upward relative to the island center, but build mode must remain more top-down and operational.

Constraints:

- preserve existing semantic camera intents (`overview`, `focus`, `build`)
- preserve manual OrbitControls behavior
- no camera chase from hover
- retain mobile-safe framing
- do not make the default angle so low that buildings hide behind the island rim

## 9. Vegetation and Edge Dressing

Vegetation should reinforce the cozy top and the island edge without adding excessive clutter.

Potential edge cues:

- slightly denser grass tufts near selected rim segments
- occasional shrubs near safe edge pockets
- mossy rock transitions where existing scanned assets fit
- exposed root-like visual accents only if they can be implemented cheaply with existing/local geometry

No new gameplay collision or authority is introduced.

## 10. Water

Existing PBR water behavior remains authoritative for visual water surfaces.

This phase does **not** require a waterfall. A waterfall can be a later fantasy-polish phase because it introduces additional geometry, particles, edge placement rules, and performance work.

The island overhaul must stand on its own without a waterfall.

## 11. Quality and Performance Budgets

The existing named quality profiles remain the only cost buckets: high, medium, mobile.

Guardrails:

- no new mandatory post-processing pipeline
- one directional shadow owner
- reuse existing PBR textures/models
- deterministic generation, no runtime network asset dependency
- batch/instance repeated debris where possible
- mobile keeps the new silhouette but reduces secondary fragments and fine detail
- geometry generation is memoized from `tiles + seed`
- no per-frame island geometry regeneration

The **primary silhouette must survive all quality tiers**. Mobile may lose small debris, but it must not revert to the old thin-slab island.

## 12. Gameplay and Data Integrity

This is a rendering-only change.

Must not change:

- Prisma schema
- save format
- HexWorld persistence
- expansion tile authority
- building footprints
- tile picking
- selection behavior
- build placement validation
- Homestead Life actions/state
- person traversal authority

The existing transparent HexTileInstances proxy remains responsible for authoritative tile interaction.

## 13. Files Expected to Change

Primary:

- `lib/hex-world/island-boundary.ts`
- `components/hex-world/pbr/HexPBRCliff.tsx`
- `components/hex-world/pbr/HexPBRFloatingFragments.tsx`
- `components/hex-world/HexSkyAtmosphere.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `lib/hex-world/camera.ts` and/or `components/hex-world/HexDioramaCamera.tsx`

Possible focused additions:

- a small deterministic island-silhouette/spire helper under `lib/hex-world/`
- tests dedicated to floating-island depth/composition

`HexWorld3D.tsx` should remain primarily an orchestrator; avoid pushing procedural shape logic into it.

## 14. Testing Strategy

Use TDD.

### Geometry tests

Require:

- deterministic output for a fixed boundary + seed
- finite positions/UVs/indices
- valid material groups
- coherent shared-edge upper geometry
- substantially deeper lower silhouette than the old profile
- bounded depth and taper
- no mutation of terrain boundary input
- several deterministic regional spire influences rather than one center cone

### Composition tests

Require:

- debris placements deterministic for seed/bounds
- quality-bounded counts
- mobile count lower than high
- debris remains below or outside protected gameplay top region
- no fixed four-point-only composition

### Scene contract tests

Require:

- PBR terrain remains separate from proxy picking
- island body remains local/PBR
- one primary shadow owner
- World mode no longer creates a strong island-scale support-plane cue
- atmosphere includes below-island depth layers
- camera overview exposes underside while build camera remains operational

### Full verification

Before merge:

- security regressions
- Hex pure tests
- DB/Redis integration
- existing farm regression
- lint
- production build
- production runtime smoke

## 15. Rollout

Implement on a feature branch from the current `main` that already contains Cozy Family Sim UI PR #62.

Do not merge automatically. Open a PR with visual-overhaul scope and verification evidence. Merge only after explicit approval.

After merge, verify Railway production picked the exact merge commit and reached `SUCCESS`.

## Non-Goals

Not part of this phase:

- new gameplay systems
- new land expansion mechanics
- new save fields
- waterfall simulation
- physics for floating rocks
- destructible island geometry
- dynamic island deformation
- Unreal-style heavy post-processing
- replacing the existing PBR asset pipeline

## Acceptance Summary

The implementation is accepted when the first impression changes from **“flat floating terrain platform”** to **“cozy homestead built on a substantial fantasy island floating above clouds”**, while retaining the current gameplay, persistence, interaction, and performance architecture.
