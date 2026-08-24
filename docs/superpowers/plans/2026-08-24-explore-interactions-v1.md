# Explore Interactions v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic proximity-based building/resource interactions to person-scale Explore, with desktop `E` and mobile Interact controls that reuse existing Homestead Life action panels.

**Architecture:** `HexPlayerController` remains the owner of the real Explore player position and resolves the nearest supported building through a pure helper. It reports target identity changes through `HexWorld3D` to `HexBuildController`; the controller owns transient target/open state and `HexGameplayOverlay` coordinates the prompt, existing quick/deep panels, Bag/Goals exclusivity, and the existing shared movement-input ref.

**Tech Stack:** Next.js 16, React, TypeScript, React Three Fiber, Three.js, Node test runner, existing Hex Homestead CI.

**Spec:** `docs/superpowers/specs/2026-08-24-explore-interactions-v1-design.md`

## Global Constraints

- Interaction radius is exactly **1.7 world units** on X/Z only.
- Eligible targets must have a non-null role from `getLivingBuildingRole`.
- Nearest distance wins; exact-distance ties sort by building id.
- No raycast-based target discovery and no persisted player coordinates.
- No new API routes, Prisma models, DB columns, economies, action reducers, physics, navmesh, quests, combat, or NPC dialogue.
- `HexPlayerController` reports target changes only when target building id changes.
- Interaction panels reuse `HexQuickActionPanel` and `HexLivingActionPanel`.
- Open interaction surfaces suspend keyboard movement and zero/disable the existing shared touch movement ref.
- World/build/farm/expand/move behavior remains unchanged.

---

### Task 1: Pure proximity resolver

**Files:**
- Create: `lib/hex-world/explore-interactions.ts`
- Create: `tests/hex-explore-interactions.test.ts`

**Interfaces:**
- Consumes: `HexBuildingDTO`, `HexPlayerPosition`, `axialToWorld`, `getLivingBuildingRole`.
- Produces:
  - `export const HEX_EXPLORE_INTERACTION_RADIUS = 1.7`
  - `export type HexExploreInteractionTarget = { buildingId: string; building: HexBuildingDTO; role: Exclude<LivingBuildingRole, null>; distance: number }`
  - `export function getExploreInteractionTarget(player: Pick<HexPlayerPosition, 'x' | 'z'>, buildings: HexBuildingDTO[]): HexExploreInteractionTarget | null`

- [ ] **Step 1: Write the failing pure tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getExploreInteractionTarget, HEX_EXPLORE_INTERACTION_RADIUS } from '@/lib/hex-world/explore-interactions';

const building = (id: string, buildingKey: string, q: number, r: number) => ({
  id, worldId: 'world', buildingKey, anchorQ: q, anchorR: r, rotation: 0,
  modelUrl: null, metadata: null, createdAt: '', updatedAt: '',
} as any);

test('nearest supported interaction target inside 1.7 wins', () => {
  const target = getExploreInteractionTarget({ x: 0, z: 0 }, [
    building('b', 'pond', 1, 0),
    building('a', 'home', 0, 0),
  ]);
  assert.equal(HEX_EXPLORE_INTERACTION_RADIUS, 1.7);
  assert.equal(target?.buildingId, 'a');
});

test('unsupported and out-of-range targets are ignored', () => {
  assert.equal(getExploreInteractionTarget({ x: 0, z: 0 }, [building('x', 'lamp', 0, 0)]), null);
  assert.equal(getExploreInteractionTarget({ x: 20, z: 20 }, [building('a', 'home', 0, 0)]), null);
});

test('exact-distance ties resolve by building id and ignore Y', () => {
  const target = getExploreInteractionTarget({ x: 0, z: 0 }, [
    building('z', 'home', 1, 0),
    building('a', 'pond', -1, 0),
  ]);
  assert.equal(target?.buildingId, 'a');
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run through the repo test command used by CI:
```bash
node --import tsx --test tests/hex-explore-interactions.test.ts
```
Expected: FAIL because `lib/hex-world/explore-interactions.ts` does not exist.

- [ ] **Step 3: Implement the pure resolver**

```ts
import { axialToWorld } from './hex-grid';
import { getLivingBuildingRole, type LivingBuildingRole } from './living-homestead';
import type { HexPlayerPosition } from './player-exploration';
import type { HexBuildingDTO } from './types';

export const HEX_EXPLORE_INTERACTION_RADIUS = 1.7;

type SupportedRole = Exclude<LivingBuildingRole, null>;

export type HexExploreInteractionTarget = {
  buildingId: string;
  building: HexBuildingDTO;
  role: SupportedRole;
  distance: number;
};

export function getExploreInteractionTarget(
  player: Pick<HexPlayerPosition, 'x' | 'z'>,
  buildings: HexBuildingDTO[],
): HexExploreInteractionTarget | null {
  const candidates = buildings.flatMap((building) => {
    const role = getLivingBuildingRole(building.buildingKey);
    if (!role) return [];
    const world = axialToWorld({ q: building.anchorQ, r: building.anchorR });
    const distance = Math.hypot(world.x - player.x, world.z - player.z);
    if (distance > HEX_EXPLORE_INTERACTION_RADIUS) return [];
    return [{ buildingId: building.id, building, role, distance }];
  });
  candidates.sort((a, b) => a.distance - b.distance || a.buildingId.localeCompare(b.buildingId));
  return candidates[0] ?? null;
}
```

- [ ] **Step 4: Run focused test and confirm GREEN**

```bash
node --import tsx --test tests/hex-explore-interactions.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/explore-interactions.ts tests/hex-explore-interactions.test.ts
git commit -m "feat: add Explore proximity resolver"
```

---

### Task 2: Player target reporting and R3F wiring

**Files:**
- Modify: `components/hex-world/HexPlayerController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Create: `tests/hex-explore-interaction-controller-contract.test.ts`

**Interfaces:**
- Consumes: `getExploreInteractionTarget` from Task 1.
- Produces:
  - `HexPlayerController` prop `onInteractionTargetChange?: (target: HexExploreInteractionTarget | null) => void`
  - `HexWorld3D` prop with the same callback, passed only into the person controller path.

- [ ] **Step 1: Write failing controller contracts**

```ts
assert.match(playerSource, /getExploreInteractionTarget/);
assert.match(playerSource, /lastInteractionTargetIdRef/);
assert.match(playerSource, /onInteractionTargetChange/);
assert.match(worldSource, /onInteractionTargetChange/);
assert.match(worldSource, /viewMode === 'person'/);
```

Also assert that the callback comparison is keyed by building id, not distance.

- [ ] **Step 2: Run focused contract test and confirm RED**

```bash
node --import tsx --test tests/hex-explore-interaction-controller-contract.test.ts
```
Expected: FAIL because callback/reporting wiring is absent.

- [ ] **Step 3: Implement change-gated reporting**

In `HexPlayerController`, add:
```ts
const lastInteractionTargetIdRef = useRef<string | null>(null);
```

After `positionRef.current = next` in the existing frame loop:
```ts
const target = getExploreInteractionTarget(next, buildings);
const targetId = target?.buildingId ?? null;
if (targetId !== lastInteractionTargetIdRef.current) {
  lastInteractionTargetIdRef.current = targetId;
  onInteractionTargetChange?.(target);
}
```

On reset/unmount, set the ref to `null` and report `null` if needed.

In `HexWorld3D`, add the callback to `Props` and pass it only to `<HexPlayerController ... />`.

- [ ] **Step 4: Run focused contract test and confirm GREEN**

```bash
node --import tsx --test tests/hex-explore-interaction-controller-contract.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexPlayerController.tsx components/hex-world/HexWorld3D.tsx tests/hex-explore-interaction-controller-contract.test.ts
git commit -m "feat: report nearby Explore targets"
```

---

### Task 3: Desktop/mobile interaction prompt

**Files:**
- Create: `components/hex-world/HexExploreInteractionPrompt.tsx`
- Create: `tests/hex-explore-interaction-prompt.test.ts`

**Interfaces:**
- Consumes: `HexExploreInteractionTarget`, `getBuildingDefinition`.
- Produces:
  - `HexExploreInteractionPrompt({ target, disabled, onInteract })`

- [ ] **Step 1: Write failing prompt contracts**

Assert source contains:
```ts
'KeyE'
'event.repeat'
'isContentEditable'
'min-h-[44px]'
'onPointerDown'
'stopPropagation'
'Interact'
```

Also assert it does not import gameplay mutation APIs.

- [ ] **Step 2: Run focused prompt test and confirm RED**

```bash
node --import tsx --test tests/hex-explore-interaction-prompt.test.ts
```
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement prompt input safety**

Component behavior:
```ts
useEffect(() => {
  if (disabled) return;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code !== 'KeyE' || event.repeat || isEditableTarget(event.target)) return;
    event.preventDefault();
    onInteract();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [disabled, onInteract]);
```

Render desktop copy `E · Interact` and a mobile `Interact` button with minimum 44px size. Stop pointer propagation on the button only. Derive display name from `getBuildingDefinition(target.building.buildingKey)?.name`, with role-based fallback only when the definition is absent.

- [ ] **Step 4: Run focused prompt test and confirm GREEN**

```bash
node --import tsx --test tests/hex-explore-interaction-prompt.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexExploreInteractionPrompt.tsx tests/hex-explore-interaction-prompt.test.ts
git commit -m "feat: add Explore interaction prompt"
```

---

### Task 4: Controller ownership and overlay coordination

**Files:**
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexGameplayOverlay.tsx`
- Reuse: `components/hex-world/HexQuickActionPanel.tsx`
- Reuse: `components/hex-world/HexLivingActionPanel.tsx`
- Create: `tests/hex-explore-interaction-overlay-contract.test.ts`

**Interfaces:**
- Consumes: `HexExploreInteractionTarget`, existing `exploreMovementInputRef`.
- Produces controller state:
  - `exploreInteractionTarget: HexExploreInteractionTarget | null`
  - `exploreInteractionBuildingId: string | null` or equivalent open-state identity
- Overlay receives current target, active building, open/close callbacks, movement ref.

- [ ] **Step 1: Write failing integration contracts**

Assert:
```ts
assert.match(controllerSource, /exploreInteractionTarget/);
assert.match(controllerSource, /onInteractionTargetChange/);
assert.match(controllerSource, /ZERO_HEX_EXPLORE_MOVEMENT/);
assert.match(overlaySource, /HexExploreInteractionPrompt/);
assert.match(overlaySource, /HexQuickActionPanel/);
assert.match(overlaySource, /HexLivingActionPanel/);
```

Also assert interaction state is cleared in Land switch, World/build/farm/expand/move/reset paths and that Bag/Goals and proximity interaction are mutually exclusive.

- [ ] **Step 2: Run focused integration contract and confirm RED**

```bash
node --import tsx --test tests/hex-explore-interaction-overlay-contract.test.ts
```
Expected: FAIL because interaction state/prompt wiring is absent.

- [ ] **Step 3: Add controller transient state and lifecycle clearing**

In `HexBuildController`:
```ts
const [exploreInteractionTarget, setExploreInteractionTarget] = useState<HexExploreInteractionTarget | null>(null);
const [exploreInteractionBuildingId, setExploreInteractionBuildingId] = useState<string | null>(null);
```

Define one helper:
```ts
const clearExploreInteraction = () => {
  exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
  setExploreInteractionTarget(null);
  setExploreInteractionBuildingId(null);
};
```

Use it on Land switch, leaving person mode, build/farm/expand/move entry, reset, and any transition that currently zeros touch input.

Pass `onInteractionTargetChange={setExploreInteractionTarget}` into `HexWorld3D` only while person mode is active.

When opening interaction:
- verify target still exists in `snapshot.buildings`,
- zero movement ref,
- set active building id to current target id.

- [ ] **Step 4: Coordinate overlay panels**

In `HexGameplayOverlay`:
- resolve `interactionBuilding` from the active id and current snapshot,
- when interaction opens, close Bag/Goals/details first,
- when Bag/Goals opens, close interaction first,
- render `HexExploreInteractionPrompt` only in person mode with no blocking surface,
- render `HexQuickActionPanel` for the active interaction building,
- its `More` path opens `HexLivingActionPanel`,
- while quick/deep panel is open set `movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT`,
- disable/hide the mobile joystick by passing `touchControlsEnabled={false}` or the existing equivalent to `HexExploreHUD`,
- closing the interaction keeps `viewMode === 'person'` and does not reset camera/player.

If the active building id disappears from the snapshot, close the interaction.

- [ ] **Step 5: Run focused integration contract and confirm GREEN**

```bash
node --import tsx --test tests/hex-explore-interaction-overlay-contract.test.ts
```
Expected: PASS.

- [ ] **Step 6: Run all Explore-focused tests**

```bash
node --import tsx --test tests/hex-explore-*.test.ts tests/hex-player-controller-contract.test.ts tests/hex-view-mode.test.ts
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/HexBuildController.tsx components/hex-world/HexGameplayOverlay.tsx tests/hex-explore-interaction-overlay-contract.test.ts
git commit -m "feat: open homestead actions from Explore"
```

---

### Task 5: Full regression and production gate

**Files:**
- Modify tests only if an existing contract directly contradicts the approved interaction design; do not weaken unrelated assertions.

- [ ] **Step 1: Open a draft PR so GitHub Actions tests the exact branch head**

PR title:
```text
feat: add Explore proximity interactions
```

- [ ] **Step 2: Verify Hex Homestead CI end-to-end**

Require the exact final head to pass:
- dependency/security gate,
- Prisma validate,
- migrations,
- security regressions,
- full Hex/Garden/startup pure suite,
- Hex Undo DB/Redis integration,
- existing farm regression,
- lint,
- production build,
- production runtime smoke.

- [ ] **Step 3: Debug failures by root cause only**

If a gate fails, read the exact job logs, identify the failing component, make one minimal fix, and rerun the same full CI. Do not merge with skipped or failing gates.

- [ ] **Step 4: Final requirement review**

Confirm from code/tests that:
- radius is exactly 1.7,
- target identity changes are callback-gated,
- desktop E and mobile Interact both work,
- editable controls and key repeat are ignored,
- quick/deep existing action panels are reused,
- interaction suspends movement,
- Bag/Goals are mutually exclusive with interaction,
- all lifecycle transitions clear transient interaction state,
- World mode selection and build/farm/expand behavior remain unchanged,
- no backend/schema/economy changes were added.

- [ ] **Step 5: Mark PR ready only after full green verification**

Do not claim production readiness or merge until the exact head has the complete successful CI evidence.
