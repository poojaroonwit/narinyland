# Gameplay UI Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify Narinyland `/garden` into a world-first cozy-game interface while preserving all existing HexWorld and living-homestead mechanics.

**Architecture:** Keep `HexBuildController` as the gameplay orchestrator, but move persistent presentation into smaller focused components. Replace the wide always-on HUD and three-button utility toolbar with compact status, gameplay navigation, wallet/goals sheets, and contextual building actions. Reuse existing actions/state/API calls; no engine or persistence changes.

**Tech Stack:** Next.js 16.3.x, React 19, TypeScript, Tailwind CSS, React Three Fiber/Three.js, Node `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-08-24-gameplay-ui-simplification-design.md`

## Global Constraints

- Preserve HexWorld persistence, placement rules, living-homestead engine, currencies, expansion tiers/costs, undo, camera, and server authority.
- Persistent HUD shows only Day/Weather, Energy, Coins, and Level/XP; wallet/goals/music move behind compact controls.
- Default bottom bar is Farm / Build / Bag / Goals with Reset View as a utility icon.
- Contextual actions remain touch-first with >=44px targets and safe-area-aware fixed positioning.
- No overlapping fixed sheets on mobile; opening one primary sheet closes the others.
- Build catalog keeps existing catalog keys/rules but adds purpose copy and stronger visual hierarchy.
- Expansion keeps existing mechanics but uses named tier presentation and clearer growth language.
- No auth, billing, API schema, database, or gameplay-economy changes.

---

### Task 1: Lock gameplay UI contracts

**Files:**
- Create: `tests/gameplay-ui-simplification.test.ts`

**Interfaces:** Source-contract regression test for HUD, toolbar, contextual actions, catalog, and expansion copy.

- [ ] Write assertions requiring compact HUD labels, Farm/Build/Bag/Goals controls, hidden Reset View utility, contextual `More`, build purpose copy, and named expansion tiers.
- [ ] Run the focused test and verify RED against current UI.
- [ ] Commit the failing contract test.

### Task 2: Simplify HUD and add wallet/goals surfaces

**Files:**
- Modify: `components/hex-world/HexLivingHUD.tsx`

**Interfaces:** Keep existing props. Add internal compact-panel state: `wallet | goals | journey | null`.

- [ ] Reduce persistent chips to Day/season/weather, Energy, Coins, Level/XP.
- [ ] Add compact Wallet and Goals icon buttons; Wallet reveals Hearts/Points, Goals reveals daily goals; Journey nests under progress details.
- [ ] Keep events/season summaries but constrain them to a small dismissible card below HUD.
- [ ] Keep music as icon-only utility.
- [ ] Run focused contract tests.

### Task 3: Replace utility toolbar with gameplay navigation and Bag

**Files:**
- Modify: `components/hex-world/HexWorldToolbar.tsx`
- Create: `components/hex-world/HexInventorySheet.tsx`
- Modify: `components/hex-world/HexBuildController.tsx`

**Interfaces:**
- `HexWorldToolbar({ onFarm, onBuild, onBag, onGoals, onResetView, activeAction })`
- `HexInventorySheet({ open, state, onClose })`

- [ ] Add Farm / Build / Bag / Goals primary actions and icon-only Reset View.
- [ ] Implement compact inventory sheet from existing `HomesteadLifeState.inventory` data.
- [ ] In controller, make primary sheets mutually exclusive and add Farm behavior that selects/focuses an existing `garden_patch` and exposes its contextual actions; if none exists, open Build catalog with Garden Patch selected.
- [ ] Run focused tests.

### Task 4: Make building actions contextual and progressive

**Files:**
- Modify: `components/hex-world/HexLivingActionPanel.tsx`

**Interfaces:** Preserve current props/actions. Add internal `detailsOpen` state and keep `mode` for plant/crafting subflows.

- [ ] Render 2–4 highest-frequency actions first per role.
- [ ] Move upgrades, permanent tools, animal acquisition details, recipe/crafting catalogs, and storage detail behind `More`/`Details` expansion.
- [ ] Keep Garden root as Plant / Water / Harvest.
- [ ] Reduce sheet height/default visual density and ensure selection changes reset details.
- [ ] Run focused tests.

### Task 5: Improve build and expansion presentation

**Files:**
- Modify: `components/hex-world/HexBuildCatalog.tsx`
- Modify: `components/hex-world/HexExpansionController.tsx`

**Interfaces:** Keep existing props and behavior.

- [ ] Add one-line purpose copy for each building and stronger selected/available state hierarchy.
- [ ] Rename expansion choices to `Small Grove`, `Garden Wing`, `Homestead Field` while preserving tier 1/2/3 and 7/19/37-hex server definitions.
- [ ] Replace configuration-heavy instructions with concise growth/placement copy.
- [ ] Run focused tests.

### Task 6: Verify full gameplay surface

**Files:**
- Modify if required: existing UI regression tests only.

- [ ] Run `node --import tsx --test tests/gameplay-ui-simplification.test.ts tests/hex-builder-ui-contract.test.ts tests/hex-living-homestead-ui.test.ts tests/hex-phase2-acceptance.test.ts tests/garden-hex-integration.test.ts`.
- [ ] Run `npm run build`.
- [ ] Open PR, review diff for no backend/persistence changes, and merge only with green CI.
