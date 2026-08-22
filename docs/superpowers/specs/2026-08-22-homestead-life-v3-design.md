# Homestead Life v3 — Design

Date: 2026-08-22
Status: Approved design
Branch: `feature/homestead-life-v3`

## Goal

Make Narinyland's floating garden feel like a lived-in family homestead rather than a collection of farming systems. The world should visibly grow through family presence, animals, seasonal moments, building upgrades, and crafting, while preserving the current simple world-first interaction model.

The feature must not turn Narinyland into an MMO, character-control game, or dashboard-heavy management simulator.

## Product Principles

- World-first: progression should be visible directly in the 3D homestead.
- Cozy and lightweight: a small number of meaningful systems beats a large simulation surface.
- Family identity: the household is a core progression axis, not just a stat.
- One authoritative gameplay save: no duplicate persistence.
- Hex World owns geometry; Family Farm owns homestead life/progression.
- No WASD, no player-controlled character, no heavyweight NPC navigation service.
- Preserve existing land relocation and persistent music mute behavior as hard regression requirements.

## Architecture

### Authoritative boundaries

**Family Farm owns:**
- day/time
- weather and seasons
- energy
- Coins, XP, Hearts
- crop/inventory/livestock state
- relationship and family milestones
- child unlock/status
- homestead event state/history
- animal care and products
- building progression tiers as gameplay unlocks
- crafting unlocks and recipes

**Hex World owns:**
- land/tile geometry
- starter land and purchased land clusters
- buildings and their placement
- move/rotate/remove/undo
- expansion placement and relocation
- Hex Points

Family characters, animals, and event props in the 3D scene are projections of authoritative gameplay state. They are not independently persisted simulation entities.

### Module structure

Keep the Family Farm save/API boundary, but split new logic into focused modules rather than expanding one monolithic progression file:

- `family-life` — partners, relationship, child milestones
- `homestead-animals` — chicken/cow/sheep/pet care and production
- `homestead-events` — daily and seasonal event selection/resolution
- `building-progression` — Home/Barn/Workshop/Storage tier rules
- existing Family Farm progression adapter — compatibility, state normalization, action orchestration

No new gameplay persistence subsystem is introduced.

## Family Presence

### Household model

- Start with two partners.
- One child unlocks later through relationship + Home progression.
- No open-ended household generator in v3.

### Family progression

Relationship grows through:
- Family Time
- shared meals
- daily activities
- seasonal events
- caring for animals together
- Home upgrades

Relationship milestones unlock visible moments and progression rather than a large menu of statistics.

### Child unlock

Child progression requires all of:
- Home Tier 2 or higher
- a defined relationship/Hearts milestone
- completion of a one-time family milestone event

The child becomes a lightweight visible household member with contextual activities around Home/Garden. There is no separate child-management simulator.

### 3D family behavior

Family members automatically wander between meaningful anchors such as:
- Home
- Garden Patch
- Pond
- Workshop
- Bench
- Barn/animal area

Movement is simple bounded interpolation between known safe anchor positions. It does not use global navmesh/pathfinding.

Possible visual behaviors:
- walking
- watering
- carrying a basket
- feeding animals
- sitting on a bench
- standing together during events
- idle look-around/turning

Family movement must respect reduced-motion preferences by reducing or disabling nonessential animation.

## Animals

### Chickens

Preserve the existing chicken loop and integrate chickens visually with Barn progression.

### Cow

- unlock through Barn progression
- feed once per day
- produce milk once per eligible day
- duplicate collection in the same day is rejected

### Sheep

- unlock through higher Barn progression
- feed/care interaction
- produce wool on a periodic eligible cadence
- duplicate collection in the same eligible period is rejected

### Pet

- player selects cat or dog
- no commodity-production loop
- gives Hearts/family-event bonuses
- wanders around Home/family anchors

Each animal has one clear care loop, one visible 3D behavior, and one useful gameplay benefit.

## Daily and Seasonal Events

### Daily events

At most one meaningful daily event is selected per in-game day.

Examples:
- animal wandered into the garden
- partner prepared breakfast
- unexpected berry harvest
- rainy afternoon indoors
- beautiful pond morning
- pet discovers a small resource
- a gift arrives without introducing a town/NPC subsystem
- child wants to help water crops

Events may present 1–3 lightweight choices when useful. Rewards/consequences can include:
- Hearts
- XP
- resources
- energy
- time

Daily-event rewards must be idempotent and not claimable more than once.

### Seasonal events

Each seven-day season has one larger homestead event:
- Spring Picnic
- Summer Pond Day
- Autumn Harvest Fair
- Winter Family Dinner

Seasonal events occur within the existing homestead and do not load a separate festival map.

Seasonal event completion is recorded so one-time rewards cannot replay incorrectly.

## Building Progression

Buildings visibly upgrade in place through three tiers.

### Home

- Tier 1: starter cottage
- Tier 2: expanded cozy home; required for child progression
- Tier 3: larger family house with stronger family bonuses

### Barn

- Tier 1: chicken support
- Tier 2: cow unlock
- Tier 3: sheep unlock + higher animal capacity

If Barn does not yet exist as a Hex World building, add it as a normal world building under Hex World placement authority rather than encoding it as a hidden Family Farm-only object.

### Workshop

- Tier 1: basic utility crafting
- Tier 2: furniture/decor recipes
- Tier 3: advanced homestead improvements

### Storage

- Tier 1–3 visibly increase structure size/detail
- capacity grows per tier

### Visual upgrade rule

Upgrades happen in place. The existing building identity and placement remain stable; render/model details change by tier instead of replacing the building with a separate new placement.

## Crafting Expansion

Keep crafting compact and practical.

Target recipe categories:
- fences
- benches
- lamps
- paths
- planters
- animal trough
- picnic table
- decorative flower objects
- wool/fabric-based cozy decor
- selected functional homestead upgrades

Do not introduce a large crafting skill tree or hundreds of recipes.

## Core Gameplay Loop

Morning → choose priorities → care for crops/animals → family moments → craft/build → event opportunity → end day → visible homestead growth.

The loop should reward both productivity and relationship-building without requiring the player to complete every subsystem every day.

## Persistence and Compatibility

Upgrade Family Farm JSON from schema v4 to schema v5 through a backward-compatible normalizer/adapter.

Keep the existing Family Farm save boundary and save key. Do not create duplicate persistence.

The v5 state adds safe-default fields for:
- relationship/family milestones
- child unlock/status
- cow/sheep/pet state
- Home/Barn/Workshop/Storage tiers
- event history
- current/today event
- expanded crafting unlocks

Existing v4 saves must load without data loss and receive deterministic defaults for all v5 fields.

A new Prisma migration is not expected for progression state. If implementation reveals a hard persistence requirement, stop and reassess architecture before introducing one.

## Daily Simulation Flow

End/start day processing follows this order:

1. resolve day/season/weather
2. reset eligible per-day animal flags
3. resolve animal production eligibility
4. select at most one daily event
5. update family activity/milestones
6. resolve seasonal event eligibility
7. apply deterministic state transitions
8. persist normalized v5 state

The engine must protect against:
- duplicate daily rewards
- multiple daily events in one day
- replaying one-time child/family milestones
- collecting animal products repeatedly in the same eligibility window

## 3D World Projection

Extend the living homestead scene to render:
- Partner 1
- Partner 2
- child after unlock
- chickens
- cow
- sheep
- selected pet
- building tier variants
- contextual event props/poses

The scene derives this from authoritative state and existing Hex building positions.

Known building anchors are converted into local activity points. Character/animal movement uses bounded local routes and simple interpolation, not full pathfinding.

## Land Relocation — Hard Regression Contract

Purchased land must continue to support:

`Move Land → ghost follows cursor → pin → validate → confirm`

Rules that must remain true:
- moving purchased land is free
- starter land cannot move
- purchased expansion moves as one cluster
- exact target placement is server-authoritative
- candidate cannot overlap any persisted coordinate, including locked starter-envelope coordinates
- moved land must remain connected to unlocked land
- moving a bridge cluster cannot disconnect the remaining island
- purchased land containing a building cannot move until the building is moved/removed
- rejected movement does not spend Points

New Barns, animals, family characters, or event props must not bypass or alter Hex World placement authority.

## Music — Hard Regression Contract

The existing homestead music remains muteable from the HUD.

Requirements:
- clear `Music` / muted state affordance
- mute preference persists across reloads
- Web Audio remains gesture-gated
- mute ramps gain down rather than leaving audible output
- unmute resumes safely
- Safari fallback remains supported
- future event/family sound effects must obey the same global mute preference

Persisted key remains compatible with the existing implementation unless an explicit migration is added.

## UX Rules

- Keep the main interaction model world-first.
- Contextual Home/Barn/Workshop/animal interactions are preferred over new dashboard pages.
- Surface short choices near the relevant world object.
- Avoid permanent dense HUD panels.
- Use visual progression to communicate building/household growth.
- Preserve reduced-motion behavior.
- Keep actions understandable without exposing simulation internals.

## Error Handling

Gameplay actions are server-authoritative where state mutation is persisted.

Expected errors include:
- family milestone not eligible
- child unlock requirements not met
- animal already fed/cared for
- animal product not ready/already collected
- building tier requirements not met
- event already resolved
- recipe/material requirements not met

Errors should be stable typed codes/messages at the engine/API boundary and surfaced as concise contextual feedback in the UI.

Hex World relocation continues to use existing expansion/building validation error codes and server revalidation.

## Testing Strategy

Use TDD for new behavior.

Required coverage:
- v4 → v5 save migration
- deterministic v5 normalization/defaults
- partner relationship progression
- one-time relationship/family milestones
- child unlock conditions
- cow daily care/production limits
- sheep care/production cadence
- pet selection and family bonus
- building tier requirements/unlocks
- daily-event at-most-once behavior
- event choice reward idempotency
- seasonal event eligibility/completion
- expanded crafting costs/rewards
- 3D family/animal projection helpers
- reduced-motion behavior
- existing 7/19/37 free land placement
- purchased Move Land regression suite
- bridge/connectivity/locked-coordinate relocation safety
- persistent global music mute
- lint with zero errors
- TypeScript/production build
- DB/Redis integration where Hex World authority is involved

## Non-Goals

Not part of v3:
- WASD/player-controlled character
- MMO/shared-world avatar simulation
- global NPC town system
- navmesh/pathfinding service
- separate festival maps
- open-ended family generation
- large pet breeding system
- large crafting talent tree
- duplicate gameplay persistence
- unrelated Hex World refactors

## Acceptance Criteria

Homestead Life v3 is accepted when:

1. Two partners are visibly present and automatically perform lightweight homestead behaviors.
2. A child can unlock through Home + relationship + milestone progression and then appears in the world.
3. Chickens, cow, sheep, and a selectable cat/dog pet have simple working loops and visible world presence.
4. Daily events occur at most once per day and seasonal events occur according to season rules.
5. Home, Barn, Workshop, and Storage support visible three-tier progression in place.
6. Crafting includes the approved compact homestead/decor expansion.
7. Existing v4 saves migrate safely to v5.
8. The world remains interaction-first rather than dashboard-first.
9. Purchased land can still be freely relocated subject to all existing server-side safety rules.
10. Music can still be muted/unmuted and the preference persists.
11. Existing land, building, Family Farm, lint, build, and integration regression suites remain green.
