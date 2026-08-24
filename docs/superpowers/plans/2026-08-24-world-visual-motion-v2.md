# World Visual Motion v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Narinyland's default World mode visibly alive through layered vegetation wind, richer bounded water motion, smoothly interpolated lighting, tactile building feedback, and tiny non-cumulative camera idle breathing.

**Architecture:** Extend the existing presentation-only `HexMotionProfile` and existing R3F World layers. All continuous motion remains ref-driven inside `useFrame`, deterministic, frame-rate-independent, quality-bounded, and independent from gameplay/persistence authority.

**Tech Stack:** Next.js 16, React, React Three Fiber, Three.js, Drei, Node test runner, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-24-world-visual-motion-v2-design.md`

## Global Constraints

- Keep Three.js + React Three Fiber; no engine migration.
- No bloom, SSAO, SSR, depth-of-field, motion blur, or new post-processing stack.
- No WebGPU migration or physics engine.
- No new gameplay state, API, Prisma, persistence, economy, interaction, undo, or world-generation changes.
- No remote model dependency and no new package dependency.
- No `Math.random()` for presentation motion.
- Continuous motion must be delta-time-safe or analytically bounded periodic motion.
- High / medium / mobile remain the only render-cost buckets.
- Reduced motion disables continuous decorative motion and camera breathing.
- No per-frame React state updates for vegetation, water, lighting, buildings, or camera breathing.
- One directional shadow-casting light remains authoritative.

---

### Task 1: Extend the shared World motion profile

**Files:**
- Modify: `lib/hex-world/motion.ts`
- Modify: `tests/hex-motion.test.ts`

**Interfaces:**
- Consumes: existing `HexQualityProfile` and `reducedMotion`.
- Produces: `HexMotionProfile` fields `worldWindScale`, `worldWindSecondaryScale`, `waterMotionScale`, `buildingFeedbackScale`, `worldIdleCameraScale`, and `lightingResponse`.

- [ ] **Step 1: Write failing profile tests**

Add assertions that normal profiles expose finite positive World-motion values, medium wind is `0.78`, mobile wind is `0.35`, normal lighting response is `2.8`, reduced-motion lighting response is `18`, and reduced motion zeros the continuous decorative values.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/hex-motion.test.ts`

Expected: FAIL because the new `HexMotionProfile` fields do not exist.

- [ ] **Step 3: Implement the minimal profile extension**

Extend `HexMotionProfile` and `resolveHexMotionProfile` with the locked values from the spec. Keep existing motion values unchanged except where PR #47 already set World camera response.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --import tsx --test tests/hex-motion.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: extend World motion profile`

---

### Task 2: Add layered deterministic vegetation wind

**Files:**
- Modify: `components/hex-world/HexAmbientDecor.tsx`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- Consumes: `HexMotionProfile.worldWindScale` and `worldWindSecondaryScale`.
- Produces: instanced two-frequency wind for trunks, canopy layers, flowers, and garden sprouts.

- [ ] **Step 1: Write failing source-contract tests**

Require `HexAmbientDecor` to preserve `instancedMesh`, avoid `Math.random`, consume both World wind fields, and compute a bounded primary + secondary periodic signal. Require the crown to use a stable secondary phase offset rather than sharing the lower-canopy signal exactly.

- [ ] **Step 2: Run focused contract tests and verify RED**

Run: `node --import tsx --test tests/hex-premium-motion-contract.test.ts`

Expected: FAIL because the current batches use one sinusoid and `ambientScale` only.

- [ ] **Step 3: Implement layered wind**

Update `SwayInstanceBatch` to accept a secondary phase offset and optional secondary-signal flag. Compute:

```ts
const primary = Math.sin(clock.elapsedTime * speed + phase);
const secondary = Math.sin(clock.elapsedTime * speed * 0.47 + phase * 1.83 + secondaryPhaseOffset);
const wind = primary + secondary * 0.35 * motionProfile.worldWindSecondaryScale;
const sway = wind * amplitude * motionProfile.worldWindScale;
```

For mobile, `worldWindSecondaryScale` must resolve to `0`, producing primary-only motion. Use locked amplitudes: trunk `0.0025`, lower canopy `0.020`, crown `0.030`, flower stems `0.012`, flower heads `0.020`, garden sprouts `0.014`; tree speed `0.62`, flower/garden existing deterministic bucket speed in `0.95–1.15` range.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-premium-motion-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: layer World vegetation wind`

---

### Task 3: Enrich bounded water motion and shimmer

**Files:**
- Modify: `components/hex-world/HexWaterSurface.tsx`
- Modify: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:**
- Consumes: `HexMotionProfile.waterMotionScale`, current `HexQualityProfile.waterDetail`, and existing water glint budget.
- Produces: two-frequency bucket motion, bounded material shimmer, and quality-bounded ripple animation.

- [ ] **Step 1: Write failing water contracts**

Require water to remain instanced, consume `waterMotionScale`, use two periodic frequencies, keep ripple budgets at high <=3 / medium 1 / mobile 0, and continue excluding `CubeCamera`, `Reflector`, `MeshReflectorMaterial`, SSR, and post-processing.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts`

Expected: FAIL because current water uses one frequency and static material values.

- [ ] **Step 3: Implement water motion**

Inside each `WaterBucket`, keep one instanced mesh and add a material ref. Compute vertical motion from amplitudes `0.010` and `0.004`, speed `0.58 + bucketIndex * 0.07`, secondary multiplier `1.73`, scaled by `waterMotionScale`. Clamp roughness variation to ±`0.035` and opacity to ±`0.025` around the quality base. Reduced motion leaves the bucket and material static.

Update ripples to a stable periodic cycle using deterministic index/tile phase, scale `0.72 → 1.18`, opacity capped `0.15 → 0.035`; preserve high <=3, medium 1, mobile 0.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: enrich World water motion`

---

### Task 4: Smooth World lighting transitions

**Files:**
- Modify: `components/hex-world/HexWorldLighting.tsx`
- Modify: `tests/hex-graphics-quality-pass.test.ts`

**Interfaces:**
- Consumes: `HexMotionProfile.lightingResponse` plus existing `HexVisualEnvironment` target values.
- Produces: ref-based intensity/color interpolation while preserving one directional shadow owner.

- [ ] **Step 1: Write failing lighting contracts**

Require `HexWorldLighting` to accept `motionProfile`, use `useFrame`, use Three light refs and `THREE.Color.lerp`, and avoid React state for per-frame interpolation. Keep exactly one `<directionalLight` and preserve bounded `ContactShadows`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts`

Expected: FAIL because lighting currently renders target values directly.

- [ ] **Step 3: Implement ref-based lighting interpolation**

Create refs for directional, hemisphere, and ambient lights. Derive target intensities/colors from existing environment calculations. In `useFrame`, compute `alpha = expSmoothingAlpha(delta, motionProfile.lightingResponse)` and lerp intensities and `THREE.Color` values. Initialize refs to target values on mount so first render is not dark.

World contact shadow values become opacity `0.22` normal / `0.19` rainy and blur `3.2` high / `3.8` medium/mobile. Preserve current Explore-specific contact presentation.

- [ ] **Step 4: Wire `motionProfile` from `HexWorld3D`**

Update the existing `HexWorldLighting` call only; do not add another lighting owner.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-graphics-quality-pass.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: smooth World lighting transitions`

---

### Task 5: Strengthen tactile building feedback

**Files:**
- Modify: `components/hex-world/HexBuildings.tsx`
- Modify: `tests/hex-premium-motion-contract.test.ts`

**Interfaces:**
- Consumes: existing `HexConfirmedVisualEvent` and `HexMotionProfile.buildingFeedbackScale`.
- Produces: transient scale/lift feedback that always converges back to authoritative DTO transforms.

- [ ] **Step 1: Write failing building-feedback contracts**

Require selected scale `1.045`, selected lift `0.055`, placed start Y `+0.72`, moved start Y `+0.30`, and rotation compression `0.975`. Require all mutation feedback to remain local ref transforms and avoid writing API/persistence state.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --import tsx --test tests/hex-premium-motion-contract.test.ts`

Expected: FAIL on old selection/placement values and missing rotation compression.

- [ ] **Step 3: Implement minimal transient feedback**

Scale event offsets by `buildingFeedbackScale` for normal profiles. For reduced motion, preserve existing short functional timing and avoid exaggerated offsets. On confirmed `placed`, `moved`, or `rotated` events, set only the Three group presentation transform; existing per-frame convergence returns to authoritative `target`, `targetYaw`, and selection target.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-premium-motion-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: strengthen World building feedback`

---

### Task 6: Add bounded non-cumulative camera idle breathing

**Files:**
- Modify: `components/hex-world/HexDioramaCamera.tsx`
- Modify: `tests/hex-camera-manual-zoom-regression.test.ts`
- Modify or create focused contract under: `tests/hex-world-visual-motion-v2.test.ts`

**Interfaces:**
- Consumes: `HexMotionProfile.worldIdleCameraScale`, existing scripted-motion lifecycle, reduced-motion preference, and OrbitControls events.
- Produces: delayed target-only drift relative to a captured manual baseline.

- [ ] **Step 1: Write failing camera contracts**

Require:

- idle threshold exactly `2500` ms;
- offsets bounded by X `0.035`, Y `0.018`, Z `0.028`;
- frequencies `0.11`, `0.08`, `0.095` Hz;
- breathing disabled while scripted motion is active and under reduced motion;
- `onStart` restores baseline and disables breathing immediately;
- drift derives from a captured baseline and is not cumulative;
- existing manual-zoom regression still asserts equivalent React rerenders do not re-arm scripted camera motion.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --import tsx --test tests/hex-camera-manual-zoom-regression.test.ts tests/hex-world-visual-motion-v2.test.ts`

Expected: FAIL because idle breathing does not exist.

- [ ] **Step 3: Implement the idle lifecycle**

Track refs for the stable manual target baseline, last manual interaction timestamp, and whether breathing is active. During idle and only when `!scriptedMotion.current && !reducedMotion`, set `controls.target` to `baseline + periodicOffset`; never feed the drifted target back into the baseline. On `onStart`, restore `controls.target` from baseline before OrbitControls handles the new gesture, set the manual timestamp, and disable scripted/breathing motion. Update the baseline after OrbitControls changes settle via `onEnd`/controlled target capture without changing semantic camera command keys.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --import tsx --test tests/hex-camera-manual-zoom-regression.test.ts tests/hex-world-visual-motion-v2.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add World camera idle breathing`

---

### Task 7: Full regression, PR evidence, and production handoff

**Files:**
- Update PR description only after exact-head verification.

**Interfaces:**
- Consumes: final feature branch head.
- Produces: merge-ready PR with exact CI evidence; after user requests merge, Railway production must be verified on resulting `main` SHA.

- [ ] **Step 1: Run complete Hex Homestead CI on exact branch head**

Required gates:

1. dependency advisory gate;
2. Prisma validation;
3. migrations;
4. security hardening regressions;
5. complete Hex pure suite;
6. DB/Redis undo integration;
7. farm regression;
8. lint;
9. production build;
10. production runtime smoke.

- [ ] **Step 2: Fix only evidence-backed failures and rerun exact-head CI**

Do not merge a red head. Source-contract tests may be updated only when they encode an intentionally changed presentation constant and the new behavior-specific contract is already green.

- [ ] **Step 3: Mark PR ready with final evidence**

Record exact head SHA, CI run number, and completed scope in the PR body.

- [ ] **Step 4: Merge only when explicitly requested**

Use expected-head protection and squash merge.

- [ ] **Step 5: Verify Railway production after merge**

Confirm Railway deployment metadata contains the resulting `main` merge SHA and status `SUCCESS` before claiming the feature live.
