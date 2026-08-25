# Hybrid PBR Floating Island Design

**Status:** Approved visual direction; written spec pending user approval before implementation.

## Goal

Make Narinyland visually approach the approved realistic floating-island references by replacing the remaining procedural-color / primitive-art look with an asset-driven PBR presentation, while preserving the current Hex Homestead gameplay authority, world state, farming, building placement, expansion, interactions, persistence, undo, and Railway deployment architecture.

The island remains floating in the sky. The target is **believable real-world materials and asset fidelity inside a fantasy floating-island composition**, not photoreal AAA rendering and not a return to visible hex tiles.

## Why the current pass is insufficient

The Naturalistic Floating Homestead pass solved the largest structural issue: the visible ground is continuous, the hex grid is hidden outside Build/Grow, and the island uses an organic boundary shell. However, most visible surfaces are still authored from procedural geometry and flat material colors. That keeps the scene readable and performant but cannot reproduce the reference look, which depends on scanned PBR surfaces, richer foliage meshes, detailed rock breakup, realistic architecture assets, material microdetail, and image-based environment lighting.

This spec therefore changes the visual content pipeline, not gameplay authority.

## Locked product direction

- The island remains a floating landmass in the sky.
- Normal World mode must not expose gameplay hex seams.
- Build/Grow may show contextual hex guidance only.
- PBR presentation becomes the default visual path.
- Hex coordinates remain the only placement / expansion authority.
- Terrain height, unlock state, farming, buildings, interactions, points/economy, undo, and persistence remain unchanged.
- No Prisma schema, API contract, auth, or server-authority changes.
- No WebGPU migration.
- No mandatory heavy post-processing stack.
- No runtime call to third-party asset APIs or CDNs.
- No permanent primitive-art fallback once the PBR replacement is verified.

## Reference quality target

The World view should read as a small real place suspended in the sky:

- grass has photographed color variation and fine surface breakup;
- exposed soil has believable grain, roughness and damp variation;
- cliff faces show actual stone/earth material response rather than vertex colors alone;
- trees have recognisable trunks, branches, leaf cards/clusters and irregular silhouettes;
- shrubs, stones, flowers, roots and path edges break up large empty areas;
- Home/Barn/Storage/Workshop read as believable buildings with real wall, roof, timber, glass and metal materials;
- pond/water reads as a transparent reflective surface with normal detail and shoreline integration;
- sky lighting contributes natural reflections and color balance;
- the overall scene remains cozy and art-directed rather than harsh simulator realism.

## Asset-source and licensing policy

Primary source: **Poly Haven** assets selected from CC0 HDRIs, textures and models. Poly Haven assets are CC0 and may be used commercially. The repository will still record provenance for maintenance and traceability.

Candidate collections/categories include natural forest/grass/rock material sets, Pine Forest / A Verdant Trail style vegetation, The Shed style rural props, and suitable open-sky HDRIs. Exact asset IDs are selected during implementation and pinned in the manifest.

### Production dependency rule

Narinyland must never call `api.polyhaven.com` or `dl.polyhaven.org` from the browser at runtime.

Instead, a pinned repository manifest drives a **build-time vendor step**. The manifest records exact source URLs, resolution, expected checksum/hash, asset type, license and local output path. The vendor script downloads only approved files before `next build`, verifies integrity, and places them under `public/assets/hex-world/`.

This gives us real assets without shipping runtime third-party dependencies. Docker layer caching should make unchanged asset sets reusable between Railway builds.

If the vendor step cannot verify an asset, the production build fails explicitly. It must not silently fall back to the old primitive renderer.

## Repository layout

```text
assets/hex-world/
  pbr-manifest.json
  README.md
  NOTICE.md
scripts/
  vendor-hex-pbr-assets.mjs
public/assets/hex-world/          # generated during vendor/build step
  hdri/
  textures/
  models/
lib/hex-world/
  pbr-assets.ts
  pbr-materials.ts
components/hex-world/pbr/
  HexPBRAssetPreloader.tsx
  HexPBRTerrain.tsx
  HexPBRCliff.tsx
  HexPBRVegetation.tsx
  HexPBRBuildings.tsx
  HexPBRWater.tsx
  HexPBREnvironment.tsx
```

Generated asset output may be excluded from source control if Railway/CI always vendors it deterministically. The manifest and checksums remain version-controlled.

## Asset manifest contract

Example shape:

```json
{
  "version": 1,
  "assets": [
    {
      "id": "grass_surface_primary",
      "source": "polyhaven",
      "sourceAssetId": "...",
      "type": "texture",
      "variant": "1k",
      "files": {
        "baseColor": { "url": "...", "md5": "...", "out": "textures/grass/basecolor.jpg" },
        "normal": { "url": "...", "md5": "...", "out": "textures/grass/normal.jpg" },
        "roughness": { "url": "...", "md5": "...", "out": "textures/grass/roughness.jpg" }
      },
      "license": "CC0"
    }
  ]
}
```

The manifest must be deterministic and reviewable. Runtime code resolves local `/assets/hex-world/...` URLs only.

## Rendering architecture

### 1. Continuous gameplay terrain remains the geometric base

Keep the existing deterministic `buildNaturalTerrainMesh` topology and invisible hex picking proxy. The new PBR terrain renderer replaces the current flat vertex-color material, not the gameplay mesh generation.

Add deterministic UV/world-projection data for the visible continuous terrain. Terrain coordinates remain presentation-only and never alter source tile heights.

### 2. Terrain PBR material stack

Use separate local texture sets for:

- grass/turf;
- exposed soil;
- compacted path dirt;
- stone/gravel patches;
- damp shoreline/bank.

At minimum each primary terrain set should use base-color, normal and roughness maps. AO is optional when it materially improves depth. Large-scale world color variation remains subtle and deterministic so tiled textures do not look stamped.

The visible terrain renderer may group triangles by terrain classification/material rather than use one flat color material.

### 3. Cliff / underside PBR

Retain the boundary-driven organic cliff geometry introduced in the previous pass, but replace color-only rock/earth shading with real PBR rock/soil material sets.

Generate deterministic face-projected UVs or world-space projection suitable for vertical cliff faces. Add a bounded number of real rock/root props along high/medium quality boundaries to break the silhouette.

The cliff must remain one coherent landmass. Do not reintroduce one rock primitive per hex tile.

### 4. Vegetation asset system

Replace the remaining authored procedural tree silhouette with local real vegetation geometry.

Initial vegetation set:

- 2–3 tree variants;
- 2 shrub/fern variants;
- grass tuft/card clusters;
- 1–2 rock variants;
- small flower/ground-cover variants.

Repeated geometry must be instanced. Extract geometry/materials from local GLB assets once and populate deterministic instance transforms from the existing world seed, tile metadata and quality budget.

Preserve World Visual Motion v2 wind behavior. Wind remains presentation-only and bounded. For GLB leaf/branch assets, sway is applied to whole small instances or instance groups initially; skeletal foliage is out of scope for v1.

### 5. Core buildings

Home, Barn, Storage and Workshop receive PBR-first model slots.

Preferred order:

1. local CC0 GLB asset matching the intended rural structure;
2. local authored mesh assembled from reusable detailed geometry but using real PBR wall/roof/wood/stone/glass materials;
3. never ship the current flat primitive model as the final fallback.

Model dispatch remains keyed by existing `buildingKey`. DTOs, tier state, selected/ghost transforms and building interaction behavior do not change.

Ghost placement may use the same model with transparent valid/invalid overlay material, but normal World rendering uses its native PBR materials.

### 6. Water

Keep the current bounded water motion and ripple architecture but add local normal texture detail and more believable shallow/deep tinting.

Use a physical non-metallic water material with IOR around water values. No cube-camera per pond, SSR or expensive planar reflection system. Environment-map reflection provides the primary realism cue.

Shoreline/bank geometry and reeds/stones should visually connect water to terrain so ponds do not appear placed on top of the ground.

### 7. HDRI / environment lighting

Add one pinned outdoor HDRI at conservative resolution (initially 1K or 2K) and load it locally through Three/Drei environment support.

Use it for image-based lighting and reflections, not necessarily as the visible background. Narinyland can keep its art-directed sky/fog/cloud presentation while the HDRI contributes physically believable environment light.

Exactly one directional light remains the primary shadow owner.

### 8. Color management

- base-color textures use sRGB color space;
- normal/roughness/AO remain non-color data;
- renderer tone mapping/exposure stays restrained;
- avoid oversaturated grass and warm yellow global tint;
- window emissive values remain contextual and subtle.

## Quality tiers and LOD

Keep only existing `high`, `medium`, `mobile` runtime buckets.

### High

- terrain textures up to 2K where visible benefit is clear;
- highest available selected model LOD within budget;
- full vegetation density budget;
- more cliff/ground props;
- 1K–2K environment map.

### Medium

- prefer 1K terrain/model textures;
- mid LOD models;
- reduced foliage instances;
- reduced rock/ground-cover density;
- 1K environment map.

### Mobile

- 512–1K textures where possible;
- lowest approved model LOD;
- aggressive vegetation reduction;
- minimal secondary cliff props;
- 1K or lower environment map;
- existing max DPR / shadow budgets remain authoritative.

No tier may silently promote above the existing static quality cap.

## Initial performance envelopes

These are guardrails rather than absolute benchmark guarantees:

- high: target texture working set under roughly 128 MB for Hex World assets;
- medium: target under roughly 64 MB;
- mobile: target under roughly 32–48 MB;
- repeated trees/rocks/ground cover must be instanced;
- avoid loading unused building GLBs eagerly when they are not present in the world/catalog preview;
- preloader loads shared terrain/environment essentials first, then visible structures and decor.

## Loading behavior

PBR essentials must be preloaded before the World fades into its final presentation. During initial loading, keep the existing Narinyland loading treatment rather than revealing primitive placeholders.

If a local model is unavailable after a successful build, render an explicit small error marker only in development. Production verification should prevent this state.

## Old-renderer removal policy

The current naturalistic procedural components may coexist temporarily during implementation behind internal cutover points, but the final PR must remove dead duplicate visual paths where the PBR renderer replaces them.

Specifically, do not retain:

- flat-color terrain as a hidden normal-World fallback;
- procedural tree canopy as fallback for asset failure;
- primitive Home/Barn/Storage/Workshop as fallback after PBR model coverage is complete;
- remote runtime asset URLs.

The invisible hex picking proxy and contextual Build/Grow grid remain because they are gameplay infrastructure, not visual fallback.

## Testing strategy

### Asset pipeline tests

Add tests that verify:

- manifest schema is valid;
- every asset has source/license/checksum/output metadata;
- duplicate output paths are rejected;
- vendor script rejects checksum mismatch;
- runtime source contains no Poly Haven/API/CDN URLs;
- runtime asset paths begin with local `/assets/hex-world/`.

### PBR architecture contracts

Require:

- terrain uses texture maps and normals rather than color-only standard material;
- cliff uses PBR texture/material stack;
- environment map is local;
- vegetation asset geometry is instanced;
- core building dispatch remains `buildingKey` compatible;
- water retains bounded v2 motion and uses local normal/environment detail;
- exactly one directional shadow light remains;
- no mandatory SSR, Bloom, DOF, CubeCamera or WebGPU renderer.

### Existing regression gates

Final exact branch head must still pass the complete Hex Homestead CI:

1. production dependency advisory gate;
2. Prisma validation;
3. migrations;
4. security regressions;
5. full Hex pure suite;
6. DB/Redis undo integration;
7. farm regression;
8. lint;
9. production build, including asset vendoring;
10. production runtime smoke.

## Visual acceptance checklist

The pass is not accepted merely because tests compile. In normal World view:

- no visible hex terrain seams at ordinary camera distance;
- grass/soil/cliff surfaces clearly show real PBR texture/normal response;
- large ground areas no longer look like single flat color fields;
- trees no longer read as procedural blobs or simple geometry stacks;
- at least the starter Home reads as a real material-rich structure from the default overview;
- Barn/Storage/Workshop share the same fidelity level when present;
- pond has visible normal/reflection detail and integrated shoreline;
- rock/root/shrub breakup makes island edges look geological rather than generated from a smooth strip;
- HDRI/environment response is visible on water, glass, metal and shaded surfaces;
- Build/Grow remains clear and precise when contextual grid guidance is active;
- mobile retains gameplay readability without loading the full desktop visual budget.

## Deployment acceptance

Do not merge a red head.

After explicit user `merge` approval:

1. merge with expected-head protection;
2. verify Railway production deployment metadata contains the resulting `main` SHA;
3. require Railway deployment status `SUCCESS` before claiming the PBR overhaul is live.

## Out of scope for this pass

- gameplay redesign;
- world-size changes;
- physics migration;
- Rapier/navmesh/ECS introduction;
- animated skeletal trees;
- fully dynamic global illumination;
- ray tracing;
- WebGPU-only rendering;
- mandatory post-processing stack;
- multiplayer authority changes;
- new economy or progression rules.
