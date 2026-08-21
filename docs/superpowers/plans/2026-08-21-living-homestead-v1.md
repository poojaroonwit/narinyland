# Living Homestead v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the existing Family Farm life-sim engine into the production floating HexWorld so `/garden` becomes a playable cozy daily homestead without replacing either persistence model.

**Architecture:** Keep HexWorld authoritative for land/buildings and Family Farm authoritative for life-sim state. Add a focused client integration hook, contextual living UI, pure mapping helpers, and bounded presentation-only 3D crop/livestock/weather visuals. No Prisma schema changes.

**Tech Stack:** Next.js 16, React, TypeScript, React Three Fiber, Framer Motion, Prisma/PostgreSQL, Redis, existing Family Farm API and HexWorld APIs.

**Spec:** `docs/superpowers/specs/2026-08-21-living-homestead-v1-design.md`

## Global Constraints

- Do not add a Prisma schema migration.
- Do not duplicate Family Farm rules on the client.
- Do not reintroduce character walking/MMO game modes.
- Keep HexWorld builder and expansion behavior unchanged.
- Farm mutations must use `familyFarmAPI.act()` only.
- Living presentation must be bounded and reduced-motion safe.
- Builder must remain usable when Family Farm loading fails.

---

### Task 1: Pure Living-Homestead Mapping Helpers

**Files:**
- Create: `lib/hex-world/living-homestead.ts`
- Test: `tests/hex-living-homestead.test.ts`

**Interfaces:**
- Consumes: `FamilyFarmState`, `FarmPlot`, `CropKey`, `HexBuildingDTO`.
- Produces: `getLivingBuildingRole(buildingKey)`, `getGardenActionTarget(state, action)`, `getGardenSummary(state)`, `getCropVisualSamples(state, gardenBuildings, maxSamples)`, `getWeatherPresentation(weather)`.

- [ ] Write failing tests proving building-role mapping, garden target selection, authoritative summary counts, bounded deterministic crop samples, and weather presentation.
- [ ] Run the Hex pure suite and confirm only the new tests fail for missing helpers.
- [ ] Implement helpers without persistence or network calls.
- [ ] Re-run the new tests and confirm they pass.

### Task 2: Server-Authoritative Living State Hook

**Files:**
- Create: `components/hex-world/useLivingHomestead.ts`
- Test: `tests/hex-living-homestead-ui.test.ts`

**Interfaces:**
- Consumes: `landId`, `showToast`, `familyFarmAPI.get`, `familyFarmAPI.act`.
- Produces: `{ state, revision, loading, error, busy, act, retry }`.

- [ ] Write source-contract tests requiring existing API usage, Land-switch stale-response protection, non-blocking error state, and no direct state mutation.
- [ ] Run tests and confirm RED.
- [ ] Implement abort/current-Land guards, authoritative response replacement, action busy state, toast forwarding, and retry.
- [ ] Re-run tests and confirm GREEN.

### Task 3: Compact Daily HUD and Goals

**Files:**
- Create: `components/hex-world/HexLivingHUD.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Test: `tests/hex-living-homestead-ui.test.ts`

**Interfaces:**
- Consumes: Family Farm state, HexWorld `snapshot.points`, hook `act`.
- Produces: compact HUD with day/time/weather/energy/coins/hearts/level/Points/goals and claim-reward action.

- [ ] Add failing UI contract tests for required HUD information and goal-claim behavior.
- [ ] Verify RED.
- [ ] Implement HUD using `formatFarmTime`, `getDailyGoals`, `xpToNextLevel`, and `claim_daily_reward`.
- [ ] Mount HUD from `HexBuildController` without changing builder modes.
- [ ] Verify GREEN.

### Task 4: Contextual Living Actions

**Files:**
- Create: `components/hex-world/HexLivingActionPanel.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Test: `tests/hex-living-homestead-ui.test.ts`

**Interfaces:**
- Consumes: selected `HexBuildingDTO`, Family Farm state, hook `act`.
- Produces: authoritative contextual actions for Garden Patch, Pond, Tree, Home, Bench, and Storage.

- [ ] Add failing tests requiring Garden Patch Plant/Water/Harvest, Pond Fish, Tree Forage, Home Cook/Chicken Care/Family Time/Upgrade/Sleep, Bench Family Time, and Storage inventory.
- [ ] Verify RED.
- [ ] Implement Garden Patch smart-target actions using pure helper targets and crop chooser from `CROP_CATALOG`.
- [ ] Implement Home recipe chooser using `RECIPE_CATALOG`/`canCookRecipe`, chicken actions, home upgrade, family time, and end day.
- [ ] Implement Pond, Tree, Bench, and Storage surfaces.
- [ ] Mount panel only during idle selection and position it above existing edit controls.
- [ ] Verify GREEN.

### Task 5: 3D Living Presentation Layer

**Files:**
- Create: `components/hex-world/HexLivingWorldLayer.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`
- Test: `tests/hex-living-homestead-ui.test.ts`

**Interfaces:**
- Consumes: Family Farm state, Hex buildings, tile heights, reduced-motion profile.
- Produces: bounded crop stage meshes around Garden Patches, bounded chicken visuals near Home, and lightweight rainy-day particles.

- [ ] Add failing tests requiring `livingState` presentation input and bounded crop/chicken/rain rendering without persistence APIs.
- [ ] Verify RED.
- [ ] Implement crop sample rendering using `getCropVisualSamples`; vary height/shape by progress and crop key, with watered accent.
- [ ] Implement up to six presentation chickens near Home based on authoritative livestock count.
- [ ] Implement bounded rain particles only for rainy weather; freeze decorative motion for reduced-motion.
- [ ] Pass active living state from `HexBuildController` into `HexWorld3D`.
- [ ] Verify GREEN.

### Task 6: Regression, Build, Review, Merge, Production Validation

**Files:**
- Update PR description with RED/GREEN evidence and scope.

- [ ] Run full Hex Homestead CI: Prisma validate/migrations, all pure Hex tests, PostgreSQL/Redis undo integration, farm regression, lint, production build.
- [ ] Run Family Farm CI if triggered and ensure existing farm engine tests remain green.
- [ ] Review final PR diff for accidental schema/auth/world-mode changes and mobile/reduced-motion regressions.
- [ ] Mark PR ready and merge only the exact verified head SHA.
- [ ] Confirm Railway deployment SUCCESS and verify startup gate reaches `Database ready; starting Narinyland` and Next.js `Ready`.
