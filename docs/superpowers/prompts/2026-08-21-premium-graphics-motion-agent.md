# Agent Execution Prompt — Narinyland Premium Graphics & Motion

Copy the prompt below into an implementation agent working on `poojaroonwit/narinyland`.

---

You are implementing the approved **Narinyland Premium Graphics & Motion** pass for the `/garden` floating HexWorld.

## Required source of truth

Before changing code, read both files completely:

1. `docs/superpowers/specs/2026-08-21-premium-graphics-motion-design.md`
2. `docs/superpowers/plans/2026-08-21-premium-graphics-motion.md`

The spec defines product/design behavior. The plan defines implementation order, exact interfaces, TDD boundaries, tests, commands, and release gates. If they appear to conflict, stop implementation and report the conflict instead of choosing a new design yourself.

## Required development workflow

Use the installed Superpowers workflow:

- Use `superpowers:using-git-worktrees` if you need an isolated workspace.
- Use `superpowers:subagent-driven-development` when fresh task workers are available; otherwise use `superpowers:executing-plans`.
- Use `superpowers:test-driven-development` for every behavior change.
- Use `superpowers:systematic-debugging` for any unexpected failure.
- Use `superpowers:verification-before-completion` before any success/completion claim.
- Use `superpowers:requesting-code-review` before marking the PR ready.

Implement the plan **task-by-task in order**. Do not batch untested production code across tasks.

For every task:

1. Read that task and its exact interfaces.
2. Write the specified failing test first.
3. Run the exact narrow RED command and confirm the failure is caused by the missing behavior, not a typo/test harness problem.
4. Implement the minimum code required for GREEN.
5. Run the narrow GREEN command.
6. Run directly affected existing regressions.
7. Review the diff for scope creep/performance regressions.
8. Commit with the plan's commit intent.
9. Continue only when the task is independently green.

Do not write production code before the RED test for that behavior exists and has failed correctly.

## Branch

Create the implementation branch from current `main` after the approved spec/plan are present:

```text
feat/premium-graphics-motion
```

Do not implement on the documentation branch.

## Product goal

Make the existing floating HexWorld feel like a premium, alive **Magical Floating Garden × Premium Miniature Diorama** through:

- richer but restrained terrain/material depth;
- tactile hover/selection feedback;
- smooth confirmed building placement/selection/rotation/move motion;
- bounded placement dust/sparkle feedback;
- asynchronous vegetation/cloud/water motion;
- stable premium camera motion;
- improved lighting/material cohesion;
- deterministic expansion stagger/mist;
- reduced-motion support;
- High/Medium/Mobile performance envelopes.

This is a presentation-layer polish pass, not a gameplay rewrite.

## Non-negotiable constraints

Do not violate any of these:

### Existing interaction and authority

- Keep **Build → choose component → hover ghost → click/tap valid hex = Place immediately**.
- Do not restore a second `Place` confirmation button.
- Invalid Build click must send **no API mutation**.
- Rapid click/double-click guard must remain.
- Move must keep explicit `Move here` confirmation.
- Place/Move/Rotate/Expand visual celebration starts only after the authoritative server response succeeds.
- Existing Redis-backed one-step Undo remains unchanged semantically.
- Expansion remains non-undoable.
- Existing Land-switch stale request/snapshot guards remain intact.
- Clear transient visual events on Land switch.

### No backend/data scope creep

Do not:

- change Prisma schema;
- add a migration;
- redesign Hex APIs;
- change Points/expansion charging;
- change Undo token semantics;
- regenerate persisted starter worlds;
- add gameplay state for visual decoration.

If a graphics requirement seems to require persistence/API changes, stop and report it as an architectural conflict.

### Camera

- Preserve Overview / Focus / Build intent architecture.
- Build camera must **not chase hover anchors**.
- No auto orbit.
- No camera shake for invalid placement or normal building actions.
- User orbit must interrupt scripted camera motion.
- Opening settle is interruptible and never blocks interaction.

### Rendering/performance

- Preserve instancing for terrain and repeated ambient decor.
- Do not convert every tile/tree/flower into individual React mesh components.
- Keep one primary directional shadow owner.
- No per-building point lights.
- No mandatory `EffectComposer`, Bloom, DOF, SSAO, SSR, `MeshReflectorMaterial`, planar reflection, volumetric cloud shader, or remote mandatory GLB model.
- High `maxDpr` must remain at or below `1.75`.
- Mobile DPR remains approximately `1.0`.
- Use one shared ambient particle points batch.
- Placement particles use one bounded points draw call/pool, not one React component per particle.
- Prefer deterministic phase buckets for vegetation and water instead of arbitrary per-instance matrix rewrites every frame.
- Do not update React state every frame.
- Do not add a new animation package.

### Reduced motion

Resolve `prefers-reduced-motion: reduce` once at the HexWorld scene boundary and pass the resolved motion profile to children.

Reduced motion must remove/reduce:

- cinematic opening travel;
- building drop/overshoot;
- ghost bob;
- decorative vegetation sway;
- cloud drift;
- expansion travel/stagger intensity.

It must retain:

- valid/invalid color feedback;
- selection clarity;
- quick correct camera framing;
- success/error UI;
- all interaction semantics.

Do not scatter independent `matchMedia()` subscriptions across scene components.

## Required architecture

Keep current module boundaries. Extend these rather than collapsing them into `HexWorld3D`:

```text
lib/hex-world/motion.ts
lib/hex-world/visual-events.ts
components/hex-world/useReducedHexMotion.ts
components/hex-world/HexDioramaCamera.tsx
components/hex-world/HexTileInstances.tsx
components/hex-world/HexSelectionEffects.tsx
components/hex-world/HexBuildings.tsx
components/hex-world/HexPlacementEffects.tsx
components/hex-world/HexAmbientDecor.tsx
components/hex-world/HexSkyAtmosphere.tsx
components/hex-world/HexWorldLighting.tsx
components/hex-world/HexWaterSurface.tsx
components/hex-world/HexExpansionClusters.tsx
components/hex-world/HexWorld3D.tsx
components/hex-world/HexBuildController.tsx
```

`HexBuildController` owns semantic action outcomes only. It must not become a frame/timeline animation engine.

Three scene components own frame interpolation through refs/`useFrame`.

## Required semantic visual event contract

Implement the plan's shared type in `lib/hex-world/visual-events.ts`:

```ts
export type HexConfirmedVisualEvent =
  | { kind: 'placed'; buildingId: string; coord: HexCoord; nonce: number }
  | { kind: 'moved'; buildingId: string; coord: HexCoord; nonce: number }
  | { kind: 'rotated'; buildingId: string; nonce: number }
  | { kind: 'expanded'; coords: HexCoord[]; nonce: number }
  | null;
```

Events are produced only after server success.

For Place, derive the newly created id from pre/post snapshot id difference. Do not modify the Place API merely to return an animation id.

## Art/motion targets

Treat these as acceptance targets, not permission to add expensive rendering:

### Terrain

- deterministic subtle grass/soil/stone color variation;
- normal seams remain visually minimized;
- hover vertical lift around `0.04–0.07` world units;
- valid footprint soft emerald emphasis;
- invalid footprint muted coral pulse;
- no global camera reaction.

### Buildings

- selection smooth lift/scale around `180–220ms` perceptually;
- confirmed Place begins about `0.5–0.8` world units above target and settles roughly `320–480ms` normal motion;
- Move uses smaller settle after `Move here` success;
- rotation is smooth ~60° over about `200–260ms`;
- structural Home/Workshop/Storage remain grounded: no perpetual idle bob.

### Ghost

- clear transparent preview;
- subtle vertical bob only in normal motion;
- no bob in reduced motion;
- invalid preview muted coral;
- remains responsive to click-to-place.

### Vegetation

- deterministic non-lockstep motion;
- canopy more visible than trunk;
- flowers/sprouts lower amplitude;
- rocks and paths static;
- High/Medium/Mobile bucket counts follow the implementation plan.

### Sky/lighting

- separate cloud layer drift rates/parallax;
- no cloud shadows;
- warm key + cooler fill relationship;
- one directional shadow owner;
- model materials improve mostly through color/value/roughness, not new shaders.

### Water

- translucent soft turquoise;
- asynchronous deterministic buckets;
- no planar reflection;
- High/Medium/Mobile glint count follows quality profile (`3/1/0`).

### Expansion

- start only after server success;
- amber preview disappears;
- bounded mist/dust;
- deterministic tile stagger roughly within `0–180ms`;
- existing bounds-aware camera reframe only when needed.

## Test preservation

Do not weaken or delete existing behavior assertions. In particular preserve:

- `tests/hex-builder-ui-contract.test.ts` click-to-place contract;
- `tests/hex-phase2-acceptance.test.ts` world-first builder and non-game-mode behavior;
- `tests/hex-render-budget.test.ts` no mandatory heavy post-processing / instancing / bounded DPR;
- `tests/hex-world-undo-db.test.ts` Redis-backed authoritative Undo;
- `tests/family-farm-game.test.ts` legacy farm preservation;
- `tests/production-startup.test.ts` no destructive startup cleanup.

Add and maintain:

```text
tests/hex-motion.test.ts
tests/hex-premium-motion-contract.test.ts
```

If a source-level contract becomes too brittle because of a legitimate refactor, replace it with an equally strong behavior/pure-unit assertion in the same RED→GREEN cycle; do not simply remove coverage.

## Mandatory final verification

Before claiming completion, run fresh:

```bash
PURE_HEX_TESTS=$(find tests -maxdepth 1 -name 'hex-*.test.ts' ! -name 'hex-world-undo-db.test.ts' -print | sort | tr '\n' ' ')
node --import tsx --test $PURE_HEX_TESTS tests/garden-hex-integration.test.ts tests/production-startup.test.ts
```

Then, against local Postgres + Redis 7 matching CI:

```bash
REDIS_URL=redis://127.0.0.1:6379 node --import tsx --test tests/hex-world-undo-db.test.ts
```

Then:

```bash
node --import tsx --test tests/family-farm-game.test.ts
npm run lint
npm run build
```

All must exit successfully.

Also verify GitHub **Hex Homestead CI** on the exact PR head, including:

```text
Prisma validate
Prisma migration deploy against Postgres 16
pure Hex tests
Redis 7 Undo integration
Family Farm regression
lint
production build
```

## Manual acceptance before PR readiness

Validate Desktop High, reduced motion, and Mobile as specified in Task 12 of the plan.

Especially confirm:

```text
Build hover does not move the camera
valid click places without second confirmation
invalid click sends no mutation
confirmed placement animates only after response
Undo still works
Move still requires Move here
Land switch clears transient effects
mobile pinch/orbit does not accidentally place
```

If a gesture conflict is found, reproduce it with a failing test before fixing it.

## PR expectations

Open one implementation PR from `feat/premium-graphics-motion` to `main`.

The PR body must explicitly state:

```text
No DB/API schema changes
Click-to-place preserved
Server-confirmed motion only
Reduced-motion supported
High/Medium/Mobile budgets preserved
No mandatory heavy post-processing
Pure Hex tests PASS
Redis Undo integration PASS
Family Farm regression PASS
Lint PASS
Production build PASS
```

Before marking ready:

- review the full diff;
- verify no architecture-violation tokens from the plan were introduced;
- run the verification-before-completion workflow;
- request code review.

## Merge and deploy boundary

Do **not** merge or deploy merely because tests are green.

If the invoking user explicitly authorizes end-to-end integration, squash-merge only the exact verified PR head SHA, then verify Railway deployment of that merged `main` commit, `/api/health`, startup migration output, Redis availability, and absence of destructive cleanup.

If merge/deploy authorization is not explicit, stop at a ready PR and report the exact verified head plus all verification evidence.

## Handling unexpected complexity

If you discover a requirement that needs any of the following, stop and report it instead of silently expanding scope:

```text
Prisma/data migration
Hex API response redesign
new persisted visual state
new gameplay system
heavy post-processing dependency
replacement of the instanced terrain architecture
new camera/game mode
character/player controller
server changes solely for animation
```

A partial correctly scoped implementation with a clear blocker report is preferable to an unapproved architectural rewrite.

## Completion report format

When finished, report:

1. PR number and exact head SHA.
2. Tasks completed from the 12-task plan.
3. RED→GREEN evidence for new motion contracts.
4. Pure Hex test result count.
5. Redis Undo integration result.
6. Family Farm regression result.
7. Lint result.
8. Production build result.
9. Desktop/reduced-motion/mobile acceptance results.
10. Any known limitations or skipped items.
11. Whether merge/deploy occurred; if yes, exact merged `main` SHA and Railway deployment status.

Do not state "complete", "fixed", "ready", or "production" without fresh evidence supporting that exact claim.
