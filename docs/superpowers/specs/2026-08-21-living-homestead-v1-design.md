# Living Homestead v1 Design

**Status:** Approved for implementation  
**Project:** Narinyland  
**Primary route:** `/garden`  
**Base:** current floating HexWorld builder on `main`

## Objective

Turn the existing polished floating HexWorld from primarily a builder into a coherent cozy shared-life game without reintroducing the old separate game-mode architecture.

The player should be able to enter `/garden` and complete a short daily loop inside the same floating homestead:

`Wake → tend garden → gather/care → cook/family time → earn rewards → build/expand → sleep → next day`

The implementation must preserve the current server-authoritative HexWorld builder, Land ownership, current AppKit/local auth integration, current Home/Timeline/Coupons/Letters shell, current Hex persistence, expansion Points economy, and existing Family Farm saves.

## Architecture

Narinyland already has two mature systems that must remain authoritative for their own concerns:

1. **HexWorld** owns floating land geometry, buildings, placement, move/rotate/remove, undo, and land expansion.
2. **Family Farm** owns day/time, weather, energy, coins, XP/level, hearts, crops, livestock, inventory, recipes, daily goals, streaks, rewards, and home progression.

Living Homestead v1 is an integration layer between them. It must not create a second life-sim persistence model and must not duplicate Family Farm rules on the client.

The client loads Family Farm state for the active Land through the existing `/api/family-farm` endpoint and sends existing typed `FarmAction` mutations. Server responses remain authoritative. HexWorld state and Family Farm state are updated independently and must remain independently recoverable.

No Prisma schema migration is required for v1.

## Core Player Loop

### Daily HUD

When Family Farm state loads, `/garden` displays a compact world-first HUD containing:

- Day number
- current formatted time
- weather
- Energy / max Energy
- Coins
- Family Hearts
- Level / XP progress
- shared HexWorld Points
- Daily Goals completion count

The HUD must stay compact and must not cover the island focal area. Daily Goals expand only on user request.

### Garden Patch

Selecting a `garden_patch` building exposes living actions in addition to the existing building edit controls.

Actions:

- **Plant** — opens the four existing crop choices and plants the first available empty Family Farm plot.
- **Water** — waters the first planted, non-ready, non-watered plot.
- **Harvest** — harvests the first ready plot.

The selected building is a gameplay gateway to the shared Family Farm plot pool. V1 intentionally does not persist a fragile one-to-one `HexBuilding.id → FarmPlot.id` mapping.

The action panel must show useful counts such as empty plots, growing crops, watered crops, and ready crops so the player understands what the action will affect.

### Crop Visualization

Family Farm crop state must become visible in the 3D island.

A presentation-only crop layer derives representative crop meshes from Family Farm plots and anchors them around visible `garden_patch` buildings. It does not create HexBuilding rows and does not persist mesh state.

Visual stages:

- newly planted → tiny sprout
- partial progress → medium crop
- ready → full crop with crop-specific accent
- watered → subtle damp/blue accent

If there are more logical plots than can be shown clearly, the 3D layer shows a representative bounded sample while the action panel shows authoritative counts.

### Pond

Selecting `pond` exposes **Fish**.

Fishing uses the existing Family Farm level gate, daily fishing charges, energy/time spend, weather/evening bonuses, fish inventory, XP, and error messages.

### Trees / Foraging

Selecting `tree` exposes **Forage**.

Foraging uses the existing Family Farm daily forage charges and resource results. No new loot table is introduced in v1.

### Home

Selecting `home` exposes the main family-life actions:

- **Cook** — opens recipes from the existing recipe catalog; unavailable recipes show their missing requirement rather than silently failing.
- **Family Time** — uses the existing once-per-day family-time action.
- **Care Chickens** — exposes Feed, Collect Eggs, and Adopt Chicken using existing livestock rules.
- **Upgrade Home** — uses the existing coin cost and home-level cap.
- **Sleep / End Day** — calls the existing `end_day` action and advances crops, weather, eggs, energy, streak, rewards, and day summary.

Chicken visuals are presentation-only and appear near Home based on the authoritative livestock count. Rendering is bounded to a small maximum visual count even if logical livestock grows later.

### Bench

Selecting `bench` exposes **Family Time** as a contextual shortcut to the same authoritative action used by Home. It must not create a second relationship currency or separate cooldown.

### Storage

Selecting `storage` exposes a compact read-only inventory summary for seeds, produce, and gathered resources. Selling/market expansion is out of scope for this v1 integration because the core loop is already complete without adding another commerce surface.

### Workshop

Workshop remains primarily a builder asset in v1. The panel may label it as a future crafting space but must not add placeholder buttons or fake unavailable crafting actions.

## Daily Goals and Rewards

The integration uses existing `getDailyGoals` and `claim_daily_reward` rules.

The HUD displays 0–4 completed goals and allows claiming only when all goals are complete and the reward has not already been claimed.

Existing goals remain authoritative:

- Tend the garden 3 times
- Forage or fish once
- Care for chickens
- Spend family time

No duplicate goal state is stored in HexWorld.

## Weather, Day, and Time

Weather and clock are driven entirely by Family Farm state.

The HUD always reflects the authoritative weather/time. The 3D presentation may add a lightweight rainy-day particle treatment when `weather === 'rainy'`, but weather must not create an additional simulation or timer in the renderer.

## World Interaction and Builder Coexistence

Existing building edit actions remain available:

`Move · Rotate · Remove`

Living actions appear as a separate contextual panel above the builder edit bar so gameplay does not take away customization.

When the player enters Build, Move, or Expand modes, living action panels should yield to those modes. The daily HUD remains visible.

Building mutation busy state and farm-action busy state are separate. A farm action must not accidentally disable or mutate HexWorld persistence.

## Error and Loading Behavior

Family Farm loading is non-blocking. HexWorld should remain usable if the Family Farm request temporarily fails.

Living HUD/panels show a compact retry state when the life-sim save cannot load. Builder APIs and land editing must continue to function.

Farm-action errors use the existing server messages and should surface through the current garden toast system.

Stale Family Farm responses from a previous Land must not overwrite the active Land state after a Land switch.

## Performance and Accessibility

- Keep the existing `HexWorld3D` canvas mounted.
- Crop/chicken/rain visuals are presentation-only and bounded.
- Do not create one React/Three object per all 20 plots when a smaller representative sample is enough.
- Reduced-motion mode removes decorative crop bobbing/chicken movement/rain travel but keeps clear state visibility.
- Interactive controls retain mobile-safe minimum touch sizes.
- The world remains the visual hero; no full-screen management dashboard is introduced.

## Persistence and Safety

- No new Prisma schema migration.
- No direct client writes to Family Farm state.
- Every farm mutation goes through `familyFarmAPI.act()` → `/api/family-farm` → `applyFamilyFarmAction()`.
- Every building/expansion mutation continues through existing HexWorld APIs.
- Family Farm state stays scoped to `configId + landId` through the existing save service.
- Existing legacy Family Farm save key remains unchanged.

## Out of Scope

- character walking/controller resurrection
- multiplayer MMO mode
- combat
- guild/party gameplay
- new trading economy
- seasonal content beyond existing Spring state
- crafting recipes for Workshop
- one-to-one persistent crop-to-HexBuilding mapping
- replacing HexWorld Points with Farm Coins or vice versa

## Acceptance Criteria

1. `/garden` still builds, moves, rotates, removes, undoes, and expands exactly as before.
2. Family Farm state loads per active Land without blocking HexWorld.
3. HUD shows authoritative day/time/weather/energy/coins/hearts/level/Points/goals.
4. Garden Patch supports Plant/Water/Harvest through existing server actions.
5. Crops visibly reflect farm progress in the 3D island.
6. Pond supports Fish; Tree supports Forage.
7. Home supports Cook, chicken care, Family Time, Upgrade Home, and Sleep.
8. Bench shares the same Family Time action/cooldown.
9. Storage shows authoritative inventory counts.
10. Daily goal reward can be claimed from the HUD using the existing server action.
11. Farm errors do not break builder state.
12. Land switches cannot apply stale farm responses.
13. No schema migration and no new persistent gameplay model are introduced.
14. Reduced-motion and mobile interaction remain supported.
