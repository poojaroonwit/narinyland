# MMORPG Person-Scale Exploration Design

## Goal

Add a person-scale third-person exploration mode to Narinyland's floating hex homestead while preserving the existing elevated builder/diorama mode. The result should feel like a cozy MMORPG village when walking through the world, without rewriting the existing land, building, farming, or living-world systems.

## Product Experience

Narinyland will support two complementary world views:

1. **World mode** — the existing elevated diorama/building experience used for placing, moving, rotating, farming, expanding land, and inspecting the whole island.
2. **Person mode** — a third-person exploration experience at human scale, centered on a controllable player avatar walking through the unlocked homestead.

The player can switch between the two modes from the gameplay UI. World mode remains the default when construction workflows require it. Person mode is optimized for exploration and immersion rather than editing the island.

## Person Scale

The existing family-member visuals establish the scale reference for the player. Adult family members are roughly one world unit tall, so the new avatar and camera should preserve that relationship rather than enlarging buildings or terrain.

Initial tuning targets:

- Adult player visual scale: approximately the existing adult family-member scale.
- Camera target height: approximately `0.75-0.9` world units above the player's feet.
- Third-person camera distance: approximately `2.5-5` world units.
- Camera pitch: lower than the existing diorama camera, with enough downward angle to read terrain immediately around the player.
- Near zoom should feel close to over-the-shoulder without becoming a full first-person system.

These values are tuning targets, not public configuration values.

## Architecture

Person mode must be implemented as a separate player/controller path rather than overloading `HexDioramaCamera` with movement responsibilities.

### New responsibilities

- `HexPlayerController` owns player position, heading, keyboard input, movement smoothing, unlocked-land constraints, and the third-person camera target.
- `HexPlayerAvatar` renders the local player using the same low-poly visual language as the family members.
- A small mode-switch control exposes `World` and `Explore`/`Person` modes.
- `HexWorld3D` chooses between the existing `HexDioramaCamera` and the new player controller based on the current view mode.

### Existing responsibilities preserved

- `HexDioramaCamera` remains responsible only for overview, focus, and build-camera intents.
- The existing tile/building rendering remains unchanged unless a specific interaction requires person-mode awareness.
- The living-world system remains the source for NPC/family/animal motion.
- Build state and server-side world state remain unchanged by walking around.

## View Mode State

`HexBuildController` owns a local view-mode state:

```ts
type HexViewMode = 'world' | 'person';
```

Rules:

- Default to `world` when the garden opens.
- The user may enter `person` mode only when the build controller is idle.
- Starting build, move, expansion, or another placement workflow automatically returns to `world` mode.
- Returning to `world` mode restores the existing overview camera behavior.
- Reset-view in person mode resets the player/camera to a safe spawn position; reset-view in world mode keeps the current overview reset behavior.

## Spawn Position

Person mode needs a deterministic safe spawn.

Priority:

1. Tile containing the `home` building anchor, when available and unlocked.
2. Unlocked tile nearest the unlocked island center.
3. First unlocked tile.
4. Origin fallback only when no unlocked tile is available.

The player should spawn slightly above the tile surface and settle to the tile's current height.

## Movement

Desktop controls:

- `W` / Up Arrow: forward
- `S` / Down Arrow: backward
- `A` / Left Arrow: strafe left
- `D` / Right Arrow: strafe right
- Mouse/touch drag: orbit camera around the player
- Mouse wheel/pinch: third-person camera distance within safe bounds

Movement is camera-relative so forward means the direction the camera is facing on the horizontal plane.

The avatar rotates toward movement direction with smoothing.

Movement speed should be calibrated for the hex scale so crossing a tile takes roughly one second at normal speed. Do not add sprint, stamina, jumping, combat, mounts, or networking in this change.

## Walkable Bounds

The first version uses unlocked tile occupancy as the walkable constraint.

- Convert the proposed world-space player position back to an axial coordinate.
- Permit movement only when the resolved hex tile exists and is unlocked.
- Clamp or reject movement that would leave unlocked land.
- Do not allow the player to fall from the floating island.
- Building collision is out of scope for the first pass; the player may walk close to or through decorative collision volumes until a dedicated navigation/collision layer is introduced.

This deliberately favors safe traversal and implementation simplicity over a full physics engine.

## Camera

Person mode camera behavior:

- Perspective camera remains the existing R3F camera.
- Camera orbits around the player rather than the island center.
- Keep a lower polar-angle range suitable for third-person play.
- Camera target follows the player with damping.
- Camera distance is constrained to a close third-person range.
- Camera state must not mutate the saved world.

World mode continues to use the current scripted `HexDioramaCamera` poses.

## Player Avatar

The first player avatar should be an internal low-poly model assembled from Three.js primitives, visually aligned with `FamilyMemberVisual`.

Requirements:

- Adult proportions consistent with existing family members.
- Casts shadows.
- Has a clear forward direction.
- Subtle walk bob while moving; idle stance when stationary.
- No external avatar assets or new asset-loading dependency.
- No character customization in this change.

A future avatar system can replace this component behind the same controller boundary.

## Gameplay UI

Add one compact mode control to the existing world toolbar or adjacent gameplay control cluster.

Behavior:

- World mode label/icon communicates overview/building.
- Person mode label/icon communicates exploration.
- Entering person mode closes inventory/details/goals sheets if necessary and clears building selection.
- Person mode hides or disables builder-only actions that would create ambiguous interactions while walking.
- Core lightweight HUD information remains visible.
- Inventory/goals can remain reachable if they do not interfere with movement controls.

Mobile remains supported for viewing and camera orbit, but a dedicated virtual joystick is out of scope for this first pass. The UI must not falsely present keyboard-only movement as fully mobile-playable.

## Interaction Boundaries

This change does not add MMORPG networking or social systems. "MMORPG-style" refers to perspective, human-scale traversal, and UI feel.

Out of scope:

- Multiplayer synchronization
- Other online players
- Chat
- Combat
- Quests
- NPC dialogue
- Building interiors
- Physics-based collision
- Jumping
- Sprint/stamina
- Mounts
- Character customization
- First-person rendering

These may be layered later on the player-controller boundary created here.

## Accessibility and Motion

- Respect the existing reduced-motion preference.
- Reduced motion disables decorative avatar bob and uses stronger/shorter camera settling instead of continuous flourish.
- Keyboard movement must not activate while focus is inside form fields, editable content, modal controls, or other text-entry UI.
- Existing pointer interactions in world mode must continue to work unchanged.

## Testing

Add deterministic unit/contract coverage for:

1. Safe spawn selection priority.
2. Camera-relative movement direction.
3. Rejection of movement onto locked/missing tiles.
4. View-mode transitions back to `world` when build/move/expand workflows start.
5. Person mode renders the player controller while world mode renders the diorama camera.
6. Existing camera tests continue to pass.
7. Existing hex-world rendering and gameplay regression tests continue to pass.

Manual verification should cover:

- Enter person mode from idle world view.
- Walk around the starting island with WASD/arrows.
- Orbit and zoom the third-person camera.
- Confirm player cannot leave unlocked land.
- Switch back to world mode and confirm the existing overview camera returns.
- Start build/farm/expand flows and confirm construction UX is unchanged.
- Verify layout at desktop and narrow viewport sizes.

## Success Criteria

The feature is complete when:

- A user can toggle from the current world view into a human-scale third-person view.
- The player can move smoothly across unlocked land with camera-relative controls.
- Camera and avatar scale make existing buildings, crops, animals, and family members feel appropriately sized around the player.
- The player cannot walk off the unlocked island.
- Switching back restores the current builder/diorama experience with no regression to placement and expansion workflows.
- No new backend schema or multiplayer service is required.
