# Premium Cozy MMORPG Explore Redesign

## Goal

Transform Narinyland's current person-scale Explore mode from a prototype-looking close camera into a polished cozy stylized MMORPG presentation based on the approved **A — Cozy Stylized MMORPG** preview direction.

The redesign must preserve the existing Hex World persistence, World/build mode, farming, building placement, land expansion, Homestead Life state, and server APIs. The work is a visual/gameplay-presentation overhaul of Explore mode, not a backend rewrite.

The preview image is an **art-direction target**, not a requirement for pixel-identical reproduction. The implementation should achieve the same qualities: warm stylized character proportions, lush readable ground, richer cottage architecture, denser environmental storytelling, attractive atmospheric depth, and a restrained MMORPG HUD.

## Product Experience

Narinyland continues to expose two complementary views:

1. **World mode** — elevated floating-island builder/diorama mode. Existing placement, moving, farming, expansion, selection, and overview behavior remains authoritative and visually recognizable.
2. **Explore mode** — person-scale cozy MMORPG mode. This becomes the premium presentation path: the player should feel like they are walking inside their homestead rather than moving a primitive avatar over visible hex cylinders.

Explore mode must feel materially different from World mode without creating a second source of game state.

## Approved Art Direction

The target direction is **Cozy Stylized MMORPG**.

Visual principles:

- Warm storybook-fantasy rather than anime or realism.
- Human characters have appealing stylized proportions, clear silhouette, layered clothing, hair and accessories.
- Ground is lush and continuous-looking at player height; the hex grid remains the simulation layer but should not dominate the visual surface.
- Buildings have readable human-scale doors, windows, roof layers, trims, porches and props.
- Vegetation is dense enough to frame paths and structures, but still bounded for performance.
- Lighting is warm, soft and directional with atmospheric depth.
- Floating-island identity stays visible through distant sky islands, cliffs and clouds.
- UI is game-like and lightweight, not a dashboard.

## Why the Current Explore Mode Looks Weak

The existing mode is structurally correct but visually too close to an engineering prototype:

- The player is assembled from a small set of capsules, spheres, cylinders and boxes with only vertical bob as locomotion feedback.
- Buildings are designed primarily for the elevated diorama camera and read as simple box/cone compositions at person height.
- Ground is represented by repeated hex cylinders with sharp cell boundaries that become visually obvious from the player camera.
- Environment dressing is sparse at eye level.
- Lighting is serviceable for overview mode but lacks enough ground-level depth and separation.
- The camera is functional but not composed like a polished third-person cozy RPG camera.
- The toolbar still inherits too much builder-era layout language.

The redesign addresses those causes rather than hiding them behind bloom or heavy postprocessing.

## Architectural Strategy

Keep one authoritative Hex World and add an **Explore Presentation Layer**.

### Existing systems remain authoritative

- `HexWorldSnapshot` remains the source of tiles/buildings/expansions.
- `HomesteadLifeState` remains the source of living-world state.
- `HexBuildController` continues to own `world` / `person` view-mode switching.
- `HexDioramaCamera` remains World mode only.
- `HexPlayerController` continues to own local traversal and camera-relative movement.
- Existing building keys, terrain types and world coordinates remain unchanged.

### Explore-specific presentation components

Introduce or refactor components so Explore mode can use richer visuals without contaminating World mode contracts:

- `HexExploreAvatar` / upgraded `HexPlayerAvatar` — modular stylized humanoid renderer and animation state.
- `HexExploreGroundLayer` — person-scale surface dressing that visually bridges individual hex cells.
- `HexExploreEnvironmentLayer` — bounded grass, flowers, shrubs, stones, edge foliage and path accents.
- `HexExploreStructureDetails` — optional person-scale detail pass layered around existing building anchors.
- `HexExploreAtmosphere` — Explore-specific fog/depth/cloud framing and subtle light accents.
- `HexExploreHUD` — compact RPG HUD composition using existing state/actions.

The existing base geometry may remain underneath these layers for collision, selection and World mode rendering.

## Player Character Redesign

The current avatar must be replaced visually while retaining the same controller boundary.

### Character silhouette

Target an appealing stylized adventurer approximately consistent with existing adult family-member scale, with:

- Separate torso, pelvis, upper/lower legs and upper/lower arms.
- Hands and boots with readable volume.
- Layered tunic/jacket, belt, scarf/hood or collar, backpack and optional small pouch.
- Hair built from several overlapping forms rather than one cap sphere.
- Head slightly larger than realistic human proportion, but not chibi.
- Clear front/back silhouette.

No external paid asset dependency is required for this pass. The character should remain procedural/local so deployment stays self-contained. Component boundaries must allow replacing it with a GLB avatar later without rewriting movement code.

### Animation

Implement real transform-based locomotion rather than whole-body bob only:

- Idle: breathing/weight shift and very subtle head/shoulder motion.
- Walk: opposing arm/leg swing, foot lift, torso counter-rotation and mild vertical pelvis movement.
- Rotation: smoothly orient body toward motion heading.
- Reduced motion: disable decorative breathing/bob while preserving essential orientation and leg movement enough to communicate locomotion.

Do not add sprint, jump, combat or emotes in this pass.

## Camera Redesign

Explore camera should feel like a cozy third-person RPG camera rather than OrbitControls pointed at a moving target.

Targets:

- Player remains in the lower-middle portion of the screen instead of exact center.
- Default distance approximately `3.4-4.2` world units.
- User zoom remains approximately `2.6-5.2` world units.
- Target height sits around upper torso/head level.
- Lower pitch than World mode, preserving visibility of paths and nearby props.
- Damped follow and camera-target movement.
- Camera yaw remains user-controlled by drag.
- Movement remains camera-relative.
- Prevent abrupt camera jumps on view-mode entry/reset.

A full obstacle-avoidance camera is out of scope. Building collision remains out of scope unless a cheap camera-only clipping mitigation can be added without introducing physics.

## Ground and Terrain Presentation

The simulation remains hex-based, but the surface should not visually read as a board game in Explore mode.

### Base strategy

Keep `HexTileInstances` as the authoritative base tile geometry. Add a separate Explore surface layer above unlocked non-water cells.

### Explore surface treatment

- Grass cells receive overlapping irregular turf/leaf patches with deterministic variation.
- Soil/garden cells receive softer dirt overlays, furrow accents and edge blending.
- Stone/path cells receive irregular stepping-stone clusters and small gaps with grass between them.
- Water edges receive stones, reeds/flowers and softened borders.
- Adjacent unlocked cells should visually overlap enough to hide most hard hex seams from player height.
- Decorative coverage must never change walkability or saved terrain state.

The hex pattern may remain visible from World mode and at island edges; it should simply stop dominating the person-scale view.

## Paths and Navigation Readability

Explore mode needs visual guidance through the homestead.

Without introducing persisted pathfinding data:

- Derive path accents deterministically from existing `stone_path` buildings/decor and important building anchors.
- Around Home, Garden, Pond, Workshop, Barn and Bench, create small local stepping-stone/packed-earth clusters that visually connect entrances to nearby walkable space.
- Never create gameplay shortcuts or move the player automatically.

This is presentation-only environmental storytelling.

## Building Redesign at Person Scale

Existing building keys and placement footprints stay unchanged.

### Base structures

Upgrade local structure models with richer layered construction:

- Human-readable door scale.
- Layered roof planes/shingles instead of one simple cone silhouette where practical.
- Roof eaves and fascia.
- Timber framing / stone foundation details.
- Window trim, sill and warm emissive interior plane.
- Porch/step/platform details.
- Chimney variation.
- Flower boxes, crates, barrels, benches, lantern posts or planters near entrances.
- Tier upgrades should add recognizable details without changing footprints.

### Explore detail overlay

Where rebuilding the base model would add too much complexity to World mode, use `HexExploreStructureDetails` anchored to the existing building transform. This allows eye-level detail to appear only in Explore mode while World mode stays performant and compositionally clean.

Do not change persistence, building footprint, rotation semantics or server building catalog behavior.

## Vegetation and Environmental Density

Explore mode should feel lush rather than empty.

Use deterministic, seeded decoration derived from world seed and tile coordinates.

### Layering

- Micro grass tufts near the camera.
- Small flowers and groundcover.
- Medium shrubs and rocks.
- Trees with fuller canopies and trunk/branch variation.
- Fences, lanterns and garden-edge decorations near relevant structures.
- Sparse floating pollen/firefly-like particles depending on time/season.

### Performance rules

- Repeated micro/medium vegetation must be instanced or batched.
- Density scales through the existing quality profile.
- Mobile uses a lower density and shorter decoration radius.
- Do not create one React component per grass blade.
- Avoid high-overdraw transparent cards where opaque geometry can work.

## Lighting and Atmosphere

Explore mode needs stronger visual depth while remaining lightweight.

### Lighting

- Keep one primary shadow-casting directional light.
- Rebalance hemisphere/ambient contribution so structures retain form and contrast.
- Warm directional key light with cooler sky fill.
- Warm local emissive windows/lanterns become more visible during evening conditions.
- Contact shadows should support near-ground grounding but not flatten the whole island.

### Atmosphere

- Add distance fog tuned for Explore mode.
- Distant floating islands/cloud shapes can frame the horizon with lower contrast.
- Subtle sky gradient and cloud parallax remain bounded.
- No mandatory EffectComposer, bloom, depth-of-field or other expensive postprocessing pipeline in this pass.

The target is visual depth through scene composition, materials, fog and lighting—not postprocessing dependency.

## Materials

Maintain the stylized look using mostly `MeshStandardMaterial` / simple local materials.

Guidelines:

- Use controlled roughness variation between wood, stone, foliage and painted surfaces.
- Increase value contrast between structural layers.
- Avoid everything sharing the same roughness and saturation.
- Use emissive accents sparingly for windows/lanterns.
- Keep material palette centralized through `visual-theme` or an Explore-specific extension rather than scattering arbitrary colors through every component.

## Explore MMORPG HUD

The selected preview includes an RPG-style bottom HUD, but Narinyland should not blindly copy a combat MMO layout because the current product is a cozy homestead game.

### Persistent Explore HUD

Desktop:

- Bottom-left compact player/status card: avatar icon or simple identity badge, Level, Energy and optionally Hearts.
- Bottom-center compact action strip for existing relevant actions only.
- Bottom-right small utility cluster: Bag, Goals/Journey, Map if/when useful, and World view return.

For this pass, do not invent combat HP/MP or skills that the game does not actually have.

### Existing data reuse

Use current Homestead Life values:

- Level / XP
- Energy
- Coins
- Hearts / Points where useful
- Bag
- Goals / Journey
- Music control

### World mode

Existing World toolbar remains builder-oriented. Explore HUD should not replace or redesign World mode unnecessarily.

### Mobile

- Keep controls inside safe areas.
- Do not add a virtual joystick in this pass.
- Continue to state clearly that movement requires a keyboard until touch movement is implemented.
- Camera orbit/look remains touch capable.

## NPC and Living-World Presentation

Existing family/NPC/animal behavior remains authoritative.

Enhance visual coherence at person height by:

- Reusing the improved stylized material/proportion language where feasible.
- Adding small ground shadows and better local placement offsets.
- Avoiding duplication of authoritative living positions.

A full NPC model/animation rewrite is optional within this pass only if it can share modular character primitives with the player without broadening scope significantly.

NPC dialogue, quests and online players remain out of scope.

## Island Edge and Floating-World Identity

Person mode must still feel like Narinyland's floating homestead.

At player height:

- Island edges should show layered soil/rock rather than a single abrupt extrusion where practical.
- Edge vegetation, hanging roots or small rock ledges can soften the boundary.
- Distant floating land silhouettes and clouds should be visible in selected camera directions.
- The player remains blocked by unlocked-tile movement rules and cannot walk off the island.

Do not introduce invisible-wall persistence or physics bodies.

## Quality Profiles

Extend the existing quality profile rather than creating an independent graphics-settings system.

Suggested Explore budgets:

### Mobile / Low

- Reduced micro foliage density.
- Fewer structure detail props.
- Shorter decoration radius.
- Existing bounded DPR and shadow map sizes.
- Minimal decorative particles.

### Medium

- Full intended baseline density.
- Moderate structure detail.
- Medium fog/atmosphere complexity.

### High

- Higher deterministic foliage density.
- Additional small structure props and flower clusters.
- Slightly richer particle/atmosphere density.
- Still bounded; no unbounded per-frame allocations.

## Motion and Accessibility

Respect the existing reduced-motion resolver.

Reduced motion should:

- Disable decorative idle sway/breathing where possible.
- Reduce plant wind amplitude.
- Reduce decorative particles.
- Keep essential walking limb movement and camera tracking understandable.
- Avoid camera flourish when entering Explore mode.

Keyboard movement must still ignore editable controls.

## Data and Persistence

No new database schema is required.

No Explore decoration is persisted.

All new environment placement is deterministic from existing data such as:

- world seed
- tile coordinate
- terrain type
- building key / anchor / rotation
- season / weather / time
- quality profile

This avoids divergence between client presentation and server state.

## Non-Goals

This visual overhaul does **not** add:

- Multiplayer synchronization
- Remote players
- Chat
- Combat
- HP/MP systems
- Skills/spells
- Quests
- NPC dialogue
- Mounts
- Sprint/stamina
- Jumping
- Physics engine
- Building interiors
- Persisted navigation mesh
- Touch joystick
- Character customization
- Mandatory third-party 3D asset pipeline
- Heavy postprocessing stack

Those are separate product initiatives.

## Expected Files / Boundaries

Likely new modules:

- `components/hex-world/HexExploreGroundLayer.tsx`
- `components/hex-world/HexExploreEnvironmentLayer.tsx`
- `components/hex-world/HexExploreStructureDetails.tsx`
- `components/hex-world/HexExploreAtmosphere.tsx`
- `components/hex-world/HexExploreHUD.tsx`
- `lib/hex-world/explore-decoration.ts`
- `lib/hex-world/explore-style.ts`

Likely modified modules:

- `components/hex-world/HexPlayerAvatar.tsx`
- `components/hex-world/HexPlayerController.tsx`
- `components/hex-world/HexWorld3D.tsx`
- `components/hex-world/HexGameplayOverlay.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `components/hex-world/models/HexStructureModels.tsx`
- `lib/hex-world/quality.ts`
- `lib/hex-world/visual-theme.ts`

The exact implementation plan may refine these boundaries after source inspection, but it must preserve separation between World mode and Explore-only presentation.

## Testing Strategy

Add deterministic contract/unit coverage for:

1. Explore decoration generation is deterministic for a given seed/coordinate.
2. Decoration density is bounded by quality profile.
3. Explore ground/environment layers render only in person mode.
4. World mode still uses existing Hex tile/building presentation without requiring Explore overlays.
5. Player avatar exposes idle/walk animation structure and reduced-motion behavior.
6. Explore camera remains within approved distance/pitch ranges and movement remains camera-relative.
7. Existing unlocked-tile traversal protection remains intact.
8. Explore HUD uses real Homestead Life data/actions and does not invent combat state.
9. Existing builder, placement, expansion, undo, living-world and rendering regression suites remain green.
10. Production build and runtime smoke remain green.

## Manual Visual Acceptance

Desktop Explore mode should be manually checked for:

- The player silhouette looks like a designed game character, not primitive debug geometry.
- Walking reads as walking through limb motion rather than whole-body bobbing.
- The first 5-10 meters around Home feel lush and intentionally composed.
- Hex seams are substantially de-emphasized at normal third-person distance.
- Home/Workshop/Barn read as human-scale structures with layered detail.
- Paths, crop beds, pond and vegetation have clear local depth.
- Player remains visually separated from the background.
- Warm/cool lighting creates depth without washed-out colors.
- Floating-island/cloud identity is visible beyond the homestead.
- Explore HUD feels like a cozy RPG game HUD and leaves the center of the screen open.
- Switching to World mode restores the existing builder experience with no visual interaction regressions.

Mobile should be checked for:

- Safe-area compliance.
- Stable performance under low/mobile quality profile.
- No oversized HUD collision.
- Camera orbit works.
- Keyboard-only movement limitation remains clearly communicated.

## Success Criteria

The redesign is complete when:

- Explore mode no longer reads as a primitive/prototype scene at normal gameplay distance.
- The player has a polished stylized humanoid silhouette with recognizable idle/walk animation.
- The ground appears substantially more continuous and organic than raw repeated hex cylinders.
- Major structures have enough human-scale detail to hold up from the third-person camera.
- The immediate homestead contains layered foliage/props/path details comparable in density and warmth to the approved Cozy Stylized MMORPG direction while remaining performant.
- Lighting/fog/environment composition creates clear foreground, midground and background depth.
- The HUD communicates real Narinyland progression and utilities in a game-like composition without fake combat systems.
- World/build mode behavior remains unchanged functionally.
- Existing server schema and APIs remain unchanged.
- Full repository CI, lint, production build and runtime smoke pass.
