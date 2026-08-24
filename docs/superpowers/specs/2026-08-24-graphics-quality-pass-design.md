# Narinyland Premium Graphics Quality Pass — Design

**Date:** 2026-08-24

## Goal

Upgrade the current Narinyland floating-hex homestead from a clean procedural prototype into a **premium handcrafted floating miniature** while preserving the existing renderer architecture, gameplay authority, mobile performance strategy, and cozy visual identity.

The target is not realism. The target is a readable stylized diorama: warm materials, stronger contact and depth, richer silhouettes, more distinctive crops and vegetation, more believable water, a more cohesive building family, and atmosphere that responds gently to the living-homestead state.

## Current Renderer Baseline

The current world is already split into focused visual systems:

- `HexWorld3D.tsx` composes the scene.
- `HexTileInstances.tsx` renders instanced hex terrain with deterministic color variation.
- `HexWorldLighting.tsx` owns hemisphere, ambient, directional, and contact lighting.
- `HexIslandUnderside.tsx` renders the floating-rock underside.
- `HexAmbientDecor.tsx` renders instanced trees, flowers, garden sprouts, rocks, and paths.
- `HexWaterSurface.tsx` renders animated instanced water plus limited glints.
- `HexSkyAtmosphere.tsx` owns background, fog, and low-cost moving clouds.
- `HexStructureModels.tsx`, `HexNatureModels.tsx`, and `HexDecorModels.tsx` provide procedural low-poly buildings and props.
- `HexLivingWorldLayer.tsx` projects crops, weather, seasons, family, and animals into the scene.
- `HexDioramaCamera.tsx` and `lib/hex-world/camera.ts` provide the smart diorama camera.
- `lib/hex-world/quality.ts` already defines high / medium / mobile budgets.

This is a strong base. The graphics pass should improve the internals of those modules instead of replacing them.

## Chosen Approach

### Approach B — richer procedural geometry, materials, lighting, and atmosphere

Use the current React Three Fiber / Three.js procedural system and keep repeated content instanced. Improve visual richness through deterministic geometry variation, better palettes/material values, edge dressing, stronger silhouettes, subtle emissive accents, layered water, and living-state-aware atmosphere.

This is preferred over:

- **Shader-heavy/post-processing rewrite:** visually powerful but increases GPU cost, debugging cost, and mobile risk.
- **Imported GLB asset-pack replacement:** can improve fidelity but creates loading, authoring, consistency, and asset-management complexity that the current game does not need yet.

No mandatory `EffectComposer`, bloom, depth-of-field, screen-space AO, SSR, or reflection pipeline will be introduced.

## Visual Direction

### Style

- Premium handcrafted miniature.
- Softly stylized, not realistic.
- Slightly chunky proportions so buildings and crops read at the default camera distance.
- Warm wood / terracotta / cream structures, muted natural greens, restrained accent colors.
- Materials stay mostly matte with small controlled highlights.
- Hex structure remains readable, but the environment should visually soften the board-game feel.

### Scene hierarchy

1. Homestead buildings and active crops are the focal layer.
2. Terrain and vegetation support those objects.
3. Floating underside, mist, clouds, and distant fragments create depth.
4. UI and gameplay indicators remain visually separate from scene dressing.

## Scope

### 1. Shared visual theme

Create `lib/hex-world/visual-theme.ts` with reusable presentation constants and pure helpers:

- terrain palettes and roughness ranges;
- structure wall / roof / wood / trim palettes;
- vegetation palettes;
- water colors;
- atmosphere colors;
- controlled emissive values;
- deterministic presentation variation helpers;
- pure crop-visual-stage mapping.

This centralizes art direction and prevents different scene modules from drifting into unrelated colors/materials.

The module must contain presentation data only. It must not depend on persistence, economy, gameplay state transitions, or APIs.

### 2. Small visual-environment projection

Create `lib/hex-world/visual-environment.ts` to isolate living-state presentation from renderer components.

It exposes a small presentation type such as:

```ts
type HexVisualEnvironment = {
  season: FarmSeason | null;
  weather: string | null;
  timePhase: 'morning' | 'day' | 'evening' | 'night';
};
```

`HexWorld3D` derives this object from optional `HomesteadLifeState` and passes only the visual environment to `HexSkyAtmosphere` and `HexWorldLighting`.

The projection is one-way and pure. Atmosphere and lighting must not import the homestead engine or mutate gameplay state.

### 3. Terrain surface richness

Keep `HexTileInstances` as the authoritative instanced terrain renderer.

Improve it by:

- increasing deterministic hue/value variation without making adjacent tiles noisy;
- separating grass / soil / stone / water roughness and tone more clearly;
- retaining existing selected / hovered / valid / invalid presentation states;
- keeping one instanced mesh per terrain family.

Add a lightweight presentation-only `HexTerrainDetails.tsx` layer that derives extra visual marks from existing unlocked tiles without writing metadata:

- small dirt/stone flecks;
- sparse grass tufts;
- moss/ground accents on suitable terrain;
- subtle soil-row accents where appropriate.

All detail placement must be deterministic from world seed + coordinates. Density must scale through `profile.ambientDensity`.

The layer must use a small fixed number of instanced batches, not one React mesh per detail.

### 4. Floating-island silhouette and underside

Replace the current center-ring look of `HexIslandUnderside` with a silhouette derived from the actual unlocked island.

Presentation behavior:

- identify unlocked boundary tiles from neighboring coordinates;
- place instanced rock chunks under boundary sections;
- add a smaller bounded central-core cluster beneath the island;
- introduce deterministic scale/rotation/depth variation;
- add sparse moss/root accents at the upper perimeter on medium/high quality;
- keep the underside clearly below gameplay collision and interaction space.

`HexIslandUnderside` may accept `profile` in addition to existing tiles/seed so optional detail remains quality-bounded.

The island should read as one floating landmass rather than a flat board above unrelated rocks.

No terrain persistence or tile-height mutation is allowed.

### 5. Lighting and contact depth

Update `HexWorldLighting` to strengthen miniature depth while keeping the current single primary shadow owner.

Direction:

- warm main sun;
- cooler hemisphere/fill;
- slightly stronger contact darkening around buildings and terrain contact points;
- tuned shadow bias/normal bias to improve contact without acne;
- small color/intensity shifts from `HexVisualEnvironment`;
- profile-controlled contact shadow resolution stays intact.

Performance rule: keep one shadow-casting directional light. Do not add multiple dynamic shadow lights.

### 6. Vegetation and natural dressing

Upgrade `HexAmbientDecor` while preserving instancing and motion buckets.

Trees:

- maintain one trunk batch per motion bucket;
- replace single-canopy blobs with 2–3 deterministic canopy-lobe batches;
- vary canopy scale, offset, and green palette by coordinate;
- preserve bounded sway.

Flowers and grass:

- add 2–4 deterministic small silhouettes/palettes rather than one repeated pink flower;
- add sparse grass tufts through the visual-only terrain-detail layer;
- avoid uniform density.

Rocks and paths:

- add slight deterministic scale/rotation/value variation;
- make path stones less perfectly identical.

No new gameplay resources or harvestables are introduced by these visual decorations.

### 7. Water and pond treatment

Upgrade `HexWaterSurface` with a layered but low-cost treatment:

- keep the current instanced base water surface;
- tune base color/transparency/roughness by quality tier;
- add a second bounded highlight/ripple layer only for medium/high;
- animate ripple/glint scale or opacity slowly using shared motion budgets;
- keep glint counts controlled by `profile.waterGlintCount`;
- avoid real-time reflection/refraction.

Upgrade the `pond` model in `HexNatureModels` with fixed, bounded local geometry:

- clearer shoreline ring;
- a few reeds;
- one or two lily-pad shapes;
- better rock placement and silhouette.

Pond model detail remains small enough to render on every quality tier, avoiding a new quality prop through the building-model hierarchy. Terrain-water detail remains quality-controlled in `HexWaterSurface`.

### 8. Building art-family cohesion

Keep structures procedural and local.

Update `HexStructureModels` so Home, Barn, Storage, and Workshop share a coherent construction language:

- thicker roof silhouette and consistent roof overhang;
- visible foundation/plinth;
- shared beam/trim thickness;
- consistent window frame language;
- slightly exaggerated doors/windows for default-camera readability;
- small role-specific props: crate/hay/tool/planter/chimney details;
- tier decorations remain additive and clearly readable.

Use shared helper components for repeated trim/window/foundation/roof-detail primitives where that reduces duplication.

Window/lamp emissive accents stay bounded and local; the first pass does not thread time-of-day props through every building model.

Do not introduce remote model URLs or external asset loading.

### 9. Garden and crop graphics

Garden graphics are the hero of the active loop.

Upgrade `garden_patch` and crop rendering:

- make the tilled base visibly darker and warmer than normal soil;
- introduce cleaner row/furrow geometry;
- distinguish empty, watered, growing, and ready states visually;
- watered ground becomes slightly darker/cooler, not a bright water decal;
- crop height and leaf/fruit composition scales through progress;
- use crop-specific silhouettes in addition to color differences;
- harvest-ready crops gain a very subtle presentation-only emphasis (small scale/bob/emissive accent), not a large UI marker.

Visual crop stages:

- 0–0.24: sprout;
- 0.25–0.54: young plant;
- 0.55–0.84: mature plant;
- 0.85–1.0: harvest-ready silhouette.

The exact gameplay readiness threshold remains authoritative in the existing homestead engine. The stage ranges are visual interpolation only and must not determine game actions.

### 10. Living atmosphere

`HexSkyAtmosphere` and `HexWorldLighting` receive only `HexVisualEnvironment`.

Presentation effects:

- small background/fog temperature shifts by season/time;
- rain makes the scene slightly cooler/darker while retaining existing bounded rain effects;
- sunny conditions remain warmer;
- evening/night uses slightly cooler environment light while existing building emissives become more visually prominent by contrast;
- lower-island mist/clouds remain slow and bounded.

Atmosphere never changes gameplay state.

### 11. Camera composition

Keep the smart camera system and orbit controls.

Tune `lib/hex-world/camera.ts` and/or `HexDioramaCamera` only enough to improve miniature composition:

- slightly more lateral and slightly less top-down default overview;
- focus poses retain more island context rather than zooming tightly;
- build pose stays more top-down than overview for placement clarity;
- preserve portrait penalty and mobile framing;
- preserve current no-pan interaction model.

Do not add cinematic camera takeover during normal play.

### 12. Placement and reward feedback

Keep existing placement effects and expansion-rise system.

Graphics pass may improve:

- placement settle/bounce amplitude;
- expansion dust/mist color to match the new palette;
- tiny harvest-ready or completed-action scene emphasis where already driven by visual events.

No new authoritative reward/economy behavior is added.

## Quality and Performance Contract

The existing `high`, `medium`, and `mobile` profiles remain the source of truth.

### High

- max DPR stays `1.75`;
- 2048 directional shadow map;
- full vegetation motion;
- full material variation;
- highest terrain-detail density;
- multi-layer water highlights;
- richer edge dressing and mist.

### Medium

- max DPR stays `1.35`;
- 1024 shadow map;
- reduced vegetation motion;
- reduced material/detail density;
- one bounded water highlight layer;
- fewer edge/atmosphere accents.

### Mobile

- max DPR stays `1`;
- 512 shadow map;
- minimal vegetation motion;
- basic water;
- lowest terrain-detail density;
- no optional glint/detail batches where they are not necessary;
- no additional per-frame loops proportional to all tiles beyond existing bounded systems.

### Hard performance rules

- Do not add `EffectComposer` or mandatory post-processing.
- Do not add real-time planar/cubemap reflections.
- Do not add remote GLB/model dependencies.
- Preserve instancing for repeated terrain, vegetation, rocks, flowers, and repeated small details.
- One primary shadow-casting directional light maximum.
- Avoid per-frame allocation in animation loops.
- Decorative systems must stop or minimize work when `document.visibilityState === 'hidden'`, matching current patterns.
- Reduced-motion behavior must remain supported.

## Architecture Changes

Expected new modules:

- `lib/hex-world/visual-theme.ts`
- `lib/hex-world/visual-environment.ts`
- `components/hex-world/HexTerrainDetails.tsx`

Expected modified modules:

- `components/hex-world/HexWorld3D.tsx`
- `components/hex-world/HexTileInstances.tsx`
- `components/hex-world/HexIslandUnderside.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `components/hex-world/HexAmbientDecor.tsx`
- `components/hex-world/HexWaterSurface.tsx`
- `components/hex-world/HexSkyAtmosphere.tsx`
- `components/hex-world/models/HexStructureModels.tsx`
- `components/hex-world/models/HexNatureModels.tsx`
- `components/hex-world/HexLivingWorldLayer.tsx`
- `lib/hex-world/camera.ts`
- graphics regression tests under `tests/hex-*.test.ts`

No expected changes to:

- Prisma schema/migrations;
- API routes;
- auth;
- billing;
- homestead economy;
- expansion cost/size rules;
- building placement authority;
- save schema.

## Data Flow

1. Existing `HexWorldSnapshot` and optional `HomesteadLifeState` enter `HexWorld3D`.
2. `resolveHexQualityProfile` selects high / medium / mobile budget exactly as today.
3. `HexWorld3D` derives a small `HexVisualEnvironment` from living state.
4. Terrain/building/decor modules derive deterministic presentation data from seed, coordinates, quality profile, and allowed visual-environment fields.
5. All visual derivation stays client-side and ephemeral.
6. Existing server-authoritative game actions remain untouched.

## Testing Strategy

Add source-contract and pure deterministic tests covering:

- no heavy post-processing introduced;
- quality caps remain unchanged unless explicitly tested/approved;
- visual environment is pure and limited to season/weather/time phase;
- terrain details are deterministic and density-bounded;
- underside placement derives from island boundary rather than fixed unrelated ring positions;
- repeated terrain/decor remains instanced;
- one primary directional shadow owner remains;
- water detail respects quality tiers;
- crop visual-stage mapping is deterministic and presentation-only;
- mobile quality omits expensive optional details;
- atmosphere never imports or mutates gameplay engine actions;
- no remote model URLs are introduced;
- existing Hex Homestead, farm, auth, security, DB/Redis undo, lint, production build, and runtime-smoke suites remain green.

## Acceptance Criteria

The pass is complete when:

1. The island reads as one floating miniature rather than flat hexes over unrelated rocks.
2. Buildings, crops, trees, water, and terrain share one coherent palette/material language.
3. Garden growth stages are visibly distinguishable at the normal camera distance.
4. Water reads clearly as water without expensive reflections.
5. Buildings have stronger silhouette/contact depth without external assets.
6. Season/weather/time gently influence scene mood without becoming distracting.
7. High quality looks materially richer than medium; mobile remains intentionally simple.
8. Existing gameplay behavior, data authority, persistence, and economy are unchanged.
9. The full production CI/build/runtime gates pass before merge.

## Explicit Non-Goals

- Photorealism.
- New gameplay systems.
- Character-controller changes.
- New crops/resources/buildings.
- External texture packs or model marketplaces.
- WebGPU-only rendering.
- Heavy screen-space effects.
- Physics-based foliage or water simulation.
- Persisting decorative variation into the database.
