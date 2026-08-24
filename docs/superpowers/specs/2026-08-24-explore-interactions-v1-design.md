# Explore Interactions v1 Design

Date: 2026-08-24
Status: Approved design, pending written-spec review
Branch: `feat/explore-interactions-v1`

## Goal

Make person-scale Explore feel like an actual MMORPG-style game loop by letting the player approach existing homestead objects and intentionally interact with them, without introducing a second gameplay/economy authority.

The first pass covers stationary building/resource interactions only. Moving family members, child, pet, livestock conversations, quests, combat, dialogue trees, persisted player position, and new backend state are explicitly out of scope.

## Player Experience

### Targeting

While `viewMode === 'person'`, the player controller evaluates nearby existing Hex buildings/resources using the player's authoritative Explore position.

A target is eligible only when:
- the building has a non-null `LivingBuildingRole` from `getLivingBuildingRole`, and
- the player is within the interaction radius.

Interaction radius: **1.7 world units** from the player X/Z position to the building anchor X/Z position.

If multiple eligible targets are in range:
1. choose the smallest horizontal distance,
2. break exact-distance ties deterministically by building id.

The selected target is reported to React state only when its building id changes, so per-frame movement does not cause per-frame React rerenders.

Leaving range clears the target immediately.

### Prompt

When an eligible target is in range and no blocking Explore surface is open:
- Desktop shows a compact contextual prompt centered above the lower HUD:
  - `E  Interact`
  - target display name, e.g. `Garden Patch`
- Mobile shows one contextual `Interact` button near the existing right-side Explore utility controls.

The prompt must never cover or replace the existing left joystick.

The prompt is hidden when:
- Explore is not active,
- the player has no target in range,
- Bag is open,
- Goals/HUD panel is open,
- the interaction panel is already open,
- another blocking overlay disables normal Explore interaction.

### Activation

Desktop:
- `E` opens the current target.
- Editable inputs/textareas/select/contenteditable must never be hijacked.
- Holding `E` must not repeatedly trigger the same interaction; key repeat is ignored.

Mobile:
- Tapping the contextual button opens the current target.
- The button owns only its own pointer/touch stream and does not trigger camera drag.

If the target disappears or goes out of range before activation, activation does nothing.

## Reuse Existing Gameplay Actions

The interaction system does **not** create new gameplay actions.

It reuses `getLivingBuildingRole` and the existing quick/deep action panels so the same authoritative `HomesteadLifeAction` flow remains in control.

Role-to-existing-experience mapping:
- `garden` -> Plant / Water / Harvest
- `pond` -> Fish
- `forage` -> Forage
- `family` -> Family Time
- `flowers` -> Tend Flowers
- `home` -> Sleep / end day
- `barn` -> existing Barn care/details
- `workshop` -> existing Craft/details
- `storage` -> existing Inventory/details

No new API routes, Prisma models, database columns, economy counters, or duplicated action reducers are introduced.

## Interaction Panel Behavior

Activating a proximity target opens the existing `HexQuickActionPanel` for that building in Explore mode.

The existing `More` path continues into `HexLivingActionPanel` where applicable.

While either quick or deep interaction panel is open:
- touch movement input is reset to zero,
- keyboard movement is ignored,
- the joystick is disabled/hidden,
- the proximity prompt is hidden,
- the player remains in `person` view mode,
- the world/camera remains visible behind the panel,
- closing the panel returns directly to Explore at the same player/camera position.

Opening Bag or Goals closes any active proximity interaction panel. Opening a proximity interaction closes Bag/Goals first so there is only one primary blocking surface.

Switching to World, entering Build/Farm/Expand/Move, switching Land, or resetting Explore view clears both the active proximity target and any active interaction panel.

## Architecture

### 1. Pure proximity resolver

New module: `lib/hex-world/explore-interactions.ts`

Responsibilities:
- define `HexExploreInteractionTarget`,
- map building anchors into world X/Z coordinates,
- filter to buildings with existing living roles,
- select nearest target within 1.7 units,
- deterministic tie-breaking,
- return `null` when none are eligible.

This module must remain DOM-free, R3F-free, and side-effect-free.

### 2. Player controller reporting

`components/hex-world/HexPlayerController.tsx`

Add an optional callback such as `onInteractionTargetChange`.

During the existing `useFrame` loop, after player position is resolved:
- call the pure resolver against the current player position and buildings,
- compare selected building id against a ref,
- invoke callback only when the selected id changes.

The controller remains the source of the real Explore position; React does not own a second player-position state.

### 3. R3F-to-React wiring

`components/hex-world/HexWorld3D.tsx`

Pass the callback only into the person-controller path. World/diorama mode remains untouched.

### 4. Controller ownership

`components/hex-world/HexBuildController.tsx`

Own:
- `exploreInteractionTarget`
- `exploreInteractionOpen`

Clear both across all existing lifecycle boundaries that already clear Explore movement: Land switch, view-mode changes, build/farm/expand/move transitions, and reset.

Continue using the existing shared movement ref introduced by mobile Explore controls; interaction surfaces must zero that same ref rather than create another movement lock.

### 5. Overlay coordination

`components/hex-world/HexGameplayOverlay.tsx`

Receive current interaction target and open/close callbacks.

In person mode:
- render `HexExploreInteractionPrompt` only when no primary blocking surface is open,
- render existing `HexQuickActionPanel` / `HexLivingActionPanel` for the active proximity building,
- coordinate Bag/Goals/interaction so only one primary panel is active,
- expose whether Explore movement should be suspended through the same shared movement-input path.

World-mode building-selection behavior remains unchanged.

### 6. Prompt component

New component: `components/hex-world/HexExploreInteractionPrompt.tsx`

Responsibilities:
- desktop keyboard `E` affordance and keyboard listener,
- mobile contextual button,
- safe-area placement,
- display target name derived from the existing role/building definition rather than a parallel label catalog where possible,
- pointer isolation for the button,
- no gameplay mutations itself; it only requests `onInteract`.

## Error and Edge Handling

- No target: render nothing.
- Unsupported building role: never becomes a target.
- Target removed while panel is open: close the interaction panel and clear target.
- Target goes out of range while panel is open: keep the current panel open until the user closes it; movement is suspended so range cannot change through player movement.
- Action failure: existing `useLivingHomestead` / toast error behavior remains authoritative.
- Reduced motion: no special interaction behavior is required; prompt transitions should avoid mandatory animation.
- Mobile pointer cancellation, browser blur, mode change, and component unmount must leave shared movement input at zero.

## Accessibility and Input Safety

- `E` must ignore editable controls.
- Mobile button minimum target size: 44x44 CSS px.
- Prompt copy must not rely only on iconography.
- Button uses an accessible label including target name.
- Pointer handlers stop propagation only on the interaction control itself so the rest of the canvas still supports drag/pinch camera controls.

## Performance Constraints

- No raycast-every-frame target discovery.
- No persisted player coordinates.
- No React state update every frame.
- Pure proximity scan is over the existing small building list and runs in the already-existing player frame loop.
- Callback fires only on target identity changes.
- No new postprocessing, physics engine, navigation mesh, or spatial-index dependency in v1.

## Testing / Acceptance

### Pure tests

Add `tests/hex-explore-interactions.test.ts` covering:
- no eligible target returns null,
- nearest eligible target within 1.7 units wins,
- target outside radius is ignored,
- unsupported building type is ignored,
- exact-distance ties resolve by building id,
- height/Y does not affect horizontal targeting.

### Contract/integration tests

Add or extend Hex contract tests covering:
- player controller reports target only from person mode path,
- callback is change-gated by target id,
- overlay renders proximity prompt in Explore only,
- prompt supports `E` while ignoring editable controls and key repeat,
- mobile prompt has a 44px minimum target and pointer isolation,
- proximity interaction reuses `HexQuickActionPanel` and `HexLivingActionPanel`,
- movement is suspended/reset behind an open interaction panel,
- Bag/Goals and proximity interaction remain mutually exclusive,
- World/build/farm/expand/move/Land/reset transitions clear proximity interaction state,
- existing World selection UX remains unchanged.

### Full verification gate

Use the existing Hex Homestead CI on the exact final branch head:
- dependency/security gate,
- Prisma validate and migrations,
- security regressions,
- full Hex/Garden/startup pure suite,
- Hex Undo DB/Redis integration,
- existing farm regression,
- lint,
- production build,
- production runtime smoke.

## Non-goals for v1

Do not add:
- NPC/family dialogue,
- pet/animal proximity interaction,
- quests,
- combat,
- multiplayer proximity,
- persisted player position,
- collision/navmesh/physics,
- new economy or inventory systems,
- new API or database persistence,
- tap-to-select Explore objects as a second interaction path.

## Follow-up

After v1 is stable, the next MMORPG pass should expose deterministic live family/pet/animal positions as interaction targets and add lightweight conversation/affection actions without coupling those moving entities to the static building-target resolver.