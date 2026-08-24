# MMORPG Person-Scale Exploration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a human-scale third-person exploration mode to the existing floating hex homestead while preserving the current world/build mode.

**Architecture:** Keep traversal math in a pure `player-exploration` module, render the local avatar and player camera in dedicated R3F components, and let `HexBuildController` own the local `world | person` view state. `HexWorld3D` switches camera/controller paths without changing backend world state or existing rendering systems.

**Tech Stack:** Next.js 16, React 19, TypeScript, Three.js, @react-three/fiber, @react-three/drei, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-24-mmorpg-person-scale-exploration-design.md`

## Global Constraints

- Keep `HexDioramaCamera` responsible only for overview/focus/build camera behavior.
- Do not add backend schema, physics-engine, networking, jumping, sprint/stamina, combat, mounts, chat, quests, interiors, or avatar customization.
- Player movement must remain on existing unlocked hex tiles.
- Person mode must reuse the current R3F perspective camera and low-poly visual language.
- World mode must remain the default and must be forced whenever placement/move/expansion workflows begin.
- Reduced motion disables decorative player bob.
- Keyboard movement must ignore form/editable focus.

---

### Task 1: Pure player spawn and traversal math

**Files:**
- Create: `lib/hex-world/player-exploration.ts`
- Create: `tests/hex-player-exploration.test.ts`

**Interfaces:**
- Produces: `HexPlayerPosition`, `HexPlayerMoveInput`, `getHexPlayerSpawn`, `getCameraRelativeMoveVector`, `resolveWalkablePlayerPosition`.
- Consumes: `axialToWorld`, `worldToAxial`, `hexKey`, `HexTileDTO`, `HexBuildingDTO`.

- [ ] **Step 1: Write failing spawn tests**

Test home-anchor priority, nearest-unlocked-to-center fallback, first unlocked fallback, and origin fallback with deterministic fixtures.

- [ ] **Step 2: Write failing movement tests**

Test camera-relative forward/right vectors, diagonal normalization, unlocked-tile traversal, and rejection of proposed positions resolving to locked or missing tiles.

- [ ] **Step 3: Implement the pure helpers**

`getHexPlayerSpawn` returns the chosen tile center with `y = tile.height + 0.08`. `getCameraRelativeMoveVector` flattens and normalizes camera forward then combines forward/right input. `resolveWalkablePlayerPosition` maps proposed X/Z through `worldToAxial` and returns the proposed position only when that tile exists and is unlocked; otherwise it returns the current position.

- [ ] **Step 4: Run the targeted tests**

Run: `npm test -- tests/hex-player-exploration.test.ts`
Expected: all player exploration tests pass.

- [ ] **Step 5: Commit**

Commit message: `feat: add player traversal helpers`

---

### Task 2: Person-scale avatar and third-person controller

**Files:**
- Create: `components/hex-world/HexPlayerAvatar.tsx`
- Create: `components/hex-world/HexPlayerController.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Create: `tests/hex-player-controller-contract.test.ts`

**Interfaces:**
- `HexPlayerAvatar` accepts `moving: boolean`, `reducedMotion: boolean`, and a forwarded `THREE.Group` ref used by the controller for position/heading.
- `HexPlayerController` accepts `tiles`, `buildings`, `reducedMotion`, and `resetNonce`.
- `HexWorld3D` accepts `viewMode: 'world' | 'person'` and renders exactly one of `HexDioramaCamera` or `HexPlayerController`.

- [ ] **Step 1: Write source-contract tests**

Assert that `HexWorld3D` imports both camera paths and branches on `viewMode`, that `HexPlayerController` uses close `OrbitControls` distance bounds, and that keyboard listeners include WASD and arrow keys.

- [ ] **Step 2: Implement `HexPlayerAvatar`**

Build an adult low-poly avatar from primitive meshes matching the family-member proportions: capsule torso, sphere head/hair, cylinder legs, visible face/forward direction, shadows, and subtle movement bob disabled for reduced motion.

- [ ] **Step 3: Implement `HexPlayerController`**

On mount/reset, use `getHexPlayerSpawn`. Track pressed movement keys, ignore key events from input/textarea/select/contenteditable targets, derive movement from the camera horizontal forward vector, resolve unlocked-land movement every frame, smooth heading, and update OrbitControls target to about `0.82` units above the player's feet. Configure camera distance approximately `2.5-5`, lower third-person polar angles, damping, orbit, wheel zoom, and touch orbit/zoom.

- [ ] **Step 4: Switch `HexWorld3D` camera paths**

Add a `viewMode` prop defaulting to `world`. Render `HexPlayerController` only in person mode and the unchanged `HexDioramaCamera` only in world mode.

- [ ] **Step 5: Run targeted controller and camera tests**

Run: `npm test -- tests/hex-player-controller-contract.test.ts tests/hex-camera.test.ts`
Expected: all tests pass and existing diorama camera contracts remain unchanged.

- [ ] **Step 6: Commit**

Commit message: `feat: add person-scale player controller`

---

### Task 3: View-mode state and MMORPG-scale gameplay UI

**Files:**
- Modify: `components/hex-world/HexBuildController.tsx`
- Modify: `components/hex-world/HexGameplayOverlay.tsx`
- Modify: `components/hex-world/HexWorldToolbar.tsx`
- Create: `tests/hex-view-mode.test.ts`

**Interfaces:**
- Add shared local type `HexViewMode = 'world' | 'person'` exported from `HexWorldToolbar` or a focused type module.
- `HexGameplayOverlay` receives `viewMode` and `onViewModeChange`.
- `HexWorldToolbar` receives `viewMode` and `onViewModeChange` and displays a compact World/Explore switch.

- [ ] **Step 1: Write view-mode source-contract tests**

Assert default `world`, `HexWorld3D viewMode={viewMode}`, explicit transition to `world` in build and expand entry points, person-mode selection guard, and World/Explore labels in the toolbar.

- [ ] **Step 2: Add view state to `HexBuildController`**

Initialize `viewMode` as `world`; reset it on land change. Entering person mode is allowed only while build state is idle and closes catalog/remove/expansion selection. Starting build or expansion forces `world`; moving an existing building also forces `world`. Pass view mode into `HexWorld3D` and `HexGameplayOverlay`. In person mode, ignore building selection callbacks.

- [ ] **Step 3: Add mode-aware overlay behavior**

Changing view mode closes inventory/details/HUD panels and clears current building selection before delegating to the controller. Keep the lightweight living HUD present in both modes.

- [ ] **Step 4: Refine the bottom toolbar for person scale**

Add a compact segmented World/Explore control. In world mode retain Farm, Build, Bag, Goals, Grow Land and Reset View. In person mode hide Farm/Build/Grow Land, retain Bag/Goals/Reset, and show a small desktop movement hint (`WASD / arrows · drag to look`) without claiming mobile movement support.

- [ ] **Step 5: Run view-mode tests**

Run: `npm test -- tests/hex-view-mode.test.ts`
Expected: view state and UI source contracts pass.

- [ ] **Step 6: Commit**

Commit message: `feat: add world and explore view modes`

---

### Task 4: Regression and production verification

**Files:**
- Modify only if verification exposes a concrete defect in files touched by Tasks 1-3.

**Interfaces:**
- No new public interfaces.

- [ ] **Step 1: Run player-focused tests**

Run: `npm test -- tests/hex-player-exploration.test.ts tests/hex-player-controller-contract.test.ts tests/hex-view-mode.test.ts tests/hex-camera.test.ts`
Expected: all pass.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`
Expected: all repository tests pass.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no lint errors introduced by this feature.

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: Next.js production build succeeds.

- [ ] **Step 5: Review the final diff for scope**

Confirm no backend schema, multiplayer, physics, jumping, sprint, or unrelated refactor was added; world-mode rendering/camera behavior remains intact; player mode is client-only state.

- [ ] **Step 6: Commit any verification fixes**

If needed, use commit message: `fix: harden person-scale exploration`.
