# Narinyland Naturalistic Floating Homestead Design

Date: 2026-08-24
Status: Approved direction, written spec pending final review
Baseline: `main` after World Visual Motion v2 (PR #48)

## Goal

Transform Narinyland from a miniature / low-poly diorama presentation into a **naturalistic floating homestead**: the island still floats in the sky, but the land, cliffs, vegetation, water, structures, lighting, and scale should read as a believable real place rather than stacked game-board pieces.

The gameplay remains hex-authoritative underneath. The player should normally not perceive the world as visible hex tiles.

## Product success criteria

When `/garden` opens in normal World mode:

1. the island reads as one continuous floating landmass, not overlapping or stacked hex blocks;
2. visible hex seams are absent during normal play and appear only as contextual build / grow guidance;
3. terrain reads as real grass, soil, stone, and natural paths through material variation, normals, roughness, and organic edge dressing;
4. the island side and underside read as layered earth and rock with an organic silhouette;
5. trees, crops, grass, flowers, and shrubs have natural silhouettes instead of geometric canopy blobs;
6. Home, Barn, Storage, and Workshop read as believable full-scale rural structures rather than primitive toy models;
7. water reads as a physical pond / stream surface with depth cues, normals, reflections/highlights, and natural banks;
8. sunlight, shadows, sky haze, and atmospheric perspective reinforce a believable floating-island scale;
9. World camera composition reads as looking at a real location from above, not a miniature model on a table;
10. high / medium / mobile remain bounded real-time web quality tiers.

## Art direction

### Primary direction: Naturalistic Floating Homestead

The fantasy premise remains the floating island. Everything physically present on the island is grounded and material-driven.

Desired qualities:

- natural proportions;
- grounded color palette;
- physically believable materials;
- irregular organic silhouettes;
- restrained saturation;
- soft natural daylight;
- believable contact with the ground;
- readable but not exaggerated game feedback;
- cozy rural warmth rather than sterile simulator realism.

Avoid:

- toy / miniature scale cues;
- obvious low-poly facets as the dominant aesthetic;
- spherical or dodecahedral tree canopies;
- box-and-cone buildings as final presentation;
- bright flat-color materials;
- visible stacked hex cylinders in normal World mode;
- excessive bloom, depth of field, or cinematic effects that hide gameplay readability.

## Core architectural decision: separate gameplay geometry from presentation geometry

This is the most important change in the overhaul.

### Gameplay authority remains hex-based

Existing hex coordinates, tile height, terrain type, unlock state, build placement validation, expansion validation, server persistence, undo, farm logic, and interaction rules remain authoritative.

No gameplay rule may depend on the new naturalistic presentation mesh.

### Visible terrain becomes a continuous island skin

Normal World mode renders a dedicated continuous presentation surface derived from authoritative unlocked hex tiles.

The visible surface must:

- share vertices across adjacent tile boundaries where possible;
- avoid vertical gaps and overlapping stacked top faces;
- interpolate visual transitions between neighboring heights without changing stored tile heights;
- preserve deterministic generation from the existing world seed and tile data;
- maintain exact tile-picking authority through a separate transparent interaction proxy;
- never write back presentation vertex offsets into gameplay state.

### Hidden interaction proxy

Existing hex tile geometry is retained or replaced by a lightweight instanced picking proxy with:

- no visible color contribution in normal World mode;
- pointer/raycast support;
- exact authoritative tile identity;
- build / expand validity state available to overlays;
- no displacement from visual terrain smoothing.

When Build or Grow Land mode is active, contextual hex guidance renders above the continuous terrain surface. The grid is a tool, not the world art style.

## 1. Continuous terrain surface

Create a dedicated naturalistic terrain layer rather than using the existing visible stacked hex top surfaces as the primary ground presentation.

### Surface generation

Input:

- authoritative unlocked tiles;
- tile heights;
- terrain types;
- world seed.

Output:

- deterministic triangulated top surface;
- shared or position-matched boundaries;
- stable world-space UV coordinates;
- per-vertex or per-face terrain classification data;
- edge data for bank / cliff generation.

### Height presentation

Stored hex height remains authoritative.

Visual surface rules:

- central area of a tile remains near its authoritative tile height;
- adjacent height changes receive a narrow presentation-only slope / erosion transition instead of two overlapping flat slabs;
- maximum smoothing influence stays inside neighboring tile boundaries;
- interaction / building anchors continue using authoritative tile height, not interpolated visual height.

This removes the “เหลื่อม / stacked plate” appearance while preserving deterministic build rules.

## 2. Terrain materials

Replace flat-color terrain as the dominant presentation with local PBR material sets.

Initial material families:

- grass / turf;
- exposed soil;
- compacted path dirt;
- weathered stone / cliff rock;
- damp bank / shoreline.

Each family should support, where available:

- base color / albedo;
- normal map;
- roughness map;
- optional ambient-occlusion map;
- world-space or stable generated UV tiling.

Material rules:

- textures are local application assets, never runtime third-party URLs;
- color values remain physically restrained and avoid overly saturated palette overrides;
- terrain UV scale must be consistent in world units so texture scale reads naturally;
- adjacent terrain classes may use deterministic edge breakup / vegetation dressing to avoid perfect geometric borders.

Remote runtime texture/model dependencies are not permitted.

## 3. Organic floating-island cliff and underside

Replace the visual impression of one underside piece per hex with one island-boundary-driven presentation shell.

### Boundary shell

Derive the outer boundary from unlocked land coordinates and generate:

- top soil lip;
- layered earth band;
- irregular rock face;
- tapering underside mass;
- optional small detached rock fragments only where they support composition.

The underside silhouette must use deterministic noise derived from the world seed, never `Math.random()`.

### Surface details

Quality-bounded details may include:

- exposed rock protrusions;
- soil striation;
- roots near grassy edges;
- hanging grass / small plants;
- occasional moisture-darkened rock near water outlets.

The island must look heavy and geological even though it floats.

## 4. Vegetation system

Keep the World Visual Motion v2 wind architecture but replace toy-like geometry with naturalistic vegetation presentation.

### Trees

Target:

- recognizable trunk and branch structure;
- irregular canopy silhouette;
- leaf clusters rather than one geometric ball;
- natural scale relative to buildings;
- deterministic rotation / scale variation;
- instanced rendering for repeated assets.

Use local game-ready geometry / GLB assets or purpose-built reusable mesh modules. No runtime remote model URLs.

### Ground vegetation

Add quality-bounded instanced layers for:

- grass clumps;
- weeds;
- small shrubs;
- flowers;
- crop foliage.

Rules:

- deterministic density from world seed and tile coordinates;
- clear build footprints and paths remain readable;
- mobile receives significantly lower density;
- reduced motion disables or minimizes continuous wind animation.

## 5. Naturalistic rural structures

Replace primitive-only final presentation for the four core structures:

- Home;
- Barn;
- Storage;
- Workshop.

### Structure requirements

Each building must have believable:

- wall thickness and material separation;
- foundation / ground contact;
- roof construction;
- windows and frames;
- doors and thresholds;
- trim / beams appropriate to the structure;
- real-world relative scale.

Use local game-ready mesh assets or reusable authored geometry. Existing building keys, tiers, selection state, ghost placement, interaction actions, persistence, and mutation events remain unchanged.

### Materials

Primary structure material families:

- painted plaster / siding;
- timber;
- roof tile / shingle / metal depending on structure;
- stone foundation;
- glass;
- metal hardware.

Selection feedback remains presentation-only but should use subtle outline / ground highlight / lift rather than making the building read like a toy being scaled dramatically.

## 6. Water and natural banks

Preserve bounded World Visual Motion v2 water animation but change the visual treatment.

Water should use physically based presentation with:

- transparent / depth-aware color gradient;
- normal-map surface breakup;
- physically plausible roughness;
- sun highlights;
- shallow/deep color differentiation;
- quality-bounded ripple detail.

No mandatory SSR, cube-camera-per-water-body, or heavyweight reflection pipeline.

Water banks should transition through soil / stone / plants rather than ending at a clean geometric hex edge.

## 7. Lighting, sky, and atmosphere

Retain one primary directional shadow owner.

### Lighting direction

- natural sun color and intensity;
- softer sky / hemisphere fill;
- restrained ambient light;
- believable shadow softness;
- existing smooth weather / daylight interpolation remains;
- ACES-style filmic tone mapping may be used if compatible with the current renderer and verified against existing UI/readability;
- no heavy post-processing dependency is required for the overhaul.

### Floating-island atmosphere

The fantasy should be communicated through environment, not toy geometry.

Use bounded presentation such as:

- atmospheric haze below and around the island;
- distant cloud layers;
- depth-based fog;
- softened horizon;
- occasional cloud shadows only if inexpensive and deterministic.

The sky must preserve clear separation between island silhouette and background.

## 8. Camera scale perception

World mode should feel like a camera observing a real location, not a tabletop diorama.

Adjust presentation toward:

- slightly lower and more human-natural viewing angle;
- perspective that preserves building and tree scale;
- less top-down “board game” composition;
- no fake miniature depth-of-field;
- existing manual OrbitControls authority preserved;
- existing scripted transition and idle breathing architecture preserved unless tuning is required.

Explore mode remains person-scale and benefits automatically from the new environment materials/assets.

## 9. Build / Grow Land visibility

Normal World mode:

- no persistent visible hex grid;
- no obvious stacked tile plates.

Build mode:

- contextual tile overlays appear on top of the natural terrain;
- valid / invalid feedback stays readable;
- hover/select remains mapped to authoritative hex coordinates.

Grow Land mode:

- expansion ghost uses the existing exact authoritative cells;
- preview presentation may use translucent terrain-colored overlays rather than visible solid hex blocks;
- confirmed expansion regenerates the continuous island surface from the new authoritative snapshot.

## 10. Asset policy

To reach the requested realism, this overhaul may introduce local texture and 3D asset files.

Requirements:

- all assets stored in the repository/public asset pipeline or a controlled project asset source;
- no runtime dependency on third-party model or texture URLs;
- every externally sourced asset must have a recorded license / source manifest;
- prefer game-ready assets with sensible polygon counts and texture sizes;
- use mesh compression / texture compression where compatible with current deployment;
- no font files are part of this task.

If suitable licensed assets are unavailable, use authored procedural/local geometry as a fallback, but primitive box/cone/dodecahedron presentation is not acceptable as the final naturalistic target for core visible assets.

## 11. Performance budgets

The existing high / medium / mobile profiles remain the only runtime quality buckets.

### High

- richer vegetation density;
- full structure detail;
- highest allowed shadow resolution;
- full water normal/ripple detail;
- high-quality terrain textures within web memory limits.

### Medium

- reduced vegetation density;
- same primary building silhouettes;
- reduced secondary props;
- medium texture and shadow budget;
- visually equivalent terrain continuity.

### Mobile

- strongly reduced grass / foliage instance count;
- simplified secondary structure details;
- lower shadow and water detail;
- same continuous terrain silhouette and hidden hex seams;
- no removal of essential gameplay feedback.

Performance constraints:

- repeated vegetation and props remain instanced;
- no per-object React state animation loops;
- LOD or quality-specific geometry is allowed;
- adaptive quality remains capable of degrading high/medium to lower existing buckets;
- no mandatory WebGPU migration.

## 12. Reduced motion

Reduced-motion preference continues to be respected:

- continuous vegetation sway minimized/disabled;
- decorative water animation minimized;
- camera idle breathing disabled;
- lighting state changes settle quickly;
- terrain, structures, materials, and realism remain visually intact.

## 13. Data and gameplay boundaries

This visual overhaul must not change:

- Prisma schema;
- API contracts;
- world persistence;
- hex coordinate authority;
- tile unlock authority;
- building placement validation;
- building mutation semantics;
- farm state;
- resident state;
- economy / points;
- undo semantics;
- authentication;
- Explore interaction targeting rules.

Presentation may derive from authoritative data but never becomes a new gameplay source of truth.

## Expected architecture / files

Existing files likely to be modified:

- `components/hex-world/HexWorld3D.tsx`
- `components/hex-world/HexTileInstances.tsx`
- `components/hex-world/HexTerrainDetails.tsx`
- `components/hex-world/HexIslandUnderside.tsx`
- `components/hex-world/HexAmbientDecor.tsx`
- `components/hex-world/HexWaterSurface.tsx`
- `components/hex-world/HexWorldLighting.tsx`
- `components/hex-world/HexDioramaCamera.tsx`
- `components/hex-world/models/HexStructureModels.tsx`
- `lib/hex-world/visual-theme.ts`
- `lib/hex-world/quality.ts`

New focused units are expected rather than expanding already-large files indefinitely, for example:

- `components/hex-world/terrain/HexNaturalTerrain.tsx`
- `components/hex-world/terrain/HexIslandCliffShell.tsx`
- `components/hex-world/terrain/HexBuildGridOverlay.tsx`
- `components/hex-world/materials/HexTerrainMaterials.tsx`
- `lib/hex-world/natural-terrain.ts`
- `lib/hex-world/island-boundary.ts`
- `lib/hex-world/terrain-variation.ts`
- asset manifest under `public/hex-world/` or a documented equivalent.

Exact file boundaries are finalized in the implementation plan after spec approval.

## Test strategy

Implementation must be test-first.

### Geometry / pure tests

Verify:

- island boundary derivation is deterministic;
- continuous terrain generation contains no top-surface gaps between adjacent unlocked cells;
- presentation smoothing never changes authoritative tile coordinates/heights;
- cliff-shell noise is deterministic;
- build-grid overlay coordinates remain exact authoritative hexes;
- quality budgets remain bounded.

### Architecture contracts

Verify:

- normal World mode no longer renders visible stacked hex top surfaces as primary terrain;
- raycast/picking authority still maps to existing hex coordinates;
- Build/Grow overlays are contextual only;
- no `Math.random()` in deterministic world presentation;
- repeated vegetation remains instanced;
- core buildings no longer rely exclusively on primitive final geometry;
- no remote runtime model/texture URLs;
- exactly one primary directional shadow light remains;
- no required heavy post-processing stack;
- persistence/API/schema files remain unchanged.

### Regression suite

Run full Hex Homestead CI including:

- dependency advisory gate;
- Prisma validation/migrations;
- security regressions;
- complete Hex pure suite;
- DB/Redis undo integration;
- farm regression;
- lint;
- production build;
- production runtime smoke.

## Acceptance criteria

The overhaul is complete only when:

1. normal World mode reads as one organic floating island rather than stacked hex pieces;
2. visible hex seams are removed from the normal presentation;
3. gameplay picking/building/expansion remain exactly hex-authoritative;
4. terrain uses naturalistic material treatment rather than flat palette color alone;
5. cliff/underside is generated from the island boundary and reads as one geological landmass;
6. core vegetation silhouettes are naturalistic and quality-bounded;
7. Home, Barn, Storage, and Workshop read as believable structures with real material separation;
8. water has natural banks and physically believable surface treatment;
9. lighting/sky preserve the floating-island fantasy while reducing miniature scale cues;
10. World camera no longer emphasizes a tabletop-model feeling;
11. high/medium/mobile remain bounded and reduced-motion behavior remains intact;
12. no gameplay, schema, API, economy, persistence, auth, or engine migration is introduced;
13. full Hex Homestead CI passes on the exact final branch head before merge;
14. after merge, Railway production is verified to serve the resulting `main` commit before claiming the overhaul live.
