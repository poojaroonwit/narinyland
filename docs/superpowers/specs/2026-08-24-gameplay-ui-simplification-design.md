# Gameplay UI Simplification Design

**Goal:** Make Narinyland `/garden` feel like a cozy game first and a web application second by reducing persistent interface chrome and moving actions into contextual, world-centric interactions.

## Principles

- Keep the existing HexWorld, living-homestead state, farming, inventory, expansion, undo, camera, and server authority unchanged.
- The 3D world is the primary interface. Persistent UI should expose only information needed every few seconds.
- Default HUD shows Day/Weather, Energy, Coins, and Level/XP. Hearts/Points, Goals/Journey, and Music move behind compact controls.
- Default bottom gameplay bar exposes Farm, Build, Bag, and Goals. Reset View becomes a small utility control; Expand becomes contextual rather than a peer of Build.
- Selecting a living building shows only its highest-frequency actions first. Detail-heavy upgrades/crafting/storage remain available through a compact expandable sheet.
- Farming state should be understandable from short labels and immediate actions; do not add a new economy or change crop rules.
- Build catalog becomes more visual and purpose-led, while retaining the current building catalog and placement rules.
- Expansion keeps the same tiers/costs but presents them as named land-growth choices with clearer value and less configuration language.
- Mobile remains first-class: touch targets >= 44px, safe-area aware, no overlapping fixed panels, portrait usable at 390px width.
- Preserve current app shell/navigation and all existing authentication/billing behavior.

## Target Interaction Hierarchy

### Persistent top layer
- Left: Day + season/weather summary.
- Right: Energy, Coins, Level/XP.
- Compact utility buttons: wallet (Hearts/Points), Goals, Music.
- Goals/Journey details open as a compact popover/sheet, not an always-wide dashboard strip.

### Persistent bottom layer
- Farm: selects/focuses the best available Garden Patch and opens its contextual actions.
- Build: opens build catalog.
- Bag: opens a compact inventory sheet summarizing seeds/resources/products.
- Goals: opens daily goals.
- Reset View: small icon button adjacent to the bar.
- Expand: shown as a contextual edge/growth action when the user chooses to expand; keep the current expansion state machine and preview.

### Selected building
- Show a compact context sheet with title and 2–4 primary actions.
- Garden: Plant / Water / Harvest.
- Pond: Fish.
- Forage tree: Forage.
- Family/cozy spot: Family Time.
- Flowers: Tend Flowers.
- Barn: animal care/collect actions plus a `More` section for upgrades.
- Workshop: Craft plus `More` for upgrades/permanent tools.
- Storage: inventory summary plus `More` for upgrades.
- Existing move/rotate/remove builder toolbar remains separate when editing placement.

## Non-goals

- No new gameplay modes.
- No avatar movement/WASD.
- No new currency/economy.
- No rewrite of HexWorld persistence or living-homestead engine.
- No heavy new 3D post-processing.
