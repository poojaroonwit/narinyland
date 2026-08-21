# Narinyland Premium Graphics & Motion Design

**Date:** 2026-08-21  
**Status:** Design approved in chat; written-spec review pending  
**Scope:** `/garden` floating HexWorld only  
**Baseline:** `main@663c4a89f278159c49f1a3d62ab09db01c77030d`

## 1. Objective

Upgrade the existing Cozy Floating Hex Homestead into a more premium, alive miniature-diorama experience without rewriting the renderer or weakening mobile performance.

Art direction remains:

- Magical Floating Garden
- Premium Miniature Diorama
- cozy, soft, tactile, playful
- strong silhouettes and material readability before expensive effects
- motion that communicates state and adds delight without becoming constant spectacle

This phase is a presentation-layer polish pass. It does not add gameplay systems, persistence, economy changes, NPCs, character control, crafting, weather gameplay, or multiplayer building.

## 2. Architecture to Preserve

The existing Phase 2 scene already has the right boundaries and this phase extends them rather than rebuilding them.

Preserve these responsibilities:

- `HexWorld3D.tsx` — scene composition and resolved quality/motion profiles
- `HexDioramaCamera.tsx` — Overview / Focus / Build camera intents and interruptible orbit
- `HexWorldLighting.tsx` — hemisphere + ambient + one directional shadow owner + contact shadows
- `HexSkyAtmosphere.tsx` — background, fog, bounded cloud layers
- `HexTileInstances.tsx` — instanced terrain, hover/valid/invalid states, expansion rise
- `HexSelectionEffects.tsx` — visual-only selection/footprint feedback
- `HexWaterSurface.tsx` — instanced water and bounded ripple detail
- `HexAmbientDecor.tsx` — instanced visual-only trees, rocks, flowers, paths, sprouts
- `HexBuildings.tsx` — persisted building transforms and selection
- local building model modules — no mandatory remote model dependency
- `HexWorldParticles.tsx` — one shared ambient particle batch
- `quality.ts` — High / Medium / Mobile envelopes
- `HexBuildController.tsx` — semantic builder state, click-to-place, Move/Rotate/Remove, Undo, expansion

Frame-by-frame animation belongs in Three scene components through refs, pure interpolation utilities, and `useFrame`. Do not update React state every frame.

`HexBuildController` may emit confirmed semantic animation triggers, but it must not become a timeline/animation engine.

## 3. New Motion Foundation

Create:

`lib/hex-world/motion.ts`

Responsibilities:

- shared motion durations
- exponential response/spring constants
- deterministic phase helper from stable ids/coordinates
- reduced-motion resolver
- quality-aware animation density
- pure interpolation helpers where useful

Suggested shape:

```ts
export type HexMotionProfile = {
  hoverResponse: number;
  selectResponse: number;
  cameraResponse: number;
  placementDurationMs: number;
  rotationDurationMs: number;
  removalDurationMs: number;
  expansionDurationMs: number;
  ambientScale: number;
  reduced: boolean;
};
```

Exact names may change, but the responsibilities above are fixed. The module must be deterministic and unit tested.

Move timing constants currently living in `HexSelectionEffects.tsx` into this shared module.

## 4. Reduced Motion

Respect `prefers-reduced-motion: reduce` globally for the HexWorld.

Prefer resolving the media preference once and deriving one motion profile that is passed down. Do not independently query the media preference throughout many components.

With reduced motion:

- no cinematic opening camera travel
- no building drop from height
- no overshoot/squash
- ghost does not bob
- vegetation becomes nearly static
- cloud drift is strongly reduced
- expansion travel becomes short/minimal
- camera reaches correct framing immediately or with a very short transition
- selection/valid/invalid state feedback remains visible
- success/error/Undo UI remains fully readable

Motion cannot be the only state indicator.

## 5. Quality Profiles

Retain `high | medium | mobile` in `lib/hex-world/quality.ts`.

Extend only with fields required by this polish pass, such as:

- `vegetationMotion`
- `placementParticleCount`
- `waterGlintCount`
- `cloudParallaxScale`
- `materialVariation`

Do not add dynamic FPS-driven quality switching in this phase.

### High

- DPR remains bounded near the current 1.75 ceiling
- current 2048 shadow class remains
- full deterministic vegetation motion
- full cloud parallax within the existing cloud budget
- small placement dust/leaf/sparkle burst
- optional subtle water glints
- richest terrain tone variation

### Medium

- DPR and 1024 shadow class remain bounded
- reduced placement particles
- reduced vegetation amplitude
- simpler water highlights
- same silhouettes/material identity as High

### Mobile

- DPR remains approximately 1.0
- current low shadow envelope remains
- minimal vegetation movement
- smallest particle budget
- no optional water glints
- one slow cloud layer
- same art identity with less detail

Quality removes cost, not artistic identity.

## 6. Terrain Graphics and Interaction

`HexTileInstances` remains instanced by terrain type. Do not create a React component or mesh per tile.

### Deterministic color variation

Use coordinate/seed-based variation, never render-time randomness.

Target envelope:

- grass: about ±4–7% lightness/value
- soil: about ±4–6%
- stone: about ±3–5%

Variation must remain subtle enough that the island reads as one palette.

### Top/side readability

Keep the low-poly hex silhouette, but improve miniature depth through lighting/material value separation. Avoid black outlines and high-contrast grid borders in normal view.

### Hover motion

Hover should gain a physical response:

- vertical lift around `0.04–0.07`
- perceptual response around `120–180ms`
- no large scale change
- no camera movement

Because terrain is instanced, update only the previously hovered/current hovered transform when possible rather than rewriting all instance matrices every frame.

### Build footprint

- valid = soft emerald emphasis with slow restrained breathing
- invalid = muted coral with a short pulse
- anchor may be slightly stronger than footprint cells
- normal seams remain minimized outside Build/Expand

Invalid click must send no mutation and must never shake the whole camera.

## 7. Selection Effects

`HexSelectionEffects` remains visual-only.

Upgrade the static ring with restrained motion:

- small opacity pulse
- optional tiny scale breathing
- valid/invalid/selected colors remain distinct
- no network activity
- no dynamic light

Reduced motion keeps the ring static but visible.

## 8. Building Motion

Placed buildings remain individual scene groups.

### Selection

Replace immediate selected transform snapping with interpolation:

- scale target roughly `1.025–1.04`
- vertical lift roughly `0.03–0.05`
- `180–220ms` feel
- smooth return on deselect

Structural buildings such as Home/Workshop/Storage do not perpetually bob.

### Rotation

Confirmed rotation should animate the expected 60-degree step:

- around `200–260ms`
- shortest 60-degree path
- server state remains authoritative
- failure leaves/returns to authoritative orientation

### Click-to-place celebration

The current interaction is a hard requirement:

`Build → component → ghost → click/tap valid hex → server mutation → success`

Only after server success may the committed building celebrate.

Recommended settle:

1. begin `0.5–0.8` units above final target
2. descend quickly
3. subtle overshoot/compression impression
4. settle to final transform
5. emit a small bounded dust/leaf/sparkle effect

Target duration: `320–480ms`.

Do not render a committed building before server confirmation.

### Identifying the newly placed building

Do not change the Place API merely for animation metadata.

`HexBuildController` should capture pre-mutation building ids and compare them with the confirmed snapshot to find the newly created id. That id may be passed to the scene as a short-lived semantic trigger.

If no new id can be identified safely, show only a coordinate-based placement effect; do not weaken API or persistence contracts.

### Ghost preview

- transparent/non-persisted identity remains obvious
- optional bob only `0.015–0.03`
- slow opacity/scale breath
- invalid ghost uses muted coral treatment
- reduced motion disables bob
- remains responsive to click-to-place

### Move

Move keeps explicit `Move here` confirmation.

Before confirmation the original building remains authoritative and the target is a ghost. After server success, target may use a smaller settle effect. Undo behavior is unchanged.

### Remove

Removal remains server authoritative. Prefer a small location-based dust effect after confirmed removal. Only keep a transient removed model for fade/scale-out if it can be done without complicating persisted ownership.

No persistence change is allowed merely to support an exit animation.

## 9. Placement Effects Layer

Create:

`components/hex-world/HexPlacementEffects.tsx`

Responsibilities:

- visual-only confirmed action effects
- bounded particle pool/shared batch
- no one-particle React components
- quality/reduced-motion aware
- no network requests

Effects:

- new building = small dust + leaf/sparkle burst
- successful Move = smaller burst
- confirmed Remove = optional small dust at old position
- invalid click = footprint pulse only

Effects should feel tactile, not like fireworks.

All transient effect state must be cleared when `landId` changes so no animation from the previous Land leaks into the new Land.

## 10. Ambient Vegetation Motion

`HexAmbientDecor` stays instanced.

Do not update every vegetation instance matrix every frame merely to create asynchronous wind.

Preferred architecture:

- assign deterministic coordinates into a small fixed number of phase buckets, e.g. 3–4
- render each vegetation type as a small bounded number of instanced batches
- animate the batch/group transforms with different phases
- reduce bucket count/amplitude by quality profile

### Trees

- canopy motion more visible than trunk
- trunk movement tiny
- canopy roughly ±`0.5–1.5°` depending quality
- slow `3–6s` cycles with deterministic phase

### Flowers/sprouts

- smaller, slightly faster movement
- extremely low amplitude

### Rocks/paths

Static. They visually anchor the scene.

## 11. Sky and Clouds

Keep the current bounded cloud count and layer limits.

Current clouds must stop moving as one rigid group.

Use a small number of layer/group refs:

- different horizontal drift speeds
- tiny vertical drift
- optional tiny scale breathing only if cheap
- parallax impression
- no cloud shadows
- no volumetric cloud shader

High uses the current full layer budget; Medium/Mobile keep reduced layer counts.

## 12. Lighting and Materials

Preserve one main directional real-time shadow owner.

No per-building point-light fleet.

Tune toward:

- warmer key light
- slightly cooler sky/fill relationship
- softer miniature-style shadows
- stronger material separation without oversaturation
- coherent wood/stone/roof roughness/value treatment
- emissive window materials only where useful; no point lights for windows

No mandatory Bloom, SSAO, DOF, SSR, planar reflection, or other heavy post-processing.

Optional post-processing is outside core acceptance and cannot be required for the world to look correct.

## 13. Water

Preserve instanced water.

The pond should feel calmer and more premium:

- soft translucent turquoise
- moderately high roughness
- asynchronous ripple phase
- subtle darker edge/value impression
- High may have a tiny bounded glint/ring count
- Medium uses simpler ripples
- Mobile is mostly static with minimal motion

Avoid per-tile matrix updates every frame when possible.

Preferred implementation mirrors vegetation phase buckets: partition water tiles into a very small fixed number of deterministic groups and animate group vertical/ripple phase independently.

No planar reflection and no expensive refraction shader is required.

Deterministic reeds/stones may be added through existing ambient instancing patterns if bounded.

## 14. Ambient Particles

Keep one shared ambient points batch.

Particles should read as pollen/dust:

- slow drift
- low opacity
- restrained size
- not a starfield

Persistent count stays quality-controlled. Placement effects are separate short-lived bounded effects and must not multiply persistent draw calls significantly.

## 15. Camera Motion Language

Preserve the current camera intent architecture and interruptibility.

### Overview

- keep bounds-based framing
- initial entry may begin slightly wider/elevated and settle softly
- interaction is immediately available
- no automatic orbit

### Focus

- smooth target/distance transition
- retain island context
- avoid aggressive zoom

### Build

Build camera must **not chase hover anchors**.

The existing Build intent may still carry an anchor for semantic context, but changing hover/tile anchor alone must not restart scripted camera travel. The camera may frame Build mode once when entering the mode, then remain user-stable until a real camera intent such as Reset, Focus, confirmed expansion reframe, or mode transition occurs.

This is a hard acceptance criterion because click-to-place depends on a stable pointer target.

### Expansion

Confirmed expansion may trigger a gentle `700–1000ms` reframe only if newly unlocked coordinates would sit outside comfortable bounds. User orbit interaction interrupts it.

### Invalid placement

No camera shake.

## 16. Opening Presentation

First entry should feel crafted but never block input:

- scene renders immediately
- optional slightly wider/elevated starting pose
- camera settles into Overview
- clouds already drift
- world is clickable/orbitable during the settle

Reduced-motion users receive direct Overview framing.

No splash screen or non-interactive intro.

## 17. Expansion Motion

Existing server-confirmed tile rise is the base.

After server success:

1. amber preview disappears
2. light mist/dust appears at the edge
3. new tiles rise with deterministic short stagger
4. visual-only decor settles after terrain
5. camera reframes only when necessary

Total target: `700–1100ms`.

Expansion remains non-undoable. Points charging and transaction semantics remain unchanged.

## 18. Click-to-Place Preservation

Hard requirements:

- selecting a Build catalog item enters placing mode
- hover/tap shows ghost and footprint
- click/tap valid hex places immediately
- no second `Place` button
- invalid click sends no mutation
- rapid double-click remains guarded
- rotate/cancel remain
- successful Place exits placing state and surfaces current short-lived Undo
- Move still requires `Move here`

Graphic/motion work must not regress this flow.

## 19. Server Authority and Land Isolation

No graphics/motion code may weaken:

- catalog/footprint/terrain/unlocked/occupancy server validation
- Place/Move/Rotate/Remove server authority
- Redis-backed scoped Undo
- `HexWorld.revision` stale-edit protection
- transactional expansion Points charging
- stale-Land response guards

No database migration is expected.

If implementation discovers a real need for persistence changes, stop and reclassify the work before making them.

Transient animation/effect state must reset on Land switch, including:

- newly placed id
- placement/move/remove effect coordinates
- local settle timers
- pending expansion visual timers

No old-Land animation may render into a new Land snapshot.

## 20. Expected File Changes

### New

- `lib/hex-world/motion.ts`
- `components/hex-world/HexPlacementEffects.tsx`
- optional `components/hex-world/useReducedHexMotion.ts`
- motion/graphic contract tests

### Existing

- `HexWorld3D.tsx`
- `HexDioramaCamera.tsx`
- `HexWorldLighting.tsx`
- `HexSkyAtmosphere.tsx`
- `HexTileInstances.tsx`
- `HexSelectionEffects.tsx`
- `HexWaterSurface.tsx`
- `HexAmbientDecor.tsx`
- `HexBuildings.tsx`
- selected model modules for material tuning
- `HexBuildController.tsx` only for confirmed semantic triggers
- `quality.ts`
- render-budget and acceptance tests

Do not mix application-shell redesign or unrelated gameplay work into this phase.

## 21. Motion Timing Targets

Centralize these in the motion profile rather than JSX magic numbers:

- hover: `120–180ms`
- selection: `180–220ms`
- rotation: `200–260ms`
- new placement: `320–480ms`
- move settle: `240–380ms`
- removal feedback: `180–260ms`
- invalid footprint pulse: `100–160ms`
- opening camera: `650–1000ms`, interruptible
- expansion: `700–1100ms`
- vegetation: `3–6s` seeded cycle
- clouds: continuous, very slow

Motion should feel soft and weighted, not rubbery.

## 22. Acceptance Flow

`Open Garden`
→ world renders immediately
→ camera settles softly
→ orbit/zoom remain responsive
→ cloud/water/vegetation motion is restrained and independent
→ Build
→ select component
→ hover valid tile
→ ghost/footprint responds
→ click valid hex
→ exactly one mutation
→ server confirms
→ persisted building settles with placement effect
→ Undo appears
→ Undo restores correctly
→ select building
→ smooth selection lift
→ rotate
→ confirmed 60° visual settle
→ Move
→ target ghost
→ `Move here`
→ confirmed settle
→ Remove
→ confirmed removal feedback
→ Expand
→ select amber cluster
→ confirm
→ transaction succeeds
→ staggered tile rise + optional reframe
→ Reset View
→ switch Land while/after effects
→ no stale snapshot/effect leaks
→ reload
→ persisted layout remains correct

## 23. Accessibility and Input

- click/tap placement remains primary
- minimum 44–48px UI targets remain
- motion is never the sole feedback
- valid/invalid retain distinct footprint/color/context feedback
- reduced-motion is respected
- touch has no hover-only essential behavior
- keyboard rotate/cancel/confirm remains logical

Enter may still confirm the currently valid keyboard-selected Build anchor, but pointer/touch click remains the standard placement path.

## 24. Performance Acceptance

Hard constraints:

- terrain remains instanced
- repeated ambient decor remains instanced
- no per-tile React component explosion
- one main directional real-time shadow owner
- no per-building dynamic-light fleet
- no planar reflection
- no mandatory heavy post-processing
- DPR remains quality-bounded
- persistent particle count remains bounded
- placement effects use a shared pool/batch
- vegetation/water asynchronous motion uses a small fixed number of phase buckets instead of per-instance full-matrix updates each frame
- no network writes from hover/idle animation
- hidden/inactive document state should skip or minimize non-essential ambient animation work

## 25. Failure Handling

Visual effects must never imply success before persistence succeeds.

- failed Place → no committed placement celebration; stay in placement mode and show existing error
- failed Move → original building remains authoritative
- failed Rotate → preserve/return to server orientation
- failed Remove → building remains present
- failed Expand → no rise/reframe celebration
- Undo conflict/unavailable → existing copy remains; no fake reverse animation

Persistence-related effects begin from confirmed semantic events only.

## 26. TDD and Verification

Implementation must follow RED → GREEN TDD.

### Pure tests

- motion profile resolution
- reduced-motion overrides
- deterministic phase helper
- quality motion/particle budgets

### Contract tests

- `HexWorld3D` mounts placement effects
- no mandatory heavy post-processing
- one main shadow owner
- bounded cloud layers
- ambient repeated geometry remains instanced
- fixed phase-bucket strategy remains bounded
- Build camera does not re-script solely because hover anchor changes
- click-to-place contract remains
- no animation module performs network writes

### Interaction regressions

- click-to-place
- invalid placement
- double-click guard
- Move confirmation
- Undo
- stale Land responses/effects
- expansion confirmation

### Full gates

- Prisma validate/migrate chain
- all Hex pure/acceptance tests
- Postgres + Redis Undo integration
- family-farm regression
- lint
- production build

## 27. Visual QA

### Desktop High

- island reads as one miniature world before individual hex cells
- terrain variation is visible but quiet
- warm key / soft fill separation is clear
- Home remains visual focal point
- clouds show parallax instead of rigid group translation
- vegetation does not sway perfectly in sync
- pond is calm, not gelatinous
- placement effect is satisfying and short
- ghost is clearly temporary
- camera remains stable while hovering Build tiles

### Medium

- same art identity as High
- fewer effects without losing core feedback

### Mobile

- no heavy vegetation/particle cost
- controls remain tappable and clear
- click-to-place remains reliable
- no UI overflow
- no excessive camera movement

### Reduced Motion

- all state changes remain understandable
- no large travel or looping motion is required to operate the builder

## 28. Non-Goals

Out of scope:

- farming/resource economy
- crop growth gameplay
- crafting/production chains
- NPCs or playable avatar
- WASD movement
- multiplayer building
- seasons/weather gameplay/day-night system
- terrain sculpting
- long Undo history
- expansion Undo/refund
- physics/destruction
- mandatory Bloom/DOF/SSAO/SSR
- planar reflections
- persistence redesign

## 29. Completion Criteria

This phase is complete only when:

1. The island looks materially richer without changing the established cozy art direction.
2. Idle scene feels alive through restrained independent cloud, water, particle, and vegetation motion.
3. Click-to-place produces a tactile **server-confirmed** placement celebration.
4. Selection and rotation no longer visually snap.
5. Invalid interactions communicate locally without camera shake.
6. Build camera does not chase hover anchors.
7. Camera motion is premium and remains interruptible.
8. Expansion presentation is improved without changing transaction/Undo rules.
9. Reduced-motion users retain full usability.
10. High/Medium/Mobile preserve the same art identity at different cost envelopes.
11. Server authority, Undo, Land isolation, expansion charging, legacy data, and family-farm behavior remain intact.
12. Hex + Redis integration + farm regression + lint + production build are green on the exact implementation head.
13. Railway production deployment passes additive migration startup and `/api/health` before production is declared verified.
