# Narinyland World Visual Motion v2 Design

Date: 2026-08-24
Status: Approved design, written spec pending final review
Baseline: current `main` after PR #47 (`fix: make World 3D smoothness visibly noticeable`)

## Goal

Make Narinyland's default **World mode** look visibly alive and polished immediately after `/garden` loads, without requiring Explore mode or a gameplay action.

This pass builds on the existing React Three Fiber / Three.js architecture. It improves presentation motion, lighting transitions, water, vegetation, building feedback, and camera feel. It does **not** change gameplay authority, persistence, APIs, Prisma, economy, interaction rules, physics, renderer engine, or world generation.

## Product success criteria

A player opening the normal World view should immediately notice that:

1. vegetation moves with layered, non-uniform wind rather than synchronized rigid sway;
2. water has richer but calm surface motion and moving highlights;
3. daylight/weather lighting changes ease instead of snapping;
4. selecting, placing, moving, and rotating a building has tactile visual settle;
5. the World camera feels gently alive while idle, but manual camera control remains fully authoritative;
6. the effect remains appropriate for a cozy floating homestead rather than becoming dramatic or noisy;
7. medium/mobile devices preserve performance through the existing quality-profile and adaptive-quality system.

## Non-goals

The following are explicitly out of scope:

- Bloom, SSAO, SSR, depth-of-field, motion blur, or a new post-processing stack.
- WebGPU migration.
- Unity, Godot, PlayCanvas, Babylon, or another engine migration.
- Physics or a new physics engine.
- New model downloads or remote model dependencies.
- New gameplay state or world simulation state.
- Changes to farm, building, expansion, resident, interaction, economy, points, undo, or persistence authority.
- Prisma migrations or API changes.
- New user-facing graphics settings.
- Changing the existing reduced-motion accessibility behavior into a different product mode.

## Existing architecture to preserve

The current renderer already provides the correct foundations:

- `HexAmbientDecor` uses instanced vegetation batches and quality-aware motion buckets.
- `HexWaterSurface` uses bounded water buckets and a small number of ripples/glints.
- `HexWorldLighting` owns one primary directional shadow light plus bounded contact shadows.
- `HexBuildings` applies presentation-only transform interpolation to authoritative building state.
- `HexDioramaCamera` preserves manual OrbitControls authority and only scripts semantic camera commands.
- `HexWorld3D` owns adaptive high / medium / mobile quality and scene preload.

v2 extends these systems. It must not introduce parallel rendering or motion subsystems.

## Design principles

### Motion hierarchy

Large/heavy objects move least. Light/decorative objects move most.

- terrain and island: static;
- buildings: static except short interaction feedback;
- tree trunks: nearly static;
- tree canopy: layered wind;
- flowers/crops/grass: more responsive wind;
- water highlights/ripples: continuous subtle motion;
- camera: only extremely subtle idle drift when user control is inactive.

### Deterministic presentation

No `Math.random()` is allowed for world motion. Per-tile phase, frequency, and amplitude variation must derive from existing deterministic tile/seed keys or deterministic motion helpers so renders remain stable between sessions.

### Frame-rate independence

All convergence and easing must use delta-time-based exponential smoothing or analytically bounded periodic motion. No fixed per-frame increments.

### Mobile boundedness

The existing named quality profiles remain the only cost buckets. v2 may vary amplitude, bucket count, update complexity, or optional highlight count by profile, but must not create an unbounded per-object frame loop.

## Architecture

### 1. Shared World motion parameters

Extend the existing `HexMotionProfile` rather than creating another global motion configuration system.

Add presentation parameters for:

- `worldWindScale`
- `worldWindSecondaryScale`
- `waterMotionScale`
- `buildingFeedbackScale`
- `worldIdleCameraScale`
- `lightingResponse`

These values are derived only from:

- existing quality profile;
- existing reduced-motion preference.

Reduced motion sets decorative world motion to zero and keeps only fast, necessary UI/gameplay feedback.

The profile remains presentation-only.

### 2. Layered vegetation wind

Current vegetation buckets apply one sinusoidal sway value to all instances in a bucket. v2 keeps instancing but makes each batch use a two-frequency wind signal:

`primary = sin(t * speed + phase)`

`secondary = sin(t * speed * 0.47 + phase * 1.83)`

`wind = primary + secondary * 0.35`

The final signal remains bounded and is multiplied by profile motion scale.

Tree hierarchy:

- trunk amplitude: `0.0025` radians at high/medium base before profile scaling;
- lower canopy amplitude: `0.020` radians;
- crown amplitude: `0.030` radians;
- crown phase offset from lower canopy: `+0.55` radians;
- tree base speed: `0.62`.

Flowers / garden sprouts:

- flower stem amplitude: `0.012`;
- flower head amplitude: `0.020`;
- garden sprout amplitude: `0.014`;
- base speed: `0.95–1.15` depending on existing deterministic bucket.

Each existing motion bucket receives a stable secondary phase; no per-instance React components are introduced.

Quality behavior:

- high: 4 vegetation buckets, full two-frequency signal;
- medium: 2 buckets, full two-frequency signal at `0.78` world-wind scale;
- mobile: 1 bucket, primary signal only at `0.35` scale;
- reduced motion: no continuous vegetation sway.

### 3. Water motion and shimmer

Keep `HexWaterSurface` instanced and bounded.

Water buckets use two gentle vertical frequencies instead of one:

- primary vertical amplitude: `0.010` world units;
- secondary amplitude: `0.004` world units;
- base speed: `0.58 + bucketIndex * 0.07`;
- secondary speed multiplier: `1.73`.

Water material presentation gains a small deterministic shimmer:

- roughness oscillation range is capped to `±0.035` around the quality-profile base;
- opacity oscillation range is capped to `±0.025`;
- no reflection probes, cube cameras, or screen-space reflection systems.

Ripples:

- high: up to the existing high-quality glint budget, capped at 3;
- medium: exactly 1;
- mobile: 0;
- scale expands from `0.72` to `1.18`;
- opacity fades from at most `0.15` toward `0.035` over the periodic cycle;
- each ripple uses stable phase derived from tile coordinate/index.

### 4. Smooth lighting transitions

`HexWorldLighting` continues to own exactly one directional shadow light.

Direct light and ambient/hemisphere values become target values derived from `HexVisualEnvironment`, but actual light refs ease toward them every frame.

Locked response:

- normal lighting response: `2.8`;
- reduced-motion response: `18`.

Animate:

- directional light intensity;
- hemisphere intensity;
- ambient intensity;
- directional light color;
- hemisphere sky color;
- hemisphere ground color;
- ambient color.

Color interpolation uses `THREE.Color.lerp` with the same frame-rate-independent alpha.

Contact shadows remain bounded and do not become another animated render pass. v2 softens World contact-shadow presentation only:

- World opacity: `0.22` normal, `0.19` rainy;
- high blur: `3.2`;
- medium/mobile blur: `3.8`;
- existing resolution buckets remain unchanged.

Explore-specific lighting behavior must not regress.

### 5. Tactile building feedback

Authoritative building positions/rotations stay exactly as they are.

`AnimatedHexBuilding` adds transient presentation feedback only.

Selection:

- selected scale target: `1.045` instead of `1.035`;
- selected lift target: `0.055` world units instead of `0.04`;
- existing exponential convergence remains overshoot-free.

Confirmed events:

- placed: start `+0.72` Y and `0.94` scale;
- moved: start `+0.30` Y and `0.97` scale;
- rotated: apply a short visual scale compression to `0.975` before converging to selected/unselected target;
- no event changes persisted coordinates or rotation.

The building settles using the existing shared motion profile. No physics spring is introduced.

### 6. World camera idle breathing

Manual OrbitControls remains authoritative.

Do **not** continuously move the camera position after the user starts manipulating it. Instead add a tiny visual target drift only after a clear idle period.

Rules:

- applies only in `viewMode === 'world'` through `HexDioramaCamera`;
- disabled during scripted camera transitions;
- disabled while pointer/wheel interaction is active;
- begins after `2.5` seconds without manual OrbitControls interaction;
- ends immediately on `onStart`;
- reduced motion disables it entirely;
- idle drift never changes the stored semantic camera pose or camera command key.

Locked maximum target offsets:

- X: `0.035` world units;
- Y: `0.018` world units;
- Z: `0.028` world units.

Frequencies:

- X: `0.11 Hz`;
- Y: `0.08 Hz`;
- Z: `0.095 Hz`.

The drift is applied relative to a captured manual target baseline, not cumulatively, so it cannot walk away from the user's chosen view.

When manual input starts, controls target is restored to the baseline before user motion continues.

### 7. Performance behavior

No new unbounded scene loops may be added.

Required constraints:

- vegetation remains instanced;
- water remains instanced;
- only existing bounded ripple/glint objects may animate individually;
- one directional shadow owner remains;
- no new shadow-casting light;
- no post-processing;
- no per-frame React state updates for wind, water, lighting, buildings, or camera breathing;
- adaptive quality remains capable of degrading medium/high to lower existing buckets.

`PerformanceMonitor` and `Preload` from Smoothness v1 remain unchanged unless tests expose a compatibility issue.

## Reduced-motion behavior

When reduced motion is enabled:

- vegetation continuous sway is zero;
- water vertical/shimmer decorative motion is zero or visually static;
- ripple animation is static/minimal;
- camera idle breathing is disabled;
- lighting transitions use response `18` so state changes settle nearly immediately;
- required building interaction feedback stays short and functional, using existing reduced-motion timing.

## Data flow

### Environment motion

`HexWorld3D`
→ resolves existing `HexQualityProfile`
→ resolves extended `HexMotionProfile`
→ passes profile into existing World visual layers
→ layers update Three.js refs inside `useFrame`
→ no server or React gameplay state mutation.

### Lighting

`HomesteadLifeState`
→ existing `getHexVisualEnvironment`
→ target light values
→ frame-damped Three.js light refs.

### Buildings

Existing authoritative `HexBuildingDTO` + existing `HexConfirmedVisualEvent`
→ transient transform feedback
→ convergence back to DTO-defined transform.

### Camera

Existing semantic camera intent + manual OrbitControls
→ scripted transition when command changes
→ manual control owns camera after interaction
→ tiny non-cumulative target breathing only after 2.5 seconds idle.

## Files expected to change

Primary production files:

- `lib/hex-world/motion.ts`
- `components/hex-world/HexAmbientDecor.tsx`
- `components/hex-world/HexWaterSurface.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `components/hex-world/HexBuildings.tsx`
- `components/hex-world/HexDioramaCamera.tsx`

Tests should extend existing focused contracts instead of adding one giant source-contract file where practical.

Potential test files:

- `tests/hex-motion.test.ts`
- `tests/hex-premium-motion-contract.test.ts`
- `tests/hex-graphics-quality-pass.test.ts`
- a focused World Visual Motion v2 contract test only if existing files cannot express the behavior clearly.

No schema, API route, persistence, auth, or package dependency files are expected to change.

## Test strategy

Implementation is test-first.

### Pure/profile tests

Verify:

- new motion-profile values are deterministic and quality-bounded;
- reduced motion zeros decorative motion;
- frame-rate-independent alpha remains finite and bounded.

### Source architecture contracts

Verify:

- vegetation remains instanced;
- no `Math.random()` is introduced;
- layered two-frequency wind is present;
- water remains batched and avoids reflection/post-processing systems;
- one directional light remains the only primary shadow light;
- lighting uses ref-based interpolation rather than per-frame React state;
- camera breathing is bounded, non-cumulative, delayed, and disabled by reduced motion/manual interaction;
- building feedback remains presentation-only.

### Regression suite

Run the complete Hex Homestead CI:

- production dependency advisory gate;
- Prisma validation and migrations;
- security hardening regressions;
- complete Hex pure suite;
- DB/Redis undo integration;
- farm regression;
- lint;
- production build;
- production runtime smoke.

## Acceptance criteria

The feature is complete only when all of the following are true:

1. Default World mode visibly contains layered vegetation motion at normal motion settings.
2. Water movement has bounded two-frequency motion and moving shimmer/ripple presentation.
3. Lighting transitions interpolate through Three.js refs and still use one shadow-casting directional light.
4. Building selection and confirmed mutations provide stronger but non-gameplay tactile feedback.
5. Camera idle breathing is tiny, delayed, non-cumulative, and never fights manual control.
6. Reduced-motion mode disables continuous decorative movement.
7. High/medium/mobile remain the only rendering cost buckets.
8. No gameplay, persistence, API, Prisma, physics, engine, WebGPU, or post-processing changes are introduced.
9. Full Hex Homestead CI passes on the exact final branch head before merge.
10. After merge, Railway production must be verified to serve the resulting `main` commit before claiming the feature live.
