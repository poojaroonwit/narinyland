# Narinyland 3D Smoothness v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Narinyland's existing R3F/Three.js world feel materially smoother through frame-rate-independent player, camera, avatar, resident, and adaptive-rendering improvements without changing gameplay authority or persistence.

**Architecture:** Add pure smoothing/adaptive-quality helpers under `lib/hex-world/`, then consume them from the existing player, avatar, living-world, and world renderer components. Keep high-frequency motion in refs/R3F frame loops and allow React state changes only at coarse boundaries such as moving-state and adaptive quality bucket transitions.

**Tech Stack:** Next.js 16, React 19, Three.js 0.182, React Three Fiber 9.5, Drei 10.7, Node test runner + tsx, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-24-3d-smoothness-v1-design.md`

## Global Constraints

- Player maximum speed remains exactly `1.7` world units/second.
- Default smoothing rates: acceleration `12`, deceleration `16`, heading `12`, avatar gait `10`, camera follow `8.5`, resident position/heading `10`.
- Adaptive quality thresholds: performance factor `< 0.40` => mobile, `< 0.70` => medium, otherwise static cap; never promote above the static profile.
- `resolveWalkablePlayerPosition` remains traversal authority.
- `getHomesteadPresencePosition` remains resident route authority.
- Resident interaction reporting remains based on deterministic samples, not delayed visual interpolation.
- No Prisma, API, save-schema, economy, undo, interaction-radius, multiplayer, engine, physics, WebGPU, or post-processing changes.
- Reduced-motion may converge nearly immediately and must minimize decorative gait/bob.
- No raw per-frame React state updates.

---

### Task 1: Pure smoothing primitives

**Files:**
- Create: `lib/hex-world/smooth-motion.ts`
- Create: `tests/hex-smooth-motion.test.ts`

**Interfaces:**
- Produces: `smoothScalar(current: number, target: number, response: number, deltaSeconds: number): number`
- Produces: `smoothVector2(current: {x:number;z:number}, target: {x:number;z:number}, response: number, deltaSeconds: number): {x:number;z:number}`
- Produces: `smoothAngle(current: number, target: number, response: number, deltaSeconds: number): number`
- Produces: `HEX_SMOOTHNESS_DEFAULTS` containing the exact rates from Global Constraints.

- [ ] **Step 1: Write failing pure tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { smoothAngle, smoothScalar, smoothVector2, HEX_SMOOTHNESS_DEFAULTS } from '@/lib/hex-world/smooth-motion';

test('scalar smoothing is stable across frame sizes', () => {
  let sixty = 0;
  for (let i = 0; i < 60; i += 1) sixty = smoothScalar(sixty, 1, 12, 1 / 60);
  let thirty = 0;
  for (let i = 0; i < 30; i += 1) thirty = smoothScalar(thirty, 1, 12, 1 / 30);
  assert.ok(Math.abs(sixty - thirty) < 1e-6);
});

test('vector smoothing converges without overshoot', () => {
  const next = smoothVector2({ x: 0, z: 0 }, { x: 1, z: -1 }, 12, 1 / 60);
  assert.ok(next.x > 0 && next.x < 1);
  assert.ok(next.z < 0 && next.z > -1);
});

test('shortest-angle smoothing crosses pi boundary', () => {
  const next = smoothAngle(Math.PI - 0.1, -Math.PI + 0.1, 12, 1 / 60);
  assert.ok(next > Math.PI - 0.1 || next < -Math.PI + 0.1);
});

test('invalid smoothing inputs stay finite', () => {
  assert.ok(Number.isFinite(smoothScalar(Number.NaN, 1, 12, 1 / 60)));
  assert.ok(Number.isFinite(smoothScalar(0, Number.POSITIVE_INFINITY, 12, 1 / 60)));
});

test('locked defaults remain exact', () => {
  assert.deepEqual(HEX_SMOOTHNESS_DEFAULTS, {
    acceleration: 12,
    deceleration: 16,
    heading: 12,
    gait: 10,
    camera: 8.5,
    resident: 10,
  });
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --import tsx --test tests/hex-smooth-motion.test.ts`
Expected: FAIL because `smooth-motion.ts` does not exist yet.

- [ ] **Step 3: Implement minimal pure helpers**

```ts
export const HEX_SMOOTHNESS_DEFAULTS = {
  acceleration: 12,
  deceleration: 16,
  heading: 12,
  gait: 10,
  camera: 8.5,
  resident: 10,
} as const;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function alpha(response: number, deltaSeconds: number): number {
  const r = Math.max(0, finite(response));
  const dt = Math.max(0, finite(deltaSeconds));
  return 1 - Math.exp(-r * dt);
}

export function smoothScalar(current: number, target: number, response: number, deltaSeconds: number): number {
  const from = finite(current);
  const to = finite(target, from);
  return from + (to - from) * alpha(response, deltaSeconds);
}

export function smoothVector2(current: { x: number; z: number }, target: { x: number; z: number }, response: number, deltaSeconds: number) {
  return {
    x: smoothScalar(current.x, target.x, response, deltaSeconds),
    z: smoothScalar(current.z, target.z, response, deltaSeconds),
  };
}

export function smoothAngle(current: number, target: number, response: number, deltaSeconds: number): number {
  const from = finite(current);
  const to = finite(target, from);
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * alpha(response, deltaSeconds);
}
```

- [ ] **Step 4: Run pure test and verify GREEN**

Run: `node --import tsx --test tests/hex-smooth-motion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/smooth-motion.ts tests/hex-smooth-motion.test.ts
git commit -m "feat: add frame-rate-safe smooth motion helpers"
```

---

### Task 2: Player locomotion, heading, camera, and gait blend

**Files:**
- Modify: `components/hex-world/HexPlayerController.tsx`
- Modify: `components/hex-world/HexPlayerAvatar.tsx`
- Create: `tests/hex-smooth-player-contract.test.ts`

**Interfaces:**
- Consumes: `HEX_SMOOTHNESS_DEFAULTS`, `smoothVector2`, `smoothAngle`, `smoothScalar`.
- Produces: `HexPlayerAvatar` prop `movementAmount: number` in `[0,1]` instead of binary `moving` as its gait driver.

- [ ] **Step 1: Write failing source-contract tests**

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('player smooths velocity while preserving traversal authority', async () => {
  const source = await read('components/hex-world/HexPlayerController.tsx');
  assert.match(source, /smoothVector2/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.acceleration/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.deceleration/);
  assert.match(source, /resolveWalkablePlayerPosition/);
  assert.match(source, /PLAYER_SPEED\s*=\s*1\.7/);
});

test('player smooths heading and camera target', async () => {
  const source = await read('components/hex-world/HexPlayerController.tsx');
  assert.match(source, /smoothAngle/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.heading/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.camera/);
});

test('avatar gait is driven by normalized movement amount', async () => {
  const source = await read('components/hex-world/HexPlayerAvatar.tsx');
  assert.match(source, /movementAmount/);
  assert.match(source, /smoothScalar/);
  assert.doesNotMatch(source, /const stride = moving \?/);
});
```

- [ ] **Step 2: Run contract test and verify RED**

Run: `node --import tsx --test tests/hex-smooth-player-contract.test.ts`
Expected: FAIL on missing smooth-motion integration and `movementAmount`.

- [ ] **Step 3: Integrate transient velocity in `HexPlayerController`**

Implementation requirements:
- add `velocityRef = useRef({ x: 0, z: 0 })`;
- compute requested velocity as camera-relative unit movement × `PLAYER_SPEED × inputMagnitude`;
- choose response `12` while requested speed is non-zero and `16` while stopping;
- when `movementSuspended`, target velocity is zero and traversal must not drift; clamp tiny velocity components to zero;
- pass the velocity-derived proposed position through `resolveWalkablePlayerPosition` exactly as today;
- when traversal rejects a proposed position, zero the rejected velocity axis enough to avoid edge jitter;
- derive `movementAmount = clamp(hypot(vx,vz) / PLAYER_SPEED, 0, 1)`;
- continue reporting interaction targets from authoritative resolved player position.

- [ ] **Step 4: Smooth heading and camera follow**

Implementation requirements:
- replace manual heading alpha math with `smoothAngle(..., 12, delta)`;
- replace direct target lerp coefficient with `smoothScalar`-derived exponential alpha or direct vector interpolation using the same exponential law at response `8.5`;
- preserve OrbitControls zoom/orbit authority and immediate spawn/reset initialization;
- avoid a React state update every frame; only coarse moving state may remain stateful if needed for compatibility.

- [ ] **Step 5: Blend avatar gait**

Implementation requirements:
- `HexPlayerAvatar` accepts `movementAmount: number` and `reducedMotion`;
- keep an internal `gaitAmountRef` and converge it to clamped movement amount at response `10`;
- multiply stride/lift/body lean by the smoothed gait amount;
- reduced-motion zeros decorative bob but keeps enough limb response for readable movement if desired by existing behavior;
- no gameplay imports beyond the pure smoothing helper.

- [ ] **Step 6: Run focused tests**

Run: `node --import tsx --test tests/hex-smooth-motion.test.ts tests/hex-smooth-player-contract.test.ts tests/hex-player-controller-contract.test.ts tests/hex-explore-mobile-controls-contract.test.ts tests/hex-explore-interaction-controller-contract.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/HexPlayerController.tsx components/hex-world/HexPlayerAvatar.tsx tests/hex-smooth-player-contract.test.ts
git commit -m "feat: smooth Explore locomotion and camera follow"
```

---

### Task 3: Resident visual interpolation without authority drift

**Files:**
- Modify: `components/hex-world/HexLivingWorldLayer.tsx`
- Create: `tests/hex-smooth-resident-contract.test.ts`

**Interfaces:**
- Consumes: `smoothScalar`, `smoothAngle`, `HEX_SMOOTHNESS_DEFAULTS.resident`.
- Preserves: `getHomesteadPresencePosition` as deterministic route authority.

- [ ] **Step 1: Write failing resident contract**

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('living world visually interpolates deterministic resident transforms', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingWorldLayer.tsx', import.meta.url), 'utf8');
  assert.match(source, /getHomesteadPresencePosition/);
  assert.match(source, /smoothScalar/);
  assert.match(source, /smoothAngle/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.resident/);
  assert.doesNotMatch(source, /ref\.current\.rotation\.y\s*=\s*next\.heading/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --import tsx --test tests/hex-smooth-resident-contract.test.ts`
Expected: FAIL because visual interpolation is not integrated.

- [ ] **Step 3: Implement visual interpolation**

Implementation requirements inside `usePresenceMotion`:
- keep calling `getHomesteadPresencePosition` every frame;
- with reduced motion, converge immediately;
- otherwise smooth current visual `position.x/y/z` toward deterministic `next` at response `10`;
- add bob after the smoothed authoritative Y target rather than feeding bob back into the smoothed state;
- smooth `rotation.y` using shortest-angle interpolation at response `10`;
- do not change resident reporter or presence-route code.

- [ ] **Step 4: Run focused tests**

Run: `node --import tsx --test tests/hex-smooth-motion.test.ts tests/hex-smooth-resident-contract.test.ts tests/hex-living-homestead-v3.test.ts tests/hex-explore-resident-reporter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexLivingWorldLayer.tsx tests/hex-smooth-resident-contract.test.ts
git commit -m "feat: smooth living world resident motion"
```

---

### Task 4: Adaptive quality and scene warm-up

**Files:**
- Modify: `lib/hex-world/quality.ts`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Create: `tests/hex-adaptive-quality.test.ts`
- Create: `tests/hex-world-smoothness-contract.test.ts`

**Interfaces:**
- Produces: `resolveAdaptiveHexQuality(staticProfile: HexQualityProfile, performanceFactor: number): HexQualityProfile`.
- Consumes in world: Drei `PerformanceMonitor`, Drei `Preload`.

- [ ] **Step 1: Write failing adaptive-quality tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAdaptiveHexQuality, resolveHexQualityProfile } from '@/lib/hex-world/quality';

test('adaptive quality never exceeds static cap', () => {
  const medium = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(medium, 1).name, 'medium');
});

test('poor performance degrades high through existing buckets', () => {
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(high, 0.69).name, 'medium');
  assert.equal(resolveAdaptiveHexQuality(high, 0.39).name, 'mobile');
});

test('mobile cap never promotes', () => {
  const mobile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 500 });
  assert.equal(resolveAdaptiveHexQuality(mobile, 1).name, 'mobile');
});
```

- [ ] **Step 2: Write failing world integration contract**

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('world mounts bounded performance adaptation and scene preload', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(source, /PerformanceMonitor/);
  assert.match(source, /Preload/);
  assert.match(source, /resolveAdaptiveHexQuality/);
  assert.match(source, /onChange|onDecline|onIncline/);
});
```

- [ ] **Step 3: Run both tests and verify RED**

Run: `node --import tsx --test tests/hex-adaptive-quality.test.ts tests/hex-world-smoothness-contract.test.ts`
Expected: FAIL because adaptive resolver and monitor/preload are absent.

- [ ] **Step 4: Add rank-safe adaptive resolver**

Implementation requirements:
- export stable profile lookup/rank utilities only as needed;
- sanitize performance factor into `[0,1]`;
- factor `< 0.40` requests mobile;
- factor `< 0.70` requests medium;
- otherwise requests static profile;
- effective result is `min(static cap, requested)` in quality rank terms, so medium can become mobile but never high, and mobile always stays mobile.

- [ ] **Step 5: Integrate `PerformanceMonitor` in `HexWorld3D`**

Implementation requirements:
- import `PerformanceMonitor` and `Preload` from `@react-three/drei`;
- hold a coarse performance factor or quality bucket in React state, initialized to `1`;
- use monitor callbacks to update only when the derived profile name would actually change;
- use bounds/hysteresis behavior supplied by `PerformanceMonitor` so quality does not oscillate frame-by-frame;
- compute `staticProfile` first, then `profile = resolveAdaptiveHexQuality(staticProfile, performanceFactor)`;
- preserve current mobile static cap;
- mount `<Preload all />` inside the Canvas after scene content;
- no package dependency changes because Drei is already installed.

- [ ] **Step 6: Run focused quality/render tests**

Run: `node --import tsx --test tests/hex-adaptive-quality.test.ts tests/hex-world-smoothness-contract.test.ts tests/hex-quality.test.ts tests/hex-render-budget.test.ts tests/hex-premium-motion-contract.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/hex-world/quality.ts components/hex-world/HexWorld3D.tsx tests/hex-adaptive-quality.test.ts tests/hex-world-smoothness-contract.test.ts
git commit -m "feat: adapt Hex quality and preload scene shaders"
```

---

### Task 5: Full regression verification and PR readiness

**Files:**
- Modify only if a regression is proven by the full gate.
- Update PR body with exact verification evidence.

**Interfaces:**
- Produces: a merge-ready branch with no known regression and an exact-head green CI run.

- [ ] **Step 1: Run the complete local pure Hex gate available in CI**

```bash
PURE_HEX_TESTS=$(find tests -maxdepth 1 -name 'hex-*.test.ts' ! -name 'hex-world-undo-db.test.ts' -print | sort | tr '\n' ' ')
node --import tsx --test $PURE_HEX_TESTS tests/garden-hex-integration.test.ts tests/production-startup.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2: Run lint and production build**

Run: `npm run lint && npm run build`
Expected: both exit 0.

- [ ] **Step 3: Open or update the PR against `main` and allow `Hex Homestead CI` to run on the exact branch head**

PR body must state the locked smoothing constants, no authority/persistence changes, and TDD evidence.

- [ ] **Step 4: Verify every CI step on the exact head**

Required green steps:
1. dependency advisory gate
2. Prisma validate
3. migrations
4. security hardening v2 regressions
5. Hex Homestead pure tests
6. Hex Undo DB and Redis integration
7. existing farm regression
8. lint
9. production build
10. production runtime smoke

- [ ] **Step 5: Fix only proven regressions, rerun the complete gate, and mark PR ready only after an exact-head full success**

- [ ] **Step 6: Final commit/PR metadata**

Use concise PR title: `feat: smooth Narinyland 3D motion`
