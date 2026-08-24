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

## Scope

### 1. Player locomotion smoothing

The current player moves immediately at `PLAYER_SPEED` from the current input vector. Replace direct speed application with a transient velocity state in the player controller.

Rules:
- preserve `resolveWalkablePlayerPosition` as traversal authority;
- preserve keyboard + touch input combination;
- preserve current maximum movement speed of 1.7 world units/second;
- accelerate toward requested velocity and decelerate toward zero using frame-rate-independent exponential smoothing;
- do not persist velocity or player position;
- when movement is suspended, clear keyboard/touch input and smoothly stop immediately enough that the avatar cannot drift through an interaction surface;
- reduced-motion mode may use near-immediate transitions.

Target tuning for v1:
- acceleration response approximately 10–14 Hz equivalent exponential response;
- deceleration response approximately 14–18 Hz;
- values must live in a pure helper/profile rather than magic numbers scattered through `HexPlayerController`.

### 2. Heading and avatar gait smoothing

Continue using the current procedural avatar for v1; do not add external GLB/FBX assets yet.

Improve it by:
- replacing binary `moving` gait amplitude with a normalized `movementAmount` from 0..1;
- smoothly blending arm/leg stride amplitude and body bob based on movement amount;
- preserving reduced-motion behavior;
- keeping heading interpolation shortest-path and frame-rate independent;
- allowing turning to settle smoothly instead of snapping when input changes direction.

A real `AnimationMixer`/rigged character asset is intentionally deferred to a later Character Animation v2 pass because Narinyland does not yet have an approved production character asset set.

### 3. Camera follow smoothing

Preserve `OrbitControls` and user orbit/zoom authority. Improve follow behavior by separating desired player-follow target from the camera's actual follow target and using a spring-like exponential response.

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
- position interpolation is frame-rate independent;
- heading interpolation uses shortest angular path;
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

The existing `resolveHexQualityProfile` remains the static upper bound derived from user graphics setting and viewport width. Add a transient runtime performance factor that can only reduce effective render cost below that upper bound when sustained performance is poor, and can recover gradually when performance stabilizes.

Preferred implementation:
- use Drei `PerformanceMonitor` or an equivalent bounded R3F frame monitor;
- maintain a transient factor/bucket in `HexWorld3D`;
- map the effective quality to existing `high`, `medium`, `mobile` profiles rather than inventing dozens of dynamic knobs;
- never promote above the user's configured/static quality profile;
- avoid rapid oscillation using hysteresis/debounce;
- mobile remains capped by the mobile profile;
- adaptive state is not persisted.

For v1, adapting between existing profiles is sufficient. Dynamic per-feature tuning and automatic WebGPU selection are out of scope.

## New pure helpers

Add focused helpers under `lib/hex-world/` so smoothing rules can be tested without React or R3F:

- `smooth-motion.ts`
  - frame-rate-independent scalar smoothing;
  - 2D velocity smoothing;
  - shortest-angle interpolation helper;
  - clamp/finite-value guards.

- extend `quality.ts` or add `adaptive-quality.ts`
  - map static quality + runtime performance bucket to effective quality;
  - effective quality can only stay the same or degrade;
  - deterministic and side-effect free.

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

- host runtime adaptive-quality state;
- mount the performance monitor;
- mount scene preloading;
- pass effective profile to existing rendering layers.

### `quality.ts`

- preserve existing profile definitions and static resolution behavior;
- add or expose safe profile-rank utilities needed by adaptive quality.

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

Respect the existing reduced-motion preference. Reduced-motion mode must minimize decorative gait/bob and may converge motion/camera interpolation faster while preserving playability and traversal correctness.

## Testing

Add pure tests for:
- scalar/vector smoothing is frame-rate independent within tolerance;
- velocity converges without overshoot;
- deceleration reaches near-zero predictably;
- shortest-angle interpolation crosses ±π correctly;
- invalid/non-finite inputs fail safely;
- adaptive quality never exceeds the static quality cap;
- poor-performance bucket degrades high → medium → mobile;
- mobile static cap never promotes.

Add source/integration contracts for:
- player controller uses smooth-motion helpers while preserving `resolveWalkablePlayerPosition`;
- avatar accepts normalized `movementAmount`;
- living world visual transforms interpolate rather than directly snap;
- resident interaction reporter remains deterministic/authoritative and separate from visual interpolation;
- world mounts adaptive performance monitoring and scene preload;
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
