# Living Homestead Progression v2 Design

## Goal
Deepen Narinyland's existing Living Homestead loop so each day contributes to visible long-term progression, seasonal change, and meaningful building utility without reintroducing MMO complexity or creating a second save system.

## Product principles
- Keep the floating HexWorld as the dominant play surface.
- Keep Family Farm as the authoritative life-sim state and HexWorld as the authoritative land/building state.
- No Prisma schema migration and no new gameplay API route.
- Progression should make existing activities more meaningful before adding broad new systems.
- Avoid a new currency. Rewards remain coins, seeds, XP, Hearts, resources, and existing Hex Points.
- Keep mobile-safe compact overlays and contextual actions.

## 1. Four-season year
A year is 28 in-game days. Each season lasts seven days:
- Spring: days 1-7
- Summer: days 8-14
- Autumn: days 15-21
- Winter: days 22-28

The cycle repeats every 28 days. `seasonForDay(day)` is the source of truth and the normalized save derives/repairs season from day.

Weather remains deterministic but becomes season-aware. Each season uses a stable weather cycle appropriate to that season. Rain still waters planted crops overnight.

Sleeping on day 7, 14, 21, or 28 completes a season. The end-of-day result records a season transition, grants a compact season reward, increments completed-season progression, and moves the world into the next season.

## 2. Crop progression
Keep the existing crops and add four progressive crops:
- Carrot: Lv 1, all seasons, spring bonus
- Lettuce: Lv 1, spring/summer, spring bonus
- Tomato: Lv 2, spring/summer/autumn, summer bonus
- Strawberry: Lv 3, spring/summer, summer bonus
- Corn: Lv 3, summer/autumn, autumn bonus
- Pumpkin: Lv 4, autumn, autumn bonus
- Potato: Lv 4, autumn/winter, winter bonus
- Cabbage: Lv 5, winter/spring, winter bonus

Crop definitions gain `minLevel`, `seasons`, and `bonusSeason`. Planting and buying seeds are server-authoritatively blocked until the crop is level-unlocked and season-available. Harvesting a crop during its bonus season grants +1 produce and a small XP bonus.

The Garden Patch chooser shows locked/season-unavailable reasons instead of letting invalid actions reach the server.

## 3. Building utility progression
Existing buildings keep their current roles and gain these additions:

### Storage
Storage becomes the homestead market surface, not only a read-only inventory. It can:
- buy available seed varieties
- sell all owned produce for a selected crop
- sell all owned forage/fish/egg resources

All transactions use existing Family Farm actions.

### Workshop
Workshop unlocks at Family Farm level 3. It crafts persistent homestead upgrades from existing resources:
- `sturdy_watering_can`: 8 wood + 2 mushroom. Watering takes 5 minutes instead of 10.
- `market_crate`: 10 wood + 2 berries. Produce/resource selling pays a 10% rounded-down bonus.
- `cozy_basket`: 6 wood + 2 berries. Family Time grants +1 extra Heart.

Each upgrade is one-time, server-authoritative, persisted inside the Family Farm JSON save, and does not add a new inventory/currency model.

### Flower Patch
Flower Patch gains `Tend Flowers`, once per day. It costs 10 in-game minutes, grants +1 Heart and +2 XP, and counts toward Homestead Journey progress but not the existing four daily goals.

### Decorative buildings
Lamp, Fence, Stone Path and other decoration stay visual-only. Do not manufacture utility for every object.

## 4. Unlock track
The HUD always exposes the next meaningful level unlock:
- Lv 2: Fishing + Tomato
- Lv 3: Workshop + Strawberry + Corn
- Lv 4: Pumpkin + Potato
- Lv 5: Cabbage + advanced homestead tier
- Lv 6+: `Homestead mastery` copy; no invented system required in v2

Workshop actions are blocked before level 3. Crop actions use their own `minLevel` values. Fishing keeps its existing level-2 gate.

## 5. Homestead Journey
Add a persistent one-time journey reward track, separate from daily goals but using the same save:
- `harvest_10`: harvest 10 produce
- `home_level_2`: upgrade Home to level 2
- `first_craft`: craft any Workshop upgrade
- `first_season`: complete one season
- `hearts_50`: reach 50 Hearts

Journey rewards auto-grant when the authoritative state first satisfies a milestone. Rewards use coins, seeds, XP, and Hearts only. The HUD's expandable goals surface includes a compact Journey subsection showing completed/total progress.

## 6. End-of-season payoff
The existing `lastDaySummary` gains optional season-transition data:
- completed season
- next season
- season reward coins
- season reward Hearts

When a season ends, the HUD shows a dismissible compact season card for that day summary. The card must not block the world or persist after dismissal during the current client session.

## 7. World presentation
`HexLivingWorldLayer` derives seasonal visuals from `FamilyFarmState.season` only; it performs no mutations.
- Spring: subtle blossom motes
- Summer: warm firefly motes
- Autumn: drifting leaf motes
- Winter: sparse snow particles

Rain remains an additional weather layer. Seasonal particle counts are bounded and reduced-motion mode renders a static/minimal equivalent.

Crop visuals add palettes for the four new crops and remain capped at six samples per visible Garden Patch.

## 8. Save migration and compatibility
Bump Family Farm JSON `schemaVersion` from 3 to 4. Extend the normalizer so v2/v3 and malformed saves safely migrate into v4.

New v4 fields:
- `season: FarmSeason`
- expanded crop inventory keys
- `workshopUpgrades`
- `daily.flowersTended`
- `stats.crafted`
- `stats.flowersTended`
- `stats.seasonsCompleted`
- `journey`
- optional season-transition fields in `lastDaySummary`

Existing saves keep their day, coins, energy, level, XP, family name, home level, Hearts, streak, existing plots/inventory/livestock/daily/stats/milestones, and prior day summary wherever values are valid.

## 9. Error handling and concurrency
Existing `/api/family-farm` transaction/revision handling remains authoritative. New actions use the same `familyFarmAPI.act()` client path and the existing synchronous action lock in `useLivingHomestead`.

Invalid level, season, resource, duplicate-craft, and once-per-day flower actions throw concise `FarmGameError` messages. No optimistic mutation is introduced.

## 10. Testing
TDD covers:
- deterministic season/day mapping and season-aware weather
- v3 -> v4 normalization
- crop level/season gates and bonus yields
- Workshop crafting costs, duplicate prevention and upgrade effects
- Storage sale bonus after Market Crate
- Flower Patch once-per-day Heart/XP behavior
- Journey auto-rewards are one-time
- season transition/reward summary
- HUD next unlock / Journey / season summary copy
- action panel Workshop/Storage/Flower Patch wiring
- 3D seasonal presentation remains visual-only and bounded
- all existing HexWorld, undo, Family Farm, lint and production-build regressions remain green
