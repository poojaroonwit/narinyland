# Living Homestead Progression v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four-season progression, level/crop unlocks, meaningful Workshop/Storage/Flower Patch utility, Homestead Journey milestones, and seasonal world payoff to the existing Living Homestead game.

**Architecture:** Extend the existing Family Farm JSON state from schema v3 to v4; all new mutations continue through the current authoritative `/api/family-farm` transaction path. HexWorld remains unchanged as the authority for land/buildings; UI and 3D seasonal presentation derive from the normalized Family Farm state.

**Tech Stack:** Next.js 16, React, TypeScript, React Three Fiber, Node test runner, Prisma-backed existing Family Farm save path.

**Spec:** `docs/superpowers/specs/2026-08-21-living-homestead-progression-v2-design.md`

## Global Constraints
- No Prisma schema migration.
- No new gameplay API route.
- No second save model or new currency.
- No MMO/character-walking reintroduction.
- Keep HexWorld build/move/rotate/remove/undo/expand flows unchanged.
- Keep new 3D effects visual-only, bounded, and reduced-motion safe.

---

### Task 1: Family Farm v4 progression model

**Files:**
- Modify: `lib/family-farm-game.ts`
- Modify: `tests/family-farm-game.test.ts`

**Interfaces:**
- Produces `FarmSeason`, expanded `CropKey`, `WorkshopUpgradeKey`, `HomesteadJourneyEntry`, `seasonForDay`, `getNextLevelUnlock`, `getHomesteadJourney`, `craft` and `tend_flowers` Farm actions.
- Existing callers continue using `performFarmAction`, `normalizeFamilyFarmState`, `getDailyGoals`, `xpToNextLevel`, and existing Farm actions.

- [ ] Write failing tests for season mapping, season-aware weather, v3→v4 migration, crop gates/bonus yield, crafting, Market Crate sale bonus, Flower Patch action, Journey one-time rewards, and season transition summary.
- [ ] Run `node --import tsx --test tests/family-farm-game.test.ts` and confirm only the new progression tests fail.
- [ ] Implement schema v4 types/catalog fields/actions/normalization with server-authoritative validation.
- [ ] Re-run `node --import tsx --test tests/family-farm-game.test.ts` and confirm all Family Farm tests pass.
- [ ] Commit model + tests.

### Task 2: Progression bridge helpers

**Files:**
- Modify: `lib/hex-world/living-homestead.ts`
- Modify: `tests/hex-living-homestead.test.ts`

**Interfaces:**
- Extend `LivingBuildingRole` with `workshop` and `flowers`.
- Add small presentation helpers for season metadata and crop availability; no API access.

- [ ] Write failing tests for Workshop/Flower Patch role mapping, season metadata, and crop availability copy.
- [ ] Run `node --import tsx --test tests/hex-living-homestead.test.ts` and confirm RED.
- [ ] Implement the pure helpers.
- [ ] Re-run the test and confirm GREEN.
- [ ] Commit helpers + tests.

### Task 3: Contextual progression actions

**Files:**
- Modify: `components/hex-world/HexLivingActionPanel.tsx`
- Modify: `tests/hex-living-homestead-ui.test.ts`

**Interfaces:**
- Consumes v4 `FarmAction`, `CROP_CATALOG`, Workshop recipes/upgrades, crop availability helpers.
- Storage calls existing `buy_seed`, `sell`, `sell_resource` actions.
- Workshop calls `{ type: 'craft', upgradeKey }`.
- Flower Patch calls `{ type: 'tend_flowers' }`.

- [ ] Add failing UI-contract assertions for Workshop crafting, Storage market actions, Flower Patch interaction, and crop lock/season availability messaging.
- [ ] Run Living Homestead UI test and confirm RED.
- [ ] Implement compact contextual panels while preserving current Home/Garden/Pond/Tree/Bench actions.
- [ ] Re-run UI-contract test and confirm GREEN.
- [ ] Commit action panel changes.

### Task 4: HUD progression and season payoff

**Files:**
- Modify: `components/hex-world/HexLivingHUD.tsx`
- Modify: `tests/hex-living-homestead-ui.test.ts`

**Interfaces:**
- Consumes `getNextLevelUnlock`, `getHomesteadJourney`, and season metadata from Family Farm/bridge helpers.
- No mutation except existing daily reward action.

- [ ] Add failing assertions for season/day display, next unlock, Journey progress, and dismissible season-complete summary.
- [ ] Confirm RED.
- [ ] Implement the compact HUD additions without making the overlay full-screen.
- [ ] Confirm GREEN.
- [ ] Commit HUD changes.

### Task 5: Seasonal 3D presentation

**Files:**
- Modify: `components/hex-world/HexLivingWorldLayer.tsx`
- Modify: `tests/hex-living-homestead-ui.test.ts`

**Interfaces:**
- Consumes normalized `FamilyFarmState.season` and expanded crop keys.
- Must not import `familyFarmAPI`, `hexWorldAPI`, or call `fetch`.

- [ ] Add failing assertions for Spring/Summer/Autumn/Winter presentation branches, new crop palettes, bounded particle counts, and reduced-motion handling.
- [ ] Confirm RED.
- [ ] Implement low-cost seasonal particles and crop palettes.
- [ ] Confirm GREEN.
- [ ] Commit 3D presentation changes.

### Task 6: Full verification and production rollout

**Files:**
- Update PR description only; no production code unless a regression is found.

- [ ] Run the full Hex Homestead CI on the exact final branch head.
- [ ] Require all pure Hex/Living tests, PostgreSQL+Redis undo tests, Family Farm regression, lint, and production build to pass.
- [ ] Review the final diff for schema/auth/API/HexWorld-persistence scope creep.
- [ ] Mark PR ready and merge using `expected_head_sha`.
- [ ] Verify Railway deployment status and runtime startup logs, including the existing Postgres cold-wake retry behavior.
