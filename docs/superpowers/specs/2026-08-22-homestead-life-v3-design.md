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
- family stage and milestones
- child unlock/status
- homestead event state/history
- animal care and products
- Home/Barn/Workshop/Storage progression tiers as gameplay unlocks
- crafting unlocks and recipes

**Hex World owns:**
- land/tile geometry
- starter land and purchased land clusters
- buildings and their placement
- move/rotate/remove/undo
- expansion placement and relocation
- Hex Points

Family characters, animals, building-tier visuals, and event props in the 3D scene are projections of authoritative gameplay state. They are not independently persisted simulation entities.

Building placement stays in Hex World. Building tier numbers stay in Family Farm v5 and are projected onto the matching Hex World building key. This avoids a second tier persistence model in Hex World.

### Module structure

Keep the Family Farm save/API boundary, but split new logic into focused modules rather than expanding one monolithic progression file:

- `family-life` — partners, Hearts-derived family stage, child milestones
- `homestead-animals` — chicken/cow/sheep/pet care and production
- `homestead-events` — daily and seasonal event selection/resolution
- `building-progression` — Home/Barn/Workshop/Storage tier rules
- existing Family Farm progression adapter — compatibility, state normalization, action orchestration

No new gameplay persistence subsystem is introduced.

## Family Presence

### Household model

- Start with two partners.
- One child unlocks later through Hearts + Home progression.
- No open-ended household generator in v3.

### Family progression

Existing **Hearts remain the canonical relationship currency**. v3 does not add a second relationship score.

Family stage is derived from Hearts and milestones. Hearts grow through:
- Family Time
- shared meals
- daily activities
- seasonal events
- caring for animals together
- Home upgrades

Family milestones unlock visible moments and progression rather than a large menu of statistics.

### Child unlock

The child unlock path is explicit:
- Home Tier 2 or higher
- at least **75 Hearts**
- completion of the one-time **Growing Together** family milestone event

When all three are satisfied, the child becomes permanently unlocked in the v5 save and appears as a lightweight visible household member with contextual activities around Home/Garden.

There is no separate child-management simulator.

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

- unlock at Barn Tier 2
- feed once per day
- a fed cow produces one milk collection opportunity on the next eligible day
- collection can happen at most once per eligible day

### Sheep

- unlock at Barn Tier 3
- care/feed once per day
- wool becomes ready after two cared-for in-game days
- collecting resets wool progress
- duplicate collection in the same readiness window is rejected

### Pet

- unlock through the Home/family progression path
- player chooses **cat or dog** once; the selection persists
- no commodity-production loop
- one pet interaction per day can grant a small Hearts bonus
- pet can contribute to selected family-event outcomes
- pet wanders around Home/family anchors

Each animal has one clear care loop, one visible 3D behavior, and one useful gameplay benefit.

## Daily and Seasonal Events

### Deterministic selection contract

Event selection belongs to a pure domain module and never calls wall-clock randomness directly inside the reducer.

The selector accepts deterministic inputs derived from authoritative state (including farm day/season and stable saved state). Tests can provide an explicit deterministic seed/selector input. Replaying the same persisted state must select the same unresolved event.

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

### Growing Together milestone event

`Growing Together` is a one-time family milestone event that becomes eligible when:
- Home is Tier 2+
- Hearts are 75+
- the milestone has not previously completed

Completing it unlocks the child permanently.

### Seasonal events

Each seven-day season has one larger homestead event:
- Spring Picnic
- Summer Pond Day
- Autumn Harvest Fair
- Winter Family Dinner

Seasonal events occur within the existing homestead and do not load a separate festival map.

Seasonal event completion is recorded by year/season so rewards cannot replay multiple times for the same seasonal occurrence while still allowing the event to return in later in-game years.

## Building Progression

Buildings visibly upgrade in place through three tiers.

### Home

- Tier 1: starter cottage
- Tier 2: expanded cozy home; required for `Growing Together`
- Tier 3: larger family house with stronger family/event bonuses

### Barn

Barn does **not** exist in the current Hex World catalog and will be added as a normal Hex World building.

- placement/move/rotate/remove remain Hex World-authoritative
- tier remains Family Farm-authoritative
- Tier 1: chicken support
- Tier 2: cow unlock
- Tier 3: sheep unlock + higher animal capacity

The Barn must never be encoded as a hidden Family Farm-only spatial object.

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

Approved recipe categories:
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

Existing crafted upgrades remain compatible. New recipes are added through the same authoritative Family Farm action pattern.

## Core Gameplay Loop

Morning → choose priorities → care for crops/animals → family moments → craft/build → event opportunity → end day → visible homestead growth.

The loop should reward both productivity and relationship-building without requiring the player to complete every subsystem every day.

## Persistence and Compatibility

Upgrade Family Farm JSON from schema v4 to schema v5 through a backward-compatible normalizer/adapter.

Keep the existing Family Farm save boundary and save key. Do not create duplicate persistence.

The v5 state adds safe-default fields for:
- family milestone/completion state
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
3. advance animal production eligibility
4. select at most one daily event deterministically
5. update family milestone eligibility
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

The scene derives this from authoritative Family Farm state and existing Hex building positions.

Known building anchors are converted into local activity points. Character/animal movement uses bounded local routes and simple interpolation, not full pathfinding.

Missing or removed optional buildings must degrade gracefully: family/animal visuals fall back to Home-safe anchors instead of throwing or persisting invalid positions.

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

New Barns, animals, family characters, building-tier visuals, or event props must not bypass or alter Hex World placement authority.

## Music — Hard Regression Contract

The existing homestead music remains muteable from the HUD.

Requirements:
- HUD exposes the existing clear `🔊 Music` / `🔇 Music` control
- mute preference persists across reloads
- Web Audio remains gesture-gated
- mute ramps gain down rather than leaving audible output
- unmute resumes safely
- Safari `webkitAudioContext` fallback remains supported
- future event/family sound effects must obey the same global mute preference
- keep the existing storage key `narinyland:music-muted`

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
- Hearts-derived family progression
- one-time family milestones
- exact child unlock conditions: Home Tier 2 + 75 Hearts + `Growing Together`
- cow daily care/production limits
- sheep two-care-day wool cadence
- persistent cat/dog selection and daily pet bonus
- building tier requirements/unlocks
- deterministic daily-event selection
- daily-event at-most-once behavior
- event choice reward idempotency
- seasonal event eligibility and year/season completion identity
- expanded crafting costs/rewards
- 3D family/animal projection helpers
- missing-anchor fallback behavior
- reduced-motion behavior
- existing 7/19/37 free land placement
- purchased Move Land regression suite
- bridge/connectivity/locked-coordinate relocation safety
- persistent global music mute under `narinyland:music-muted`
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
2. A child permanently unlocks only after Home Tier 2+, 75 Hearts, and completion of `Growing Together`, then appears in the world.
3. Chickens, cow, sheep, and a persistent selectable cat/dog pet have simple working loops and visible world presence.
4. Daily events occur at most once per day and replay deterministically from identical unresolved state.
5. Spring Picnic, Summer Pond Day, Autumn Harvest Fair, and Winter Family Dinner resolve once per season occurrence and can return in later in-game years.
6. Home, Barn, Workshop, and Storage support visible three-tier progression in place; Barn exists as a normal Hex World building.
7. Crafting includes the approved compact homestead/decor expansion.
8. Existing v4 saves migrate safely to v5 with deterministic defaults and no data loss.
9. The world remains interaction-first rather than dashboard-first.
10. Purchased land can still be freely relocated subject to all existing server-side safety rules.
11. Music can still be muted/unmuted, uses `narinyland:music-muted`, and the preference persists.
12. Existing land, building, Family Farm, lint, build, and integration regression suites remain green.
