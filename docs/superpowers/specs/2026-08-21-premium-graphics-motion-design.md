# Narinyland Premium Graphics & Motion Design

**Date:** 2026-08-21  
**Status:** Design approved in chat; written-spec review pending  
**Scope:** `/garden` floating HexWorld only  
**Baseline:** `main` after click-to-place merge (`663c4a89f278159c49f1a3d62ab09db01c77030d`)

## 1. Objective

Upgrade the existing Cozy Floating Hex Homestead from a functional polished 3D builder into a more premium, alive, miniature-diorama experience without rewriting the renderer or weakening mobile performance.

The visual direction remains:

- Magical Floating Garden
- Premium Miniature Diorama
- Cozy, soft, tactile, playful
- Strong silhouette and material readability before expensive effects
- Motion used to communicate state and delight, not as constant spectacle

The upgrade is a presentation-layer polish pass. It does not add gameplay systems, persistence schema, economy rules, NPCs, character control, crafting, weather gameplay, or multiplayer building.

## 2. Current Architecture to Preserve

The current Phase 2 scene is already split into focused modules and this design must extend those boundaries instead of collapsing them into one animation-heavy scene component.

Existing major responsibilities:

- `components/hex-world/HexWorld3D.tsx`
  - scene composition
  - quality-profile resolution
  - mounting lighting, sky, tiles, decor, water, particles, buildings, preview, camera
- `components/hex-world/HexDioramaCamera.tsx`
  - Overview / Focus / Build camera intents
  - interruptible scripted camera interpolation
  - user-controlled orbit with no free pan
- `components/hex-world/HexWorldLighting.tsx`
  - hemisphere + ambient + one directional shadow owner + contact shadows
- `components/hex-world/HexSkyAtmosphere.tsx`
  - background, fog, layered clouds
- `components/hex-world/HexTileInstances.tsx`
  - instanced terrain geometry
  - hover/selected/valid/invalid color states
  - server-confirmed expansion rise animation
- `components/hex-world/HexSelectionEffects.tsx`
  - visual-only footprint/selection ring
- `components/hex-world/HexWaterSurface.tsx`
  - instanced water surfaces and optional ripple detail
- `components/hex-world/HexAmbientDecor.tsx`
  - instanced visual-only trees, rocks, flowers, paths, garden sprouts
- `components/hex-world/HexBuildings.tsx`
  - persisted building transform/rendering/selection
- `components/hex-world/HexBuildingModels.tsx` and model modules
  - local Three geometry, no mandatory remote model loading
- `components/hex-world/HexWorldParticles.tsx`
  - one shared ambient point-particle batch
- `lib/hex-world/quality.ts`
  - High / Medium / Mobile render envelopes
- `components/hex-world/HexBuildController.tsx`
  - semantic builder state, click-to-place, move/rotate/remove, Undo, expansion wiring

These separation boundaries are part of the design and must be preserved.

## 3. Architectural Principle

The renderer should receive semantic state and derive presentation locally.

The build controller may expose semantic animation triggers such as:

- newly placed building id
- recently rotated building id
- recently removed building id before removal transition if needed
- confirmed expansion tile keys

It must not become a general animation timeline engine.

Frame-by-frame animation belongs inside Three scene components through `useFrame`, refs, pure interpolation utilities, and deterministic phase helpers. Avoid React state updates every frame.

## 4. New Shared Motion Module

Create:

`lib/hex-world/motion.ts`

This pure module centralizes motion language and prevents durations/easing values from being scattered across JSX.

It should export a small typed API such as:

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
};
```

The exact implementation may differ, but responsibilities are fixed:

- motion duration constants
- exponential-response values for frame interpolation
- overshoot/spring constants for placement settlement
- deterministic phase helper from stable ids/coordinates
- reduced-motion resolver
- quality-aware animation density

The module must be deterministic and unit tested.

## 5. Reduced Motion

Respect `prefers-reduced-motion: reduce`.

Reduced motion does not remove feedback; it removes unnecessary travel and looping motion.

With reduced motion enabled:

- no cinematic opening camera travel
- no building drop from height
- no overshoot/squash effect
- ghost preview does not bob
- tree/flower idle sway becomes nearly static
- expansion tile travel becomes a short opacity/height transition or immediate state change
- cloud drift is reduced substantially
- selection/valid/invalid color feedback remains
- success/error UI remains readable
- camera still updates to correct framing, but with near-immediate or very short interpolation

Create a small client hook only if needed, for example:

`components/hex-world/useReducedHexMotion.ts`

Do not query media preferences inside many scene components independently if a single resolved motion profile can be passed down.

## 6. Quality Profiles

Retain the existing `high | medium | mobile` model in `lib/hex-world/quality.ts`.

Extend the quality profile only with fields needed by this polish pass, for example:

- `vegetationMotion: 'full' | 'reduced' | 'minimal'`
- `placementParticleCount`
- `waterGlintCount`
- `cloudParallaxScale`
- `materialVariation: 'full' | 'reduced'`

Do not introduce live FPS-based quality switching in this phase.

### High

- max DPR remains bounded at approximately current 1.75 ceiling
- current one primary directional shadow architecture remains
- full deterministic vegetation sway
- full cloud parallax among existing cloud budget
- placement dust/sparkle burst
- optional subtle water glints
- highest terrain tone variation

### Medium

- fewer placement particles
- reduced vegetation amplitude
- simpler water highlight behavior
- current 1024 shadow class preserved
- material identity remains the same as High

### Mobile

- DPR remains approximately 1.0
- no expensive per-object animated effects
- minimal vegetation motion
- smallest particle budget
- no optional water glints
- clouds move slowly with one layer
- terrain/material silhouettes remain visually consistent with High

The quality system should remove detail, not change the artistic identity of the world.

## 7. Terrain Graphics

### 7.1 Preserve Instancing

`HexTileInstances` remains instanced by terrain type.

Do not replace the tile renderer with hundreds of individual meshes.

### 7.2 Tone Variation

Normal tiles should no longer look like a uniform grid of identical colors.

Use deterministic variation based on coordinate/seed, not random values created during render.

Suggested variation envelope:

- grass: approximately ±4–7% lightness/value variation
- soil: approximately ±4–6%
- stone: approximately ±3–5%
- water base terrain should defer visual identity to `HexWaterSurface`

Variation must be subtle enough that the island still reads as one palette.

### 7.3 Top/Side Readability

The island should feel more like a miniature sculpted landmass.

Preferred approach:

- preserve low-poly hex silhouette
- strengthen light-vs-side value separation using material/lighting rather than an additional full mesh per tile when possible
- underside stone/soil depth remains handled primarily by `HexIslandUnderside`
- avoid black outlines or high-contrast cell borders in normal view

### 7.4 Hover Motion

Hover should gain a small physical response:

- target vertical lift: approximately 0.04–0.07 world units
- fast eased response, approximately 120–180ms perceptually
- no scale explosion
- no camera movement

Because tiles are instanced, the implementation should update only required instance transforms while preserving batching.

### 7.5 Build Feedback

In Build mode:

- valid footprint: soft emerald emphasis with slow subtle breathing
- invalid footprint: muted coral emphasis with a short restrained pulse
- selected anchor may be slightly stronger than footprint cells
- normal seams remain minimized outside Build/Expand interaction

Invalid click must not send an API request and must not shake the whole camera.

## 8. Selection Effects

Move current timing constants out of `HexSelectionEffects.tsx` into the shared motion module.

Upgrade the ring from static-only feedback to a restrained animated visual:

- opacity pulse within a small range
- optional tiny scale breathing
- deterministic or time-based but low amplitude
- no extra network behavior
- no dynamic light

Valid, invalid, and selected states retain distinct accessible colors.

## 9. Building Motion

### 9.1 Persisted Buildings Stay Individual

Placed buildings remain individual scene groups. They are few enough that individual transform interpolation is acceptable and improves quality.

### 9.2 Selection

Current immediate selected lift/scale becomes smooth interpolation:

- scale target about 1.025–1.04
- vertical lift about 0.03–0.05
- response approximately 180–220ms
- deselection returns smoothly

No perpetual idle bob for Home/Workshop/Storage. Structural buildings should feel grounded.

### 9.3 Rotation

Persisted rotation changes should animate through the shortest expected 60-degree turn.

- approximately 200–260ms
- ease-out or critically damped interpolation
- server state remains authoritative
- rejected server rotation preserves/returns to authoritative orientation

### 9.4 Placement Celebration

New click-to-place flow remains:

`Build → component → ghost → click/tap valid hex → server mutation → success`

Only after server success should the persisted building perform the placement celebration.

Recommended animation:

1. appear approximately 0.5–0.8 units above target
2. descend quickly
3. subtle overshoot/compression impression
4. settle to final transform
5. emit small shared dust/leaf/sparkle burst

Total perceived duration approximately 320–480ms.

Do not show a committed building before server confirmation.

### 9.5 Ghost Preview

Ghost preview remains clearly non-persisted:

- transparent material identity remains
- optional vertical bob about 0.015–0.03 units
- very slow opacity or scale breath
- movement disabled/reduced under reduced-motion
- invalid ghost may use muted coral tint

The ghost must remain responsive to hover and click-to-place.

### 9.6 Move

Move retains explicit `Move here` confirmation.

Before confirmation:

- original building remains authoritative at source
- proposed target uses ghost preview

After server success:

- source presentation may fade quickly
- target building settles with smaller placement motion than a new build
- Undo token behavior is unchanged

### 9.7 Remove

Removal stays server authoritative.

After confirmed remove, use a short visual exit only if the local architecture can preserve the removed model briefly without lying about persisted state.

Preferred visual:

- scale 1 → approximately 0.86
- opacity fade if model materials allow it cleanly
- optional tiny dust particles
- approximately 180–260ms

If preserving a transient removed render complicates model ownership, skip model fade and use a location-based particle effect instead. Do not introduce persistence complexity just for exit animation.

## 10. Placement Effects

Create:

`components/hex-world/HexPlacementEffects.tsx`

Responsibility:

- visual-only transient effects at confirmed action coordinates
- one shared small particle system or bounded pool
- no one-particle React components
- no network requests
- quality/reduced-motion aware

Effects:

- new building: tiny dust + leaf/sparkle burst
- successful move: smaller dust burst
- invalid click: footprint pulse only; no particle burst needed

High quality should still remain restrained. The effect should read as tactile, not magical fireworks.

## 11. Ambient Vegetation Motion

`HexAmbientDecor` remains instanced.

Add deterministic phase offsets so repeated objects do not sway in sync.

### Trees

- canopy motion is more visible than trunk motion
- trunk rotation/motion tiny
- canopy approximately ±0.5–1.5 degrees depending quality
- slow cycle roughly 3–6 seconds with coordinate-based phase

### Flowers / Sprouts

- smaller/faster response than trees
- extremely low amplitude
- enough to avoid a frozen scene

### Rocks / Paths

Static.

These objects visually anchor the scene and should not move.

### Implementation Constraint

Do not iterate and rewrite large instance matrices unnecessarily if the same impression can be achieved with parent-batch motion or compact instance updates.

If per-instance wind transforms are used, quality profiles must reduce the number/frequency of animated batches.

## 12. Sky and Cloud Motion

Keep the current bounded cloud count.

Upgrade `HexSkyAtmosphere` so cloud layers do not move as one rigid object.

Desired behavior:

- different horizontal drift rates per layer
- tiny vertical drift
- tiny scale breathing only if cheap
- foreground/background parallax impression
- no cloud shadows
- no volumetric cloud shaders

High quality uses all current cloud layers; Medium and Mobile retain existing reduced layer counts.

Fog/background palette remains pastel and should not obscure terrain readability.

## 13. Lighting and Material Pass

Preserve one main real-time directional shadow light.

No per-building point lights.

Upgrade goals:

- warmer key light
- slightly cooler sky/fill relationship
- softer miniature-style shadows
- stronger material separation without oversaturation
- structural wood/stone/roof materials get coherent roughness/value treatment
- warm windows should use emissive material only where appropriate, not dynamic lights

Avoid mandatory post-processing.

No required Bloom, SSAO, DOF, SSR, or planar reflections.

If any optional post effect is later considered, it must be feature-gated to High and cannot be required for the scene to look correct. It is outside the core acceptance criteria of this design.

## 14. Water Upgrade

Preserve the instanced water architecture.

Current water already has a vertical bob and optional rings. Upgrade it into a calmer premium pond treatment.

Desired characteristics:

- translucent soft turquoise
- moderately high roughness
- asynchronous ripple phase rather than every tile moving as one slab
- subtle darker edge/value relationship
- High may show a very small count of moving glints/rings
- Medium simplified ripples
- Mobile basic static/translucent surface with minimal motion

No planar reflection.

No expensive refraction shader required.

Decorative reeds/stones may be added using existing ambient instancing patterns if deterministic and bounded.

## 15. World Particles

Keep one shared ambient particle batch.

Ambient particles should remain subtle:

- pollen/dust feeling
- slow vertical drift
- low opacity
- not a starfield

Placement particles are a separate bounded transient concern and should not multiply persistent draw calls significantly.

Particle counts remain quality controlled.

## 16. Camera Motion Language

Preserve `HexDioramaCamera` intent architecture and user-interrupt behavior.

### Overview

- island framed with current bounds logic
- slightly slower premium settle on first entry
- no automatic orbit

### Focus

- smooth target and distance transition
- enough island context remains visible
- avoid aggressive zoom

### Build

- almost no unsolicited camera movement while the user is trying to click a tile
- when target anchor changes, camera should not chase every hover
- only intentional camera intent changes should trigger meaningful movement

### Expansion

- server-confirmed expansion may trigger a gentle reframe
- approximately 700–1000ms
- user interaction interrupts scripted motion

### Invalid Placement

No camera shake.

## 17. Opening Presentation

The first entry should feel more crafted without blocking interaction.

Preferred behavior:

- scene renders immediately
- camera begins from a slightly elevated/wider position and settles into Overview
- clouds already drifting
- island detail visible immediately
- interaction remains available; cinematic motion is interruptible

Reduced-motion users get direct Overview framing.

No splash screen and no non-interactive intro sequence.

## 18. Expansion Motion

Existing server-confirmed tile rise remains the base.

Upgrade sequence after server success:

1. amber ghost cluster disappears
2. light mist/dust begins at expansion edge
3. tiles rise with short stagger derived deterministically from cluster coordinate ordering
4. optional edge vegetation/decor appears after tile settle
5. camera reframes only when the new land would sit outside comfortable bounds

Keep total sequence approximately 700–1100ms.

Expansion remains non-undoable and the Points transaction is unchanged.

## 19. Click-to-Place Preservation

The recently approved Build interaction is a hard requirement:

- Build catalog item selection enters placing mode
- hover/tap shows ghost and footprint
- click/tap a valid hex calls Place immediately
- there is no second `Place` confirm button
- invalid click sends no mutation
- rapid double-click remains guarded
- rotate/cancel remain available
- successful placement exits placing state and surfaces the existing short-lived Undo token
- Move remains explicitly confirmed with `Move here`

Graphic/motion work must not regress this flow.

## 20. Server Authority and Data Integrity

No Phase 3 graphic/motion code may weaken these existing rules:

- server validates building catalog definitions
- server validates footprint/terrain/unlocked/occupancy
- Place/Move/Rotate/Remove remain authoritative mutations
- Undo remains Redis-backed, short-lived, scoped to authenticated config/Land/user
- `HexWorld.revision` stale-edit protection remains
- expansion Points charging remains authoritative and transactional
- stale responses from a previous Land cannot write into the active Land

No database migration is expected for this phase.

If implementation discovers a genuine need for persistence changes, stop and reclassify scope before adding them.

## 21. Component/File Plan

### New files expected

- `lib/hex-world/motion.ts`
- `components/hex-world/HexPlacementEffects.tsx`
- optional `components/hex-world/useReducedHexMotion.ts`
- tests dedicated to motion config and graphic contracts

### Existing files expected to change

- `components/hex-world/HexWorld3D.tsx`
- `components/hex-world/HexDioramaCamera.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `components/hex-world/HexSkyAtmosphere.tsx`
- `components/hex-world/HexTileInstances.tsx`
- `components/hex-world/HexSelectionEffects.tsx`
- `components/hex-world/HexWaterSurface.tsx`
- `components/hex-world/HexAmbientDecor.tsx`
- `components/hex-world/HexBuildings.tsx`
- selected building model modules where material tuning is needed
- `components/hex-world/HexBuildController.tsx` only for semantic confirmed-action trigger wiring
- `lib/hex-world/quality.ts`
- `tests/hex-render-budget.test.ts`
- `tests/hex-phase2-acceptance.test.ts` or a new Phase 3 acceptance file

Do not combine unrelated application-shell work into this phase.

## 22. Motion Timing Targets

These are design targets, not reasons to hard-code magic numbers in JSX.

- hover response: perceptual 120–180ms
- selection lift: 180–220ms
- rotation: 200–260ms
- new placement settle: 320–480ms
- move settle: 240–380ms
- removal feedback: 180–260ms
- invalid footprint pulse: 100–160ms
- opening camera settle: approximately 650–1000ms, interruptible
- expansion sequence: 700–1100ms
- cloud loops/drift: continuous and very slow
- vegetation loop: roughly 3–6 seconds with seeded phase

Motion should feel soft and weighted, not rubbery.

## 23. Interaction Acceptance Flow

The implementation is accepted only when this sequence works without visual or state dead ends:

`Open Garden`
→ world renders immediately
→ camera settles softly
→ orbit/zoom remain responsive
→ clouds/water/vegetation exhibit restrained independent motion
→ Build
→ select component
→ hover valid tile
→ ghost/footprint feedback responds
→ click valid hex
→ one mutation only
→ server confirms
→ persisted building settles with placement effect
→ Undo appears
→ Undo restores world correctly
→ select building
→ smooth selection lift
→ rotate
→ server confirms and visual rotation settles
→ Move
→ target ghost
→ Move here
→ settle at confirmed target
→ Remove
→ server confirmation + restrained removal feedback
→ Expand
→ select amber cluster
→ confirm
→ server transaction succeeds
→ staggered tile rise + optional reframe
→ Reset View
→ switch Land during/after animations
→ no stale animation or snapshot leaks into new Land
→ reload
→ persisted layout remains correct

## 24. Accessibility and Input

- click/tap placement remains primary
- minimum 44–48px UI targets remain
- motion cannot be the only state indicator
- valid/invalid still use color plus footprint/shape/context copy where applicable
- reduced-motion is respected
- keyboard rotate/cancel/confirm behavior remains logical; Enter may still place current valid keyboard-selected anchor, but pointer click remains the normal Build path
- no hover-only essential behavior on touch devices

## 25. Performance Acceptance

The visual pass is not accepted if it destroys the Phase 2 performance discipline.

Hard constraints:

- terrain remains instanced
- ambient repeated decor remains instanced where practical
- no per-tile React component explosion
- one main directional real-time shadow owner
- no per-building point-light fleet
- no planar reflection
- no mandatory heavy post-processing
- bounded DPR by quality profile
- bounded persistent particle count
- placement effects use a bounded pool/shared batch
- hidden/inactive page should not continue unnecessary high-frequency animation work where practical
- no network writes from hover/idle animation

Regression tests should assert architecture-level performance rules where reasonable.

## 26. Testing Strategy

Implementation must follow RED → GREEN TDD.

### Pure tests

Add tests for:

- motion profile resolution
- reduced-motion overrides
- deterministic motion phase helper
- quality-profile graphic/motion budgets

### Static/contract tests

Assert:

- `HexWorld3D` mounts the new placement-effects layer
- heavy post-processing packages/components are not required
- click-to-place contract remains
- one main shadow owner remains
- cloud count remains bounded by quality profile
- ambient repeated geometry remains instanced
- no animation code adds network writes

### Interaction regression

Keep/extend existing tests for:

- click-to-place
- invalid placement
- double-click guard
- Move confirmation
- Undo
- stale Land responses
- expansion confirmation

### Build gates

The branch must pass:

- Prisma validate/migrate chain even though no migration is expected
- all Hex pure/acceptance tests
- Postgres + Redis Undo integration
- family-farm regression
- lint
- production build

## 27. Visual QA Checklist

Desktop High:

- island reads as a miniature world before individual hexes
- terrain variation is visible but not noisy
- lighting has clear warm key / soft fill separation
- Home remains visual focal point
- clouds exhibit parallax rather than moving as one slab
- trees do not sway in perfect sync
- pond looks calm, not gelatinous
- placement effect is satisfying but short
- ghost is obviously temporary
- no camera chase during normal hover

Desktop Medium:

- artistic identity matches High
- effects are reduced, not missing essential feedback

Mobile:

- no frame-heavy particle/vegetation overload
- controls remain clear and tappable
- Build click-to-place remains reliable
- no UI overflow
- no excessive camera movement

Reduced Motion:

- interaction remains fully understandable
- state changes remain visible
- no large animated travel required to operate the builder

## 28. Failure Handling

Graphic effects must never hide or change the meaning of server failures.

Examples:

- failed Place: no committed placement celebration; remain in placement mode and surface existing error
- failed Move: original building remains authoritative
- failed Rotate: visual orientation returns/preserves server state
- failed Remove: building remains present
- failed Expand: no tile-rise celebration and no false camera reframe
- Undo conflict/unavailable: existing copy remains; no misleading reverse animation

Effects start from confirmed semantic events wherever persistence is involved.

## 29. Non-Goals

Explicitly out of scope:

- farming/resource economy
- crop growth gameplay
- crafting
- production chains
- NPCs
- playable avatar
- WASD movement
- multiplayer building
- seasons
- weather gameplay
- day/night gameplay system
- procedural terrain sculpting
- long Undo history
- expansion Undo/refunds
- physics simulation
- destructible buildings
- mandatory bloom/DOF/SSAO/SSR
- planar water reflections
- migration/persistence redesign

## 30. Completion Criteria

This phase is complete when:

1. The island looks materially richer without changing its established cozy art direction.
2. Normal idle scene feels alive through restrained cloud, water, particle, and vegetation motion.
3. Click-to-place has a server-confirmed tactile placement celebration.
4. Building selection and rotation no longer snap visually.
5. Invalid interactions communicate locally without camera shake.
6. Camera motion feels premium and remains interruptible.
7. Expansion presentation is more polished but remains server-confirmed and non-undoable.
8. Reduced-motion users retain full usability with minimized movement.
9. High/Medium/Mobile profiles preserve the same art identity at different cost envelopes.
10. Existing server authority, Undo, Land isolation, expansion charging, and legacy/family-farm behavior remain intact.
11. Hex + Redis integration + farm regression + lint + production build are green on the exact implementation head.
12. Railway deploy starts with additive migration-only startup behavior and `/api/health` succeeds before production is declared verified.
