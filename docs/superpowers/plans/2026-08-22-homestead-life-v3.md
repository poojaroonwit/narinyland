# Homestead Life v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Living Homestead into a visibly inhabited family home with two partners, a later child, chickens/cow/sheep/pet, deterministic daily and seasonal events, three-tier Home/Barn/Workshop/Storage progression, and compact crafting while preserving free purchased-land relocation and persistent music mute.

**Architecture:** Family Farm remains the single authoritative save/API for homestead-life progression and moves from JSON schema v4 to v5. New family, animal, event, building-progression, and crafting logic is isolated into pure domain modules and orchestrated by `lib/family-farm-progression.ts`; Hex World remains authoritative for spatial land/building placement. Family/animal/event/tier visuals are projections of Family Farm state onto existing Hex World buildings and never become independent persisted spatial entities.

**Tech Stack:** Next.js 16, React 19, TypeScript, React Three Fiber/Three.js, Node `node:test` + `tsx`, Prisma 6/PostgreSQL through the existing Family Farm save transaction, Redis-backed existing Hex integration CI.

**Spec:** `docs/superpowers/specs/2026-08-22-homestead-life-v3-design.md`

## Global Constraints

- Keep the existing save key `family-farm-state-v1`; no duplicate gameplay save and no expected Prisma migration.
- Hearts remain the only relationship currency.
- Existing chicken state stays in `state.livestock`; do not create a second chicken truth in v5 `animals`.
- Cow/sheep/pet live in a new v5 `animals` block.
- Barn is a real Hex World building with normal placement/move/rotate/remove authority; Barn tier is Family Farm state.
- No WASD, player avatar controller, MMO/shared-world simulation, navmesh, or pathfinding service.
- Existing free land placement sizes 7/19/37 and purchased `Move Land` behavior are release-blocking regressions.
- Existing `narinyland:music-muted` Web Audio behavior is a release-blocking regression.
- New 3D state is visual-only, bounded, and reduced-motion safe.
- Keep UI contextual and world-first; no new full-screen management dashboard.
- Every mutating gameplay action must be server-authoritative through the existing `/api/family-farm` path.

---

## File Map

### New domain files

- `lib/family-life.ts` — family state normalization, Growing Together eligibility, child unlock rules.
- `lib/building-progression.ts` — Home/Barn/Workshop/Storage tier state, costs, gates, normalization.
- `lib/homestead-animals.ts` — cow/sheep/pet state, daily reset/production helpers, validation constants.
- `lib/homestead-events.ts` — deterministic daily/seasonal event catalog, selection, occurrence identity, resolution helpers.
- `lib/homestead-crafting.ts` — compact v3 craft catalog, recipe tiers, resource costs, persistent crafted state.
- `tests/homestead-life-v3.test.ts` — focused pure domain tests for v3.

### Existing files to modify

- `lib/family-farm-progression.ts` — v4→v5 adapter, progression resource extension, action union/orchestration, end-day ordering.
- `app/api/family-farm/route.ts` — parse/validate new v3 actions.
- `lib/family-farm-store.ts` — no new persistence model; update type/version expectations only if required.
- `services/living-family-farm-api.ts` — should stay structurally unchanged; types widen through `ProgressionFarmAction`/state.
- `lib/hex-world/building-catalog.ts` — add unique Barn building.
- `lib/hex-world/living-homestead.ts` — add Barn role and pure family/animal/event visual projection helpers.
- `components/hex-world/HexBuildCatalog.tsx` — add Barn icon through existing catalog rendering.
- `components/hex-world/HexLivingActionPanel.tsx` — Barn care, upgrades, pet selection, event resolution, v3 crafting.
- `components/hex-world/HexLivingHUD.tsx` — small current-event/family status presentation; preserve Music control.
- `components/hex-world/HexBuildingModels.tsx` — dispatch Barn and tier prop.
- `components/hex-world/models/HexStructureModels.tsx` — Barn primitive model + tier variants for Home/Barn/Workshop/Storage.
- `components/hex-world/HexBuildings.tsx` — project Family Farm building tiers into building model rendering.
- `components/hex-world/HexWorld3D.tsx` — pass living-state tiers into `HexBuildings`; keep geometry authority unchanged.
- `components/hex-world/HexLivingWorldLayer.tsx` — family, child, cow, sheep, pet, event props, bounded movement.
- `.github/workflows/family-farm-ci.yml` — include v3 domain/progression tests in farm CI.

### Existing tests to update/extend

- `tests/family-farm-progression.test.ts` — migration/version + action orchestration.
- `tests/hex-family-farm-progression-integration.test.ts` — v5 store/API contract.
- `tests/hex-building-catalog.test.ts` — Barn catalog identity.
- `tests/hex-building-art.test.ts` — Barn authored locally and tier prop coverage.
- `tests/hex-living-homestead.test.ts` — Barn role + deterministic visual projections/fallback anchors.
- `tests/hex-living-homestead-ui.test.ts` — world-first v3 action/UI/3D contract.
- `tests/hex-land-placement-audio.test.ts` — do not weaken; rerun unchanged as the land/music release gate.
- `tests/hex-world-undo-db.test.ts` and existing Hex integration suite — rerun to prove Hex authority remains intact.

---

### Task 1: Add pure family-life and v5 state compatibility

**Files:**
- Create: `lib/family-life.ts`
- Create: `tests/homestead-life-v3.test.ts`
- Modify: `lib/family-farm-progression.ts`
- Modify: `tests/family-farm-progression.test.ts`
- Modify: `tests/hex-family-farm-progression-integration.test.ts`

**Interfaces:**

```ts
export type FamilyLifeState = {
  stage: 'partners' | 'child';
  milestones: { growingTogether: boolean };
};

export function createInitialFamilyLifeState(): FamilyLifeState;
export function normalizeFamilyLifeState(raw: unknown): FamilyLifeState;
export function canCompleteGrowingTogether(input: { hearts: number; homeTier: number; family: FamilyLifeState }): boolean;
export function canWelcomeChild(input: { hearts: number; homeTier: number; family: FamilyLifeState }): boolean;
```

`ProgressionFamilyFarmState` becomes schema 5 and adds `family`, `animals`, `buildingTiers`, `events`, and `homesteadCrafting` while preserving all v4 crop/workshop/journey fields.

- [ ] Add RED tests proving a v4 fixture normalizes to schema 5 without losing crops, inventory, Workshop upgrades, Journey progress, Hearts, day, or Home level.
- [ ] Add RED tests for default two-partner family state and exact Growing Together/child gates: Home Tier 2+, 75 Hearts+, milestone once only.
- [ ] Run `node --import tsx --test tests/homestead-life-v3.test.ts tests/family-farm-progression.test.ts` and record the intended failures.
- [ ] Implement `family-life.ts` and schema-5 normalization scaffolding in `family-farm-progression.ts` with safe deterministic defaults.
- [ ] Keep `homeLevel` compatibility: normalize it into `buildingTiers.home`, then keep `homeLevel` synchronized as a legacy projection during v3 so old UI/recipes do not silently break.
- [ ] Re-run the focused tests and require GREEN before moving on.
- [ ] Commit: `feat: add Homestead Life v5 family state`.

### Task 2: Add three-tier building progression and Barn spatial identity

**Files:**
- Create: `lib/building-progression.ts`
- Modify: `lib/family-farm-progression.ts`
- Modify: `lib/hex-world/building-catalog.ts`
- Modify: `components/hex-world/HexBuildCatalog.tsx`
- Modify: `tests/homestead-life-v3.test.ts`
- Modify: `tests/hex-building-catalog.test.ts`

**Interfaces:**

```ts
export type BuildingTier = 1 | 2 | 3;
export type ProgressionBuildingKey = 'home' | 'barn' | 'workshop' | 'storage';
export type BuildingProgressionState = Record<ProgressionBuildingKey, BuildingTier>;

export function createInitialBuildingProgression(homeLevel?: number): BuildingProgressionState;
export function normalizeBuildingProgression(raw: unknown, homeLevel?: number): BuildingProgressionState;
export function getBuildingUpgradeCost(key: ProgressionBuildingKey, tier: BuildingTier): number;
export function canUpgradeBuilding(key: ProgressionBuildingKey, tier: BuildingTier): boolean;
```

New action:

```ts
{ type: 'upgrade_building'; buildingKey: ProgressionBuildingKey }
```

Compatibility action `{ type: 'upgrade_home' }` routes through the same Home tier transition.

Barn Hex catalog definition is unique, removable, non-duplicate, grassy, rotatable, and three hexes:

```ts
footprint: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }]
```

- [ ] Add RED tests for tier defaults/clamping, coin deductions, max Tier 3 rejection, Home compatibility synchronization, and Barn presence in `BUILDING_CATALOG`.
- [ ] Run focused domain + catalog tests and confirm RED.
- [ ] Implement building progression and Barn catalog entry; add Barn icon to build catalog.
- [ ] Re-run focused tests and require GREEN.
- [ ] Re-run `tests/hex-land-placement-audio.test.ts` immediately to prove adding Barn did not alter expansion authority.
- [ ] Commit: `feat: add Barn and building tiers`.

### Task 3: Add cow, sheep, pet, milk and wool

**Files:**
- Create: `lib/homestead-animals.ts`
- Modify: `lib/family-farm-progression.ts`
- Modify: `tests/homestead-life-v3.test.ts`
- Modify: `tests/family-farm-progression.test.ts`

**Interfaces:**

```ts
export type PetKind = 'cat' | 'dog';
export type HomesteadAnimalsState = {
  cow: { owned: boolean; fedDay: number | null; milkReady: boolean; milkCollectedDay: number | null };
  sheep: { owned: boolean; caredDay: number | null; caredProgress: number; woolReady: boolean };
  pet: { kind: PetKind | null; interactedDay: number | null };
};
```

Progression resources extend the base list without modifying legacy 2D Family Farm types:

```ts
export const PROGRESSION_RESOURCE_KEYS = [...RESOURCE_KEYS, 'milk', 'wool'] as const;
export type ProgressionResourceKey = (typeof PROGRESSION_RESOURCE_KEYS)[number];
```

New actions:

```ts
{ type: 'buy_cow' }
{ type: 'feed_cow' }
{ type: 'collect_milk' }
{ type: 'buy_sheep' }
{ type: 'care_sheep' }
{ type: 'collect_wool' }
{ type: 'choose_pet'; petKind: PetKind }
{ type: 'pet_time' }
```

Balance constants for v3 are explicit and local to the domain: cow costs 300 Coins at Barn Tier 2; sheep costs 250 Coins at Barn Tier 3; cow/sheep care consumes normal action energy/time rather than creating a new feed commodity. Pet choice is permanent and has no purchase cost; daily pet time grants +1 Heart once/day.

- [ ] Add RED tests for Barn gates, purchase cost/idempotency, feed/care once/day, next-day milk readiness, milk duplicate rejection, two cared-day wool readiness/reset, permanent cat/dog selection, and one pet Heart/day.
- [ ] Add RED migration tests proving v4 inventory gets `milk: 0` and `wool: 0` without losing base resources.
- [ ] Run focused domain/progression tests and confirm RED.
- [ ] Implement animals and progression-resource normalization/actions.
- [ ] Ensure existing `livestock.chickens` remains untouched and is still the only chicken state.
- [ ] Re-run focused tests and require GREEN.
- [ ] Commit: `feat: add homestead animals`.

### Task 4: Add deterministic daily, milestone and seasonal events

**Files:**
- Create: `lib/homestead-events.ts`
- Modify: `lib/family-farm-progression.ts`
- Modify: `tests/homestead-life-v3.test.ts`
- Modify: `tests/family-farm-progression.test.ts`

**Interfaces:**

```ts
export type HomesteadEventKind = 'daily' | 'milestone' | 'seasonal';
export type HomesteadEventState = {
  current: { day: number; key: string; kind: HomesteadEventKind; resolved: boolean; choiceKey: string | null } | null;
  resolvedDailyDays: number[];
  seasonalOccurrences: Record<string, true>;
};

export function selectHomesteadEvent(input: DeterministicEventInput): EventDefinition | null;
export function seasonalOccurrenceKey(day: number, season: FarmSeason): string;
```

Daily catalog initially contains a compact set with state-based eligibility: `partner_breakfast`, `berry_surprise`, `rainy_afternoon`, `pond_morning`, `pet_discovery`, and `child_helps`. Seasonal definitions are `spring_picnic`, `summer_pond_day`, `autumn_harvest_fair`, `winter_family_dinner`. `growing_together` is a milestone event and has priority over ordinary daily selection once its exact gate is met.

New action:

```ts
{ type: 'resolve_event'; choiceKey: string }
```

- [ ] Add RED tests proving identical unresolved state selects the same event, no wall-clock/random dependency exists, and only one current daily event exists per day.
- [ ] Add RED tests for event-choice idempotency and invalid choice rejection.
- [ ] Add RED tests for Growing Together eligibility/completion permanently changing family stage to child only once.
- [ ] Add RED tests for seasonal occurrence identity: same year/season cannot reward twice; next in-game year can trigger again.
- [ ] Run focused tests and confirm RED.
- [ ] Implement event catalog/selector/resolver and wire end-day processing in the specified order: new day/weather → animal production/reset → deterministic event selection → family milestone eligibility → seasonal eligibility → normalized persistable state.
- [ ] Re-run tests and require GREEN.
- [ ] Commit: `feat: add deterministic homestead events`.

### Task 5: Add compact v3 crafting without crossing Hex authority

**Files:**
- Create: `lib/homestead-crafting.ts`
- Modify: `lib/family-farm-progression.ts`
- Modify: `tests/homestead-life-v3.test.ts`

**Interfaces:**

Crafting remains Family Farm-authoritative. It does not become an authorization token for Hex placement, so Hex building placement remains independent and server-authoritative.

```ts
export const HOMESTEAD_CRAFT_KEYS = [
  'fence_bundle', 'bench_kit', 'lamp_kit', 'stone_path_kit', 'flower_planter',
  'animal_trough', 'picnic_table', 'flower_box', 'wool_cushion',
] as const;
export type HomesteadCraftKey = (typeof HOMESTEAD_CRAFT_KEYS)[number];

export type HomesteadCraftingState = Record<HomesteadCraftKey, number>;
export type HomesteadCraftDefinition = {
  key: HomesteadCraftKey;
  minWorkshopTier: BuildingTier;
  resources: Partial<Record<ProgressionResourceKey, number>>;
  maxCount?: number;
  familyBonus?: number;
};
```

New action:

```ts
{ type: 'craft_homestead_item'; craftKey: HomesteadCraftKey }
```

Representative rules: basic fence/bench/path/lamp kits require Workshop Tier 1–2 and wood; planter/flower box add berries; animal trough is Tier 2; picnic table is Tier 2; wool cushion is Tier 3 and consumes wool. Selected crafted props provide small family/event bonuses and can be projected visually near Home/Barn; they never mutate Hex coordinates themselves.

- [ ] Add RED tests for Workshop tier gates, resource subtraction, wool recipe, repeated craft counts/max rules, and no Hex state dependency.
- [ ] Implement catalog, normalizer and reducer helper.
- [ ] Wire action through `family-farm-progression.ts` while retaining existing `craft` Workshop upgrades unchanged.
- [ ] Re-run focused tests and require GREEN.
- [ ] Commit: `feat: expand homestead crafting`.

### Task 6: Expose v3 actions through the existing API transaction

**Files:**
- Modify: `app/api/family-farm/route.ts`
- Modify: `lib/family-farm-store.ts` only if type import/version assertions need updating
- Modify: `.github/workflows/family-farm-ci.yml`
- Modify: `tests/hex-family-farm-progression-integration.test.ts`

**Interfaces:**

Extend the current action parser only. Do not add `/api/family-farm-v3`.

Parser cases must cover:
- `upgrade_building`
- `buy_cow`, `feed_cow`, `collect_milk`
- `buy_sheep`, `care_sheep`, `collect_wool`
- `choose_pet`, `pet_time`
- `resolve_event`
- `craft_homestead_item`
- progression `sell_resource` accepts `milk` and `wool`

- [ ] Add RED source-contract tests for every new parser case, `petKind`, event `choiceKey`, craft key validation, and continued use of `family-farm-state-v1` + Serializable transaction.
- [ ] Update Family Farm CI path/test command so `tests/family-farm-progression.test.ts` and `tests/homestead-life-v3.test.ts` execute when v3 domain files change.
- [ ] Implement parser validation and stable game-rule errors through the existing route/store.
- [ ] Re-run integration/domain tests and require GREEN.
- [ ] Commit: `feat: expose Homestead Life v3 actions`.

### Task 7: Add contextual Barn/family/event UX while preserving music mute

**Files:**
- Modify: `lib/hex-world/living-homestead.ts`
- Modify: `components/hex-world/HexLivingActionPanel.tsx`
- Modify: `components/hex-world/HexLivingHUD.tsx`
- Modify: `tests/hex-living-homestead.test.ts`
- Modify: `tests/hex-living-homestead-ui.test.ts`
- Re-run unchanged: `tests/hex-land-placement-audio.test.ts`

**Interfaces:**

Extend `LivingBuildingRole` with `'barn'` and map `buildingKey === 'barn'` to it.

Action-panel behavior:
- Barn: chickens summary plus cow/sheep buy/care/collect actions according to tier.
- Home: current cooking/family/sleep plus pet choice/daily pet time and Home upgrade.
- Workshop/Storage: tier upgrade affordance and v3 craft recipes/resources.
- Current event: concise 1–3 choices shown contextually; `resolve_event` only once.

HUD behavior:
- retain existing `🔊 Music` / `🔇 Music` control and `musicMuted`/`onToggleMusic` contract unchanged.
- add only a compact family-stage/current-event affordance; do not add a permanent dense dashboard.

- [ ] Add RED UI-contract assertions for Barn role/actions, Tier labels/upgrades, pet selection, current-event choice, and child status.
- [ ] Keep existing source assertions that HUD Music and `useGardenMusic` are wired.
- [ ] Run Living Homestead UI/pure tests + land/audio regression and confirm only new assertions are RED.
- [ ] Implement contextual UX.
- [ ] Re-run all three tests and require GREEN.
- [ ] Commit: `feat: add Homestead Life v3 interactions`.

### Task 8: Render family, animals, events and visible building tiers

**Files:**
- Modify: `components/hex-world/HexBuildingModels.tsx`
- Modify: `components/hex-world/models/HexStructureModels.tsx`
- Modify: `components/hex-world/HexBuildings.tsx`
- Modify: `components/hex-world/HexWorld3D.tsx`
- Modify: `components/hex-world/HexLivingWorldLayer.tsx`
- Modify: `lib/hex-world/living-homestead.ts`
- Modify: `tests/hex-building-art.test.ts`
- Modify: `tests/hex-living-homestead.test.ts`
- Modify: `tests/hex-living-homestead-ui.test.ts`

**Interfaces:**

```ts
export type LivingActivityAnchor = {
  key: string;
  q: number;
  r: number;
  kind: 'home' | 'garden' | 'pond' | 'workshop' | 'bench' | 'barn';
};

export function getLivingActivityAnchors(buildings: HexBuildingDTO[]): LivingActivityAnchor[];
export function getHouseholdVisualSamples(state: ProgressionFamilyFarmState, buildings: HexBuildingDTO[]): HouseholdVisualSample[];
export function getAnimalVisualSamples(state: ProgressionFamilyFarmState, buildings: HexBuildingDTO[]): AnimalVisualSample[];
```

Projection rules:
- two partner samples always render if Home exists; child renders only for `family.stage === 'child'`.
- if an optional target building is absent, route/sample falls back to a deterministic Home-safe anchor.
- cow/sheep prefer Barn; pet prefers Home; chickens can prefer Barn once present but remain driven by existing `livestock.chickens`.
- movement is bounded interpolation between known activity anchors; with reduced motion, characters/animals remain in stable positions and skip nonessential wandering/bobbing.
- no API calls/fetch in the 3D layer.

Building tier projection:
- `HexWorld3D` derives tier per building key from `livingState.buildingTiers` and passes it into `HexBuildings`/`HexBuildingModel`.
- `HexStructureModels` adds a local Barn primitive model and visible Tier 2/Tier 3 details for Home/Barn/Workshop/Storage without replacing the Hex building record or footprint.

- [ ] Add RED pure tests for deterministic anchors/samples, child visibility gate, Barn preference, Home fallback, and bounded counts.
- [ ] Add RED source-contract tests for Barn local model, tier prop flow, reduced-motion branch, two partners/child/cow/sheep/pet visuals, and no persistence/API imports.
- [ ] Implement pure projection helpers first, then primitive 3D visuals and tier model details.
- [ ] Re-run art/living/UI tests and require GREEN.
- [ ] Re-run `tests/hex-land-placement-audio.test.ts` again because tier visuals must not affect land movement or mute behavior.
- [ ] Commit: `feat: bring Homestead Life v3 into the 3D world`.

### Task 9: Full regression, PR, CI, merge and Railway verification

**Files:**
- No production changes unless a failing regression proves one is required.

- [ ] Run focused release gate locally/CI-equivalent:

```bash
node --import tsx --test \
  tests/family-farm-progression.test.ts \
  tests/homestead-life-v3.test.ts \
  tests/hex-family-farm-progression-integration.test.ts \
  tests/hex-building-catalog.test.ts \
  tests/hex-building-art.test.ts \
  tests/hex-living-homestead.test.ts \
  tests/hex-living-homestead-ui.test.ts \
  tests/hex-land-placement-audio.test.ts
```

- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run lint` and require zero lint errors; warnings are reported separately and are not rewritten into false “zero warning” claims.
- [ ] Run `npm run build` and require exit 0.
- [ ] Review diff against the approved spec: no Prisma migration, no duplicate persistence, no Hex tier persistence, no WASD/navmesh/MMO scope creep.
- [ ] Open a PR from `feature/homestead-life-v3` to `main` with implementation + verification summary.
- [ ] Require exact-head GitHub CI success for both Family Farm CI and Hex Homestead CI, including PostgreSQL + Redis Hex integration and production build.
- [ ] Confirm `tests/hex-land-placement-audio.test.ts` remains green on the exact PR head: 7/19/37 placement, free Move Land, bridge/connectivity/locked-coordinate safety, `narinyland:music-muted`, Web Audio gesture gate and HUD mute.
- [ ] Review PR comments/threads and resolve validated issues; rerun exact-head CI after any change.
- [ ] Merge only with an expected-head SHA guard after fresh verification.
- [ ] Verify the resulting merge commit receives a SUCCESS Railway deployment status for the existing Narinyland service.
- [ ] Inspect Railway build/deploy logs when available and confirm migrations/startup/Next Ready; allow the already-known Postgres cold-wake retry pattern but do not claim unrelated global Railway sleep behavior fixed.
