# Explore Mobile Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Narinyland person-scale Explore mode fully playable on phones using a left virtual joystick while preserving the existing drag/pinch camera and authoritative traversal rules.

**Architecture:** `HexBuildController` owns one transient movement ref shared between the DOM overlay and the R3F world. `HexExploreTouchControls` writes normalized analog axes into that ref; `HexPlayerController` combines them with keyboard axes and routes the result through the existing camera-relative movement and unlocked-tile walkability helpers. `HexGameplayOverlay` decides when touch movement is suspended so opening Bag/Goals or leaving Explore cannot leave stale movement active.

**Tech Stack:** Next.js 16, React 19, TypeScript, React Three Fiber, Drei `OrbitControls`, Pointer Events, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-24-explore-mobile-controls-design.md`

## Global Constraints

- Touch is an additional input source only; `HexPlayerController` remains traversal authority.
- World/build/farm/expand behavior stays unchanged.
- Touch movement must reset on pointer end/cancel/lost capture, blocking UI, view change, Land change, and reset/re-spawn.
- Joystick uses `touch-action: none` only on its own surface and must not hijack camera gestures elsewhere.
- Desktop WASD/arrows, mouse orbit, and wheel zoom remain unchanged.
- No sprint, jump, combat, tap-to-move, dual sticks, gamepad, multiplayer sync, camera collision, DB/API/save/economy changes.

---

### Task 1: Pure analog movement input

**Files:**
- Create: `lib/hex-world/explore-movement-input.ts`
- Create: `tests/hex-explore-movement-input.test.ts`

**Interfaces:**
- Produces `HexExploreMovementInput = { forward: number; right: number }`.
- Produces `ZERO_HEX_EXPLORE_MOVEMENT`.
- Produces `getJoystickMovementInput({ dx, dy, radius, deadZone? }): HexExploreMovementInput`.
- Produces `combineExploreMovementInputs(...inputs): HexExploreMovementInput`.

- [ ] **Step 1: Write failing pure tests**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  combineExploreMovementInputs,
  getJoystickMovementInput,
} from '@/lib/hex-world/explore-movement-input';

test('joystick center and dead zone resolve to zero', () => {
  assert.deepEqual(getJoystickMovementInput({ dx: 0, dy: 0, radius: 36 }), { forward: 0, right: 0 });
  assert.deepEqual(getJoystickMovementInput({ dx: 2, dy: 2, radius: 36, deadZone: 0.18 }), { forward: 0, right: 0 });
});

test('joystick maps screen axes to forward/right and clamps magnitude', () => {
  const up = getJoystickMovementInput({ dx: 0, dy: -36, radius: 36 });
  assert.equal(up.forward, 1);
  assert.equal(up.right, 0);
  const right = getJoystickMovementInput({ dx: 36, dy: 0, radius: 36 });
  assert.equal(right.forward, 0);
  assert.equal(right.right, 1);
  const diagonal = getJoystickMovementInput({ dx: 100, dy: -100, radius: 36 });
  assert.ok(Math.hypot(diagonal.forward, diagonal.right) <= 1 + 1e-9);
});

test('invalid joystick geometry resolves safely to zero', () => {
  assert.deepEqual(getJoystickMovementInput({ dx: Number.NaN, dy: 0, radius: 36 }), { forward: 0, right: 0 });
  assert.deepEqual(getJoystickMovementInput({ dx: 1, dy: 1, radius: 0 }), { forward: 0, right: 0 });
});

test('keyboard and touch combination never exceeds magnitude one', () => {
  const combined = combineExploreMovementInputs({ forward: 1, right: 0 }, { forward: 1, right: 1 });
  assert.ok(Math.hypot(combined.forward, combined.right) <= 1 + 1e-9);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/hex-explore-movement-input.test.ts`

Expected: FAIL because `explore-movement-input.ts` does not exist.

- [ ] **Step 3: Implement pure movement helpers**

Use a default radial dead zone of `0.18`. Reject non-finite `dx`, `dy`, `radius`, or non-positive `radius`. Normalize screen displacement by radius, clamp magnitude to `1`, map negative screen Y to positive `forward`, and remap magnitude after the dead zone so analog travel remains smooth. `combineExploreMovementInputs` sums inputs and normalizes only when magnitude exceeds `1`.

- [ ] **Step 4: Re-run focused test and verify GREEN**

Run: `node --import tsx --test tests/hex-explore-movement-input.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/explore-movement-input.ts tests/hex-explore-movement-input.test.ts
git commit -m "feat: add Explore analog movement input"
```

---

### Task 2: Mobile joystick UI and reset semantics

**Files:**
- Create: `components/hex-world/HexExploreTouchControls.tsx`
- Create: `tests/hex-explore-touch-controls.test.ts`

**Interfaces:**
- Consumes a `MutableRefObject<HexExploreMovementInput>` named `movementInputRef`.
- Consumes `enabled: boolean`.
- Writes normalized axes using `getJoystickMovementInput`.

- [ ] **Step 1: Write failing source contract tests**

Verify the component:

```ts
assert.match(source, /setPointerCapture/);
assert.match(source, /releasePointerCapture|hasPointerCapture/);
assert.match(source, /onPointerCancel/);
assert.match(source, /onLostPointerCapture/);
assert.match(source, /stopPropagation\(\)/);
assert.match(source, /touch-none/);
assert.match(source, /sm:hidden/);
assert.match(source, /aria-label=["']Movement joystick["']/);
assert.match(source, /ZERO_HEX_EXPLORE_MOVEMENT/);
```

Also require cleanup/reset when disabled or unmounted.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/hex-explore-touch-controls.test.ts`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement `HexExploreTouchControls`**

Use one active pointer ID. On pointer down, capture the pointer and compute the joystick center from `getBoundingClientRect()`. On move, ignore other pointers, calculate `dx/dy`, write normalized movement, and translate the thumb within the effective travel radius. On pointer up/cancel/lost capture, reset movement and thumb. On `enabled=false` and unmount, write `ZERO_HEX_EXPLORE_MOVEMENT`.

Render an approximately `92px` circular pad with an approximately `42px` thumb, `sm:hidden`, `touch-none`, safe-area-aware bottom/left positioning, and pointer-event isolation from the R3F camera.

- [ ] **Step 4: Re-run focused test and verify GREEN**

Run: `node --import tsx --test tests/hex-explore-touch-controls.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexExploreTouchControls.tsx tests/hex-explore-touch-controls.test.ts
git commit -m "feat: add Explore mobile joystick"
```

---

### Task 3: Share touch axes across overlay and R3F player

**Files:**
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexGameplayOverlay.tsx`
- Modify: `components/hex-world/HexExploreHUD.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `components/hex-world/HexPlayerController.tsx`
- Create: `tests/hex-explore-mobile-controls-contract.test.ts`
- Modify if needed: `tests/hex-player-controller-contract.test.ts`
- Modify if needed: `tests/hex-view-mode.test.ts`

**Interfaces:**
- `HexBuildController` owns `const exploreMovementInputRef = useRef<HexExploreMovementInput>({ ...ZERO_HEX_EXPLORE_MOVEMENT })`.
- `HexWorld3D` and `HexGameplayOverlay` receive the same `movementInputRef`.
- `HexPlayerController` reads `movementInputRef.current` each frame.
- `HexExploreHUD` renders `HexExploreTouchControls` with `enabled={touchControlsEnabled}`.

- [ ] **Step 1: Write failing integration/source contracts**

Require:

```ts
assert.match(controller, /exploreMovementInputRef/);
assert.match(controller, /movementInputRef=\{exploreMovementInputRef\}/);
assert.match(world, /movementInputRef/);
assert.match(player, /combineExploreMovementInputs/);
assert.match(player, /movementInputRef\.current/);
assert.match(overlay, /touchControlsEnabled/);
assert.match(hud, /HexExploreTouchControls/);
assert.doesNotMatch(hud, /movement requires a keyboard/);
assert.match(hud, /Move with the joystick/);
```

Preserve existing WASD/arrows and `OrbitControls` assertions.

- [ ] **Step 2: Run focused contracts and verify RED**

Run: `node --import tsx --test tests/hex-explore-mobile-controls-contract.test.ts tests/hex-player-controller-contract.test.ts tests/hex-view-mode.test.ts`

Expected: new touch contracts FAIL while existing desktop/person contracts remain green.

- [ ] **Step 3: Wire the shared ref**

In `HexBuildController`:
- create the movement ref once;
- set `.current = ZERO_HEX_EXPLORE_MOVEMENT` on Land changes, when switching to World, and when entering build/farm/expand/move flows;
- pass it to `HexWorld3D` and `HexGameplayOverlay`.

In `HexWorld3D`:
- add optional movement-ref prop;
- pass it to `HexPlayerController` only in person mode.

In `HexPlayerController`:
- retain keyboard axis derivation;
- combine keyboard input and `movementInputRef?.current ?? ZERO_HEX_EXPLORE_MOVEMENT` through `combineExploreMovementInputs`;
- feed the result into existing `getCameraRelativeMoveVector` and `resolveWalkablePlayerPosition`;
- zero touch input on reset/re-spawn.

- [ ] **Step 4: Integrate overlay suspension and HUD**

In `HexGameplayOverlay`, derive touch controls as enabled only when:

```ts
viewMode === 'person' && interactive && !inventoryOpen && hudPanel === null && !detailsOpen
```

When that condition becomes false, immediately zero the shared ref. Pass the ref + boolean into `HexExploreHUD`.

In `HexExploreHUD`:
- render `HexExploreTouchControls`;
- change mobile helper copy to `Move with the joystick · drag to look`;
- keep desktop WASD/arrows helper untouched;
- ensure the left status card does not occupy the joystick hit area on narrow screens by moving/offsetting the status card above the joystick envelope.

- [ ] **Step 5: Re-run focused contracts and verify GREEN**

Run: `node --import tsx --test tests/hex-explore-mobile-controls-contract.test.ts tests/hex-explore-movement-input.test.ts tests/hex-explore-touch-controls.test.ts tests/hex-player-controller-contract.test.ts tests/hex-view-mode.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hex-world/HexBuildController.tsx components/hex-world/HexGameplayOverlay.tsx components/hex-world/HexExploreHUD.tsx components/hex-world/HexWorld3D.tsx components/hex-world/HexPlayerController.tsx tests/hex-explore-mobile-controls-contract.test.ts tests/hex-player-controller-contract.test.ts tests/hex-view-mode.test.ts
git commit -m "feat: connect mobile touch movement to Explore"
```

---

### Task 4: Full regression and merge-ready verification

**Files:**
- Modify tests only if a legacy assertion directly contradicts the approved mobile-touch behavior; preserve the behavioral intent rather than weakening coverage.

- [ ] **Step 1: Run complete pure suite**

Run the same command as Hex Homestead CI:

```bash
PURE_HEX_TESTS=$(find tests -maxdepth 1 -name 'hex-*.test.ts' ! -name 'hex-world-undo-db.test.ts' -print | sort | tr '\n' ' ')
node --import tsx --test $PURE_HEX_TESTS tests/garden-hex-integration.test.ts tests/production-startup.test.ts
```

Expected: zero failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: zero errors. Existing warnings are allowed by repository configuration.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 4: Push/open PR and use GitHub Actions as final integration gate**

The exact PR head must complete `Hex Homestead CI` successfully, including production dependency audit, Prisma validation/migrations, security regressions, pure tests, DB/Redis undo integration, existing farm regression, lint, production build, and production runtime smoke.

- [ ] **Step 5: Final review**

Confirm:
- phone-width Explore has joystick movement;
- drag/pinch camera remains outside joystick;
- Bag/Goals/view/Land/reset paths zero touch input;
- desktop behavior remains unchanged;
- no backend/schema/economy files changed.
