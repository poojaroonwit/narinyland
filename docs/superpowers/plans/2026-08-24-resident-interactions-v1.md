# Resident Interactions v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make moving partners, the unlocked child, and the chosen pet interactable in Explore mode with deterministic one-line conversations and existing Homestead actions.

**Architecture:** Keep `homestead-presence.ts` authoritative for moving resident positions and report only bounded transient resident samples from `HexLivingWorldLayer`. Generalize `explore-interactions.ts` into a discriminated building/resident target resolver using the existing exact 1.7-unit radius, then reuse the existing Explore prompt/open/close lifecycle for resident conversation cards and authoritative `pet_time` / `family_time` actions.

**Tech Stack:** Next.js 16, React, TypeScript, React Three Fiber, Three.js, Node test runner with `tsx`, Prisma/Postgres/Redis CI.

**Spec:** `docs/superpowers/specs/2026-08-24-resident-interactions-v1-design.md`

## Global Constraints

- Buildings and residents use exactly `1.7` world units of horizontal X/Z interaction radius.
- Moving resident coordinates are presentation-only and must never be persisted.
- Supported residents in v1 are `partner-1`, `partner-2`, unlocked `child`, and chosen `pet` only.
- Cow and sheep remain Barn-driven gameplay and are not direct Explore interaction targets.
- Dialogue is deterministic from existing Homestead state and contains exactly one context line; no pagination, history, LLM/network request, affection, gifting, quests, voice, or new economy.
- Existing Homestead actions remain authoritative; resident UI may invoke `pet_time` and `family_time` only through the existing `onLivingAction` path.
- No Prisma schema changes, database columns, new conversation API routes, or persisted player/resident positions.
- World/build/farm/expand behavior and existing building proximity interactions must remain green.

---

### Task 1: Generalize Explore interaction targets

**Files:**
- Modify: `lib/hex-world/explore-interactions.ts`
- Create: `tests/hex-explore-resident-targets.test.ts`

**Interfaces:**
- Consumes: existing `HEX_EXPLORE_INTERACTION_RADIUS = 1.7`, `HexBuildingDTO`, `getLivingBuildingRole`.
- Produces:
  - `HexResidentId = 'partner-1' | 'partner-2' | 'child' | 'pet'`
  - `HexResidentRole = 'partner' | 'child' | 'pet'`
  - `HexResidentInteractionSample`
  - discriminated `HexExploreInteractionTarget` with `kind: 'building' | 'resident'`
  - `getExploreInteractionTarget(player, buildings, residents)`

- [ ] **Step 1: Write the failing pure tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getExploreInteractionTarget, HEX_EXPLORE_INTERACTION_RADIUS } from '@/lib/hex-world/explore-interactions';

const resident = (residentId: 'partner-1' | 'partner-2' | 'child' | 'pet', role: 'partner' | 'child' | 'pet', x: number, z: number) => ({ residentId, role, x, z });

test('resident and building candidates share exact 1.7 radius and nearest wins', () => {
  assert.equal(HEX_EXPLORE_INTERACTION_RADIUS, 1.7);
  const target = getExploreInteractionTarget(
    { x: 0, z: 0 },
    [{ id: 'home', buildingKey: 'home', anchorQ: 1, anchorR: 0 } as never],
    [resident('partner-1', 'partner', 0.6, 0)],
  );
  assert.equal(target?.kind, 'resident');
  assert.equal(target?.id, 'resident:partner-1');
});

test('stable target id resolves exact-distance ties instead of array order', () => {
  const target = getExploreInteractionTarget(
    { x: 0, z: 0 },
    [],
    [resident('partner-2', 'partner', 1, 0), resident('partner-1', 'partner', -1, 0)],
  );
  assert.equal(target?.id, 'resident:partner-1');
});
```

Add explicit cases for outside-radius resident, height ignored, child/pet sample data accepted, and existing building result shape preserved under `kind: 'building'`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:
```bash
node --import tsx --test tests/hex-explore-resident-targets.test.ts
```
Expected: FAIL because the current resolver accepts only buildings and has no discriminated resident target model.

- [ ] **Step 3: Implement the minimal unified target resolver**

Use this public shape:

```ts
export type HexResidentId = 'partner-1' | 'partner-2' | 'child' | 'pet';
export type HexResidentRole = 'partner' | 'child' | 'pet';

export type HexResidentInteractionSample = {
  residentId: HexResidentId;
  role: HexResidentRole;
  petKind?: 'cat' | 'dog';
  x: number;
  z: number;
};

export type HexExploreInteractionTarget =
  | {
      kind: 'building';
      id: string;
      buildingId: string;
      building: HexBuildingDTO;
      role: SupportedLivingBuildingRole;
      distance: number;
    }
  | {
      kind: 'resident';
      id: string;
      residentId: HexResidentId;
      residentRole: HexResidentRole;
      petKind?: 'cat' | 'dog';
      x: number;
      z: number;
      distance: number;
    };
```

Build one candidate list, reject non-finite/out-of-range distances, sort by distance then `id`, and return the first item. Building ids use `building:${building.id}` and resident ids use `resident:${resident.residentId}`.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the same command; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/explore-interactions.ts tests/hex-explore-resident-targets.test.ts
git commit -m "feat: unify Explore interaction targets"
```

---

### Task 2: Report bounded moving resident samples from the living world

**Files:**
- Modify: `components/hex-world/HexLivingWorldLayer.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Create: `tests/hex-explore-resident-reporting.test.ts`

**Interfaces:**
- Consumes: `HexResidentInteractionSample` from Task 1 and existing `getHomesteadPresencePosition`.
- Produces: `onResidentSamplesChange?: (samples: HexResidentInteractionSample[]) => void` from `HexLivingWorldLayer`, forwarded through `HexWorld3D` only in person mode.

- [ ] **Step 1: Write failing reporting contracts**

Assert source contracts that:
- partners are always eligible samples when living state exists;
- `child` is included only when `state.family.stage === 'child'`;
- `pet` is included only when `state.animals.pet.kind` is `cat` or `dog`;
- cow/sheep are never included;
- `HexWorld3D` passes sample reporting only while `viewMode === 'person'`.

Also add a pure helper test for sample equality/change-gating so sub-frame movement below the reporting epsilon does not force a React state update.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --import tsx --test tests/hex-explore-resident-reporting.test.ts
```
Expected: FAIL because living-world resident positions are currently internal to R3F.

- [ ] **Step 3: Add bounded reporting to presence motion**

Extend `usePresenceMotion` so it can optionally emit its current X/Z sample through a callback. In `HexLivingWorldLayer`, collect only partner/child/pet samples and report at a bounded cadence (target about 10 Hz) with change-gating around small coordinate differences. Do not call React state setters every animation frame.

`HexWorld3D` receives:

```ts
residentSamples?: HexResidentInteractionSample[];
onResidentSamplesChange?: (samples: HexResidentInteractionSample[]) => void;
```

and wires `onResidentSamplesChange` into `HexLivingWorldLayer` only in person mode.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same focused test command; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexLivingWorldLayer.tsx components/hex-world/HexWorld3D.tsx tests/hex-explore-resident-reporting.test.ts
git commit -m "feat: report Explore resident positions"
```

---

### Task 3: Resolve residents and buildings through the player controller

**Files:**
- Modify: `components/hex-world/HexPlayerController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Create: `tests/hex-explore-resident-player-integration.test.ts`

**Interfaces:**
- Consumes: `HexResidentInteractionSample[]` and unified resolver from Task 1.
- Produces: existing `onInteractionTargetChange` callback now receives building or resident targets without a second interaction channel.

- [ ] **Step 1: Write failing integration contracts**

Assert that `HexPlayerController` accepts resident samples, passes buildings + residents into `getExploreInteractionTarget`, and still reports only when target identity changes. Assert that World mode does not mount resident targeting.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --import tsx --test tests/hex-explore-resident-player-integration.test.ts
```
Expected: FAIL because player targeting currently checks buildings only.

- [ ] **Step 3: Implement resident sample plumbing**

Add:

```ts
residentSamples?: HexResidentInteractionSample[];
```

to `HexPlayerController`. During the existing target-resolution point, call:

```ts
getExploreInteractionTarget(positionRef.current, buildings, residentSamples ?? [])
```

Keep identity gating against `target?.id ?? null`; do not publish target changes every frame for the same identity.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexPlayerController.tsx components/hex-world/HexWorld3D.tsx tests/hex-explore-resident-player-integration.test.ts
git commit -m "feat: target moving Explore residents"
```

---

### Task 4: Add deterministic resident dialogue and action availability

**Files:**
- Create: `lib/hex-world/resident-dialogue.ts`
- Create: `tests/hex-resident-dialogue.test.ts`

**Interfaces:**
- Consumes: `HomesteadLifeState`, `HexResidentId`, optional pet kind.
- Produces:

```ts
export type HexResidentDialogue = {
  title: string;
  line: string;
  primaryVerb: 'Talk' | 'Pet';
  canFamilyTime: boolean;
  canPetTime: boolean;
};

export function getResidentDialogue(input: {
  residentId: HexResidentId;
  petKind?: 'cat' | 'dog';
  state: HomesteadLifeState;
}): HexResidentDialogue;
```

- [ ] **Step 1: Write failing deterministic-dialogue tests**

Cover identical input → identical line; weather/season/day/time changes can select different context copy; pet title/verb reflects cat/dog; `canPetTime` is false after `state.animals.pet.interactedDay === state.day`; `canFamilyTime` is false after the authoritative daily family-time flag is spent.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --import tsx --test tests/hex-resident-dialogue.test.ts
```
Expected: FAIL because the dialogue module does not exist.

- [ ] **Step 3: Implement a bounded deterministic copy selector**

Use a small static copy catalog keyed by resident role and context tags (`rainy`, season, morning/evening, low-energy). Select one line using a stable hash derived from `residentId`, `state.day`, `state.season`, `state.weather`, and a coarse time bucket. Return exactly one line and no conversation history.

Action flags only mirror current state eligibility; they do not mutate state or calculate rewards.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hex-world/resident-dialogue.ts tests/hex-resident-dialogue.test.ts
git commit -m "feat: add deterministic resident dialogue"
```

---

### Task 5: Make the Explore prompt target-aware and add the resident conversation card

**Files:**
- Modify: `components/hex-world/HexExploreInteractionPrompt.tsx`
- Create: `components/hex-world/HexResidentConversationCard.tsx`
- Modify: `components/hex-world/HexGameplayOverlay.tsx`
- Create: `tests/hex-resident-conversation-ui.test.ts`

**Interfaces:**
- Consumes: unified `HexExploreInteractionTarget`, `getResidentDialogue`, existing `onLivingAction`.
- Produces: resident prompt verbs and a single compact blocking conversation surface.

- [ ] **Step 1: Write failing UI contracts**

Assert:
- building prompt remains `Interact`;
- partner/child prompt uses `Talk`;
- pet prompt uses `Pet`;
- desktop `KeyE` safety still ignores editable controls and repeats;
- mobile resident button has at least 44px target;
- conversation card renders exactly one dialogue line;
- pet button invokes `{ type: 'pet_time' }` through `onLivingAction`;
- partner/child Family Time invokes `{ type: 'family_time' }` through `onLivingAction`;
- no dialogue-history, LLM, fetch, Prisma, or new API usage exists.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --import tsx --test tests/hex-resident-conversation-ui.test.ts
```
Expected: FAIL because prompt only understands building targets and no resident conversation card exists.

- [ ] **Step 3: Generalize prompt copy**

For resident targets, derive display copy directly from target fields:
- partner → `Talk · Partner`
- child → `Talk · Child`
- pet cat/dog → `Pet · Cat` / `Pet · Dog`

Keep the same keyboard/pointer isolation code already used by building interactions.

- [ ] **Step 4: Implement `HexResidentConversationCard`**

Props:

```ts
{
  target: Extract<HexExploreInteractionTarget, { kind: 'resident' }>;
  state: HomesteadLifeState;
  busy: boolean;
  onAction: (action: HomesteadLifeAction) => Promise<boolean>;
  onClose: () => void;
}
```

Render title, exactly one `dialogue.line`, optional `Family Time`, optional `Pet`, and `Close`. `Escape` closes safely; card pointer events must not leak into the canvas.

- [ ] **Step 5: Wire overlay exclusivity**

Only one blocking surface may be open: inventory, goals, building quick/deep panel, or resident conversation. Opening any other blocking surface closes the resident conversation. While resident conversation is open, touch controls and keyboard movement remain suspended through the existing movement-suspension path.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the same command; expected PASS.

- [ ] **Step 7: Commit**

```bash
git add components/hex-world/HexExploreInteractionPrompt.tsx components/hex-world/HexResidentConversationCard.tsx components/hex-world/HexGameplayOverlay.tsx tests/hex-resident-conversation-ui.test.ts
git commit -m "feat: add resident conversation UI"
```

---

### Task 6: Coordinate resident samples and open-target stability in the build controller

**Files:**
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `components/hex-world/HexGameplayOverlay.tsx`
- Create: `tests/hex-resident-interaction-lifecycle.test.ts`

**Interfaces:**
- Consumes: resident sample reporting, unified target, resident conversation card.
- Produces: one transient resident sample set plus one open interaction identity coordinated with the existing Explore lifecycle.

- [ ] **Step 1: Write failing lifecycle contracts**

Assert:
- controller owns transient resident samples only, never persists them;
- open resident stays bound by id even if moving samples update;
- child/pet open interaction closes if authoritative state makes that resident invalid;
- Land switch, World switch, Build, Farm, Expand, Move, and Reset clear resident interaction state;
- player/camera reset behavior otherwise remains unchanged.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --import tsx --test tests/hex-resident-interaction-lifecycle.test.ts
```
Expected: FAIL because controller currently knows building-only interaction state.

- [ ] **Step 3: Implement transient resident sample ownership**

Add controller state for the latest bounded `HexResidentInteractionSample[]` and pass it to `HexWorld3D`. Keep the current open target id discriminated by target kind; when a resident conversation opens, store that resident identity independently of subsequent proximity updates.

On authoritative living-state changes, validate open resident eligibility:
- `child` requires `living.state?.family.stage === 'child'`;
- `pet` requires `living.state?.animals.pet.kind`.

Clear invalid resident conversations without switching modes.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hex-world/HexBuildController.tsx components/hex-world/HexWorld3D.tsx components/hex-world/HexGameplayOverlay.tsx tests/hex-resident-interaction-lifecycle.test.ts
git commit -m "feat: coordinate Explore resident interactions"
```

---

### Task 7: Full regression, production verification, and PR readiness

**Files:**
- Modify only files justified by failing tests/lint/build diagnostics.
- Update PR body with exact verification evidence.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: mergeable PR with fresh end-to-end CI evidence on the exact final head.

- [ ] **Step 1: Run all focused resident tests together**

```bash
node --import tsx --test \
  tests/hex-explore-resident-targets.test.ts \
  tests/hex-explore-resident-reporting.test.ts \
  tests/hex-explore-resident-player-integration.test.ts \
  tests/hex-resident-dialogue.test.ts \
  tests/hex-resident-conversation-ui.test.ts \
  tests/hex-resident-interaction-lifecycle.test.ts
```
Expected: PASS.

- [ ] **Step 2: Run the repository's complete Hex Homestead CI workflow on the exact branch head**

Required successful gates:
- production dependency audit
- Prisma validate
- migrations on CI Postgres
- security regressions
- full Hex/Garden/startup pure suite
- DB/Redis undo integration
- existing farm regression
- lint
- production build
- production runtime smoke

- [ ] **Step 3: Debug any failure systematically**

For each failure, read the exact diagnostic, identify the root cause, make one minimal justified change, then re-run the full exact head. Do not weaken existing contracts merely to make CI green.

- [ ] **Step 4: Verify scope constraints**

Confirm final diff contains no Prisma migration/schema change, no new conversation API route, no LLM/network dialogue dependency, no persistent resident coordinates, no affection/gifting/quest system, and no cow/sheep direct interaction.

- [ ] **Step 5: Mark the PR ready only after exact-head CI succeeds**

Record the final head SHA and workflow run/job evidence in the PR description. Do not merge until explicitly instructed.
