# Narinyland 3D Smoothness v1 — Design

Date: 2026-08-24
Branch: `feat/3d-smoothness-v1`
Status: Approved in chat; written-spec review pending

## Goal

Make Narinyland's existing Three.js + React Three Fiber world feel materially smoother and more game-like without changing engine, gameplay rules, persistence, economy, networking, or world authority.

Success means motion feels continuous on both desktop and mobile: player acceleration/deceleration is eased, heading changes are smooth, the camera follows with stable spring-like damping, moving residents no longer snap to each sampled transform, first-view shader/material hitches are reduced, and render quality can degrade gracefully when sustained frame performance is poor.

## Selected approach

Keep the existing R3F/Three.js architecture and add a small set of reusable smoothing/adaptive-rendering helpers. Do not introduce Unity, Godot, PlayCanvas, Babylon.js, WebGPU migration, a physics engine, an ECS, or a new character asset pipeline in v1.

This is preferred over an engine migration because Narinyland already integrates its 3D world directly with Next.js, React UI, Homestead state, authentication, persistence, and mobile controls. The current shortcomings are primarily motion/render-loop polish rather than missing engine capability.

## Locked v1 tuning

Use frame-rate-independent exponential response with these defaults:

- player acceleration response: `12`
- player deceleration response: `16`
- player heading response: `12`
- avatar movement-amount response: `10`
- camera target follow response: `8.5`
- resident position response: `10`
- resident heading response: `10`

These values are response coefficients used with `1 - exp(-response * deltaSeconds)`, not frame-dependent lerp percentages.

When movement is suspended by an interaction surface, target velocity becomes zero and actual velocity is cleared to zero in the same frame. This intentionally prioritizes interaction correctness over eased deceleration at that boundary.

## Scope

### 1. Player locomotion smoothing

The current player moves immediately at `PLAYER_SPEED` from the current input vector. Replace direct speed application with a transient velocity state in the player controller.

Rules:
- preserve `resolveWalkablePlayerPosition` as traversal authority;
- preserve keyboard + touch input combination;
- preserve current maximum movement speed of 1.7 world units/second;
- accelerate toward requested velocity and decelerate toward zero using frame-rate-independent exponential smoothing;
- do not persist velocity or player position;
- when movement is suspended, clear keyboard/touch input and velocity in the same frame so the avatar cannot drift through an interaction surface;
- reduced-motion mode may converge immediately.

The response values must come from a pure smoothing profile/helper rather than magic numbers scattered through `HexPlayerController`.

### 2. Heading and avatar gait smoothing

Continue using the current procedural avatar for v1; do not add external GLB/FBX assets yet.

Improve it by:
- replacing binary `moving` gait amplitude with a normalized `movementAmount` from 0..1;
- smoothly blending arm/leg stride amplitude and body bob based on movement amount;
- using response `10` for gait amount convergence;
- preserving reduced-motion behavior;
- keeping heading interpolation shortest-path and frame-rate independent with response `12`;
- allowing turning to settle smoothly instead of snapping when input changes direction.

A real `AnimationMixer`/rigged character asset is intentionally deferred to a later Character Animation v2 pass because Narinyland does not yet have an approved production character asset set.

### 3. Camera follow smoothing

Preserve `OrbitControls` and user orbit/zoom authority. Improve follow behavior by separating desired player-follow target from the camera's actual follow target and using response `8.5` exponential damping.

Rules:
- no camera snapping during normal movement;
- reset/spawn may still initialize immediately;
- orbit zoom and rotation remain user-controlled;
- camera target follow must be frame-rate independent;
- the camera must not overshoot or introduce oscillation that causes nausea;
- interaction suspension keeps the current camera framing stable.

This remains a damped follow camera, not a physics spring.

### 4. Resident motion smoothing

`HexLivingWorldLayer` currently assigns each deterministic presence sample directly to `position` and `rotation` every frame. Keep `getHomesteadPresencePosition` authoritative but interpolate the visual group toward each deterministic sample.

Rules:
- no persisted NPC positions;
- no changes to route schedules or interaction identity;
- position convergence uses response `10`;
- heading convergence uses shortest-angle response `10`;
- reduced-motion may converge immediately;
- resident interaction reporting remains based on deterministic world samples, not delayed visual interpolation, so gameplay targeting does not gain latency.

This applies to partner-1, partner-2, child, cow, sheep, and pet visuals.

### 5. Scene warm-up / preload

Use Drei scene preloading inside the Canvas to force visible scene materials/shaders to compile before first encounter where supported.

Rules:
- use the existing `@react-three/drei` dependency;
- no remote asset prefetching is introduced;
- no blocking full-screen loading redesign;
- preload must remain presentation-only and must not affect gameplay state.

### 6. Adaptive quality

The existing `resolveHexQualityProfile` remains the static upper bound derived from user graphics setting and viewport width. Add a transient runtime performance factor that can only reduce effective render cost below that upper bound when sustained performance is poor, and can recover when performance stabilizes.

Use Drei `PerformanceMonitor` and its debounced performance `factor` as the coarse signal. Map it to three runtime buckets:

- `factor >= 0.70` → `full`
- `0.40 <= factor < 0.70` → `reduced`
- `factor < 0.40` → `minimal`

Effective-profile mapping:

- static `high` + `full` → `high`
- static `high` + `reduced` → `medium`
- static `high` + `minimal` → `mobile`
- static `medium` + `full` → `medium`
- static `medium` + `reduced|minimal` → `mobile`
- static `mobile` → always `mobile`

Rules:
- `PerformanceMonitor` debounce/hysteresis behavior is used; do not add a second per-frame React quality loop;
- update React state only when the derived runtime bucket changes;
- never promote above the static/user quality profile;
- mobile remains capped by `mobile`;
- adaptive state is not persisted;
- no quality transition may modify gameplay state or traversal authority.

For v1, adapting between existing profiles is sufficient. Dynamic per-feature tuning and automatic WebGPU selection are out of scope.

## New pure helpers

Add focused helpers under `lib/hex-world/` so smoothing rules can be tested without React or R3F:

- `smooth-motion.ts`
  - `exponentialAlpha(response, deltaSeconds)`;
  - finite/clamped scalar smoothing;
  - 2D velocity smoothing;
  - shortest-angle smoothing;
  - locked v1 response constants/profile.

- `adaptive-quality.ts`
  - runtime bucket type `full | reduced | minimal`;
  - pure `factor -> bucket` mapping;
  - pure static-profile + runtime-bucket -> effective-profile mapping;
  - effective quality can only stay the same or degrade.

Do not place gameplay authority in these helpers.

## Component changes

### `HexPlayerController.tsx`

- own transient velocity refs;
- derive movement amount;
- smooth velocity and heading;
- preserve authoritative walkability resolution and proximity reporting;
- improve camera follow target damping;
- pass `movementAmount` to avatar instead of only binary movement.

### `HexPlayerAvatar.tsx`

- replace binary gait amplitude with normalized movement amount;
- smooth procedural limb/body motion using the supplied amount;
- do not add network/API/gameplay dependencies.

### `HexLivingWorldLayer.tsx`

- interpolate visual presence transforms toward deterministic positions;
- keep route authority unchanged.

### `HexWorld3D.tsx`

- host runtime adaptive-quality bucket state;
- mount `PerformanceMonitor`;
- mount scene `Preload`;
- derive effective profile from static profile + runtime bucket;
- pass effective profile to existing rendering layers.

### `quality.ts`

Preserve existing profile definitions and `resolveHexQualityProfile` static behavior. Adaptive mapping belongs in the new pure `adaptive-quality.ts` helper so viewport/user-setting resolution stays independent from runtime frame performance.

## Data and authority boundaries

No Prisma changes.
No API changes.
No Homestead save schema changes.
No player position persistence.
No NPC position persistence.
No changes to interaction radius, resident/building arbitration, farming, building placement, economy, undo, or world revision logic.

Player traversal remains authoritative through `resolveWalkablePlayerPosition`. Resident schedules remain authoritative through `getHomesteadPresencePosition`.

## Performance constraints

- no new per-frame React state updates for raw position/velocity;
- high-frequency motion uses refs/R3F frame updates;
- React state may change only at coarse boundaries such as moving/not-moving or adaptive quality bucket changes;
- no new object allocation in hot loops where avoidable;
- adaptive quality must not oscillate every few frames;
- current instancing and bounded-particle architecture must remain intact.

## Accessibility and reduced motion

Respect the existing reduced-motion preference. Reduced-motion mode must minimize decorative gait/bob and may converge motion/camera interpolation immediately while preserving playability and traversal correctness.

## Testing

Add pure tests for:
- `exponentialAlpha` is bounded and frame-rate safe;
- scalar/vector smoothing converges without overshoot;
- acceleration and deceleration use the locked responses;
- shortest-angle interpolation crosses ±π correctly;
- invalid/non-finite inputs fail safely;
- factor thresholds map exactly at `0.40` and `0.70`;
- adaptive quality never exceeds the static quality cap;
- poor performance degrades high → medium/mobile according to the locked table;
- mobile static cap never promotes.

Add source/integration contracts for:
- player controller uses smooth-motion helpers while preserving `resolveWalkablePlayerPosition`;
- interaction suspension clears velocity immediately;
- avatar accepts normalized `movementAmount` rather than only binary movement;
- living world visual transforms interpolate rather than directly snap;
- resident interaction reporter remains deterministic/authoritative and separate from visual interpolation;
- world mounts `PerformanceMonitor` and `Preload`;
- adaptive bucket changes are React-state coarse events, not per-frame state updates;
- no new persistence/API dependencies appear in smooth-motion/avatar/presence code.

Full verification gate before merge:
1. production dependency advisory check
2. Prisma validate + migrations
3. security hardening regressions
4. complete Hex Homestead pure suite
5. Hex Undo DB + Redis integration
6. existing farm regression
7. lint
8. production build
9. production runtime smoke

## Explicit non-goals

- engine migration
- WebGPU renderer migration
- Rapier/physics integration
- collision redesign
- rigged GLB/FBX character asset pipeline
- `AnimationMixer` production character states
- camera collision
- navmesh/pathfinding rewrite
- new NPC AI
- multiplayer changes
- persistence/schema/API changes
- post-processing stack such as bloom/DOF

## Follow-up after v1

If v1 is smooth and stable, the next visual-quality milestone should be Character Animation v2: approved rigged character assets with real idle/walk/run/interact animation clips and cross-fading, reusing the locomotion `movementAmount` produced by this pass.
