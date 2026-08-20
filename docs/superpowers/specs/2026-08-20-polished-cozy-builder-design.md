# Phase 2 — Polished Cozy Builder Design

**Status:** Approved design, pending written-spec review  
**Project:** Narinyland  
**Primary route:** `/garden`  
**Base implementation:** Cozy Floating Hex Homestead on `main` at `ad8057ede6b2e0df5d1ca88ede2e9bf1ba1a8552`  
**Priority:** Visual Wow > Builder UX > Mobile/Performance  
**Visual direction:** Magical Floating Garden + Premium Miniature Diorama

## 1. Objective

Phase 2 turns the production Floating Hex Homestead from a functional 3D builder into a polished, premium-feeling cozy world. The first impression must be visually memorable, but the scene must remain readable and responsive enough to build, move, rotate, remove, undo, and expand without friction.

The world should feel like a carefully art-directed miniature floating garden rather than a visible grid editor. Hex tiles remain the authoritative spatial system, but in normal viewing they should recede into the visual language of one cohesive floating island. The grid becomes explicit only when it helps the user place or expand something.

The implementation must preserve the current server-authoritative HexWorld architecture, current Land ownership, existing Circle/Land/Profile/Settings/Proposal shell, current Home/Timeline/Coupons/Letters navigation, existing Hex persistence, shared Points expansion economy, and legacy `PurchasedItem` and family-farm data.

## 2. Product Principles

### 2.1 Visual quality leads

When `/garden` opens, the island is the hero. The design should prioritize silhouette, composition, lighting, materials, depth, and focal hierarchy before adding expensive effects.

Visual polish must come primarily from deliberate scene composition, strong miniature silhouettes, cohesive materials, warm directional light and soft shadowing, atmospheric depth, restrained magical motion, and consistent building/vegetation art direction.

The experience must not depend on heavy bloom, depth-of-field, full-screen postprocessing, or particle density to look premium.

### 2.2 The 3D world is the primary interface

Users should build by interacting with the island they see, not by operating multiple detached editor panels. Catalogs and action bars support the world; they do not replace it.

### 2.3 Server truth remains authoritative

Client-side hover, ghost placement, camera motion, selection effects, and temporary animation are presentation state only. Persistent world mutations remain server-owned.

### 2.4 Motion is soft, weighted, and interruptible

Animation should communicate change without making the app feel like a cinematic demo. Camera movement must stop yielding control as soon as the user manually orbits or zooms.

### 2.5 Mobile is a hard usability requirement, not the art-direction driver

The desktop/high-quality experience defines the visual target. Mobile may reduce rendering cost, but must preserve the same world identity, building silhouettes, composition, and interaction semantics.

## 3. Art Direction

### 3.1 Combined style

Phase 2 combines two approved directions.

**Magical Floating Garden** contributes floating clouds and mist, layered sky depth, floating rock fragments, subtle pollen/dust/sparkle, vegetation motion, water life, and expansion reveal effects.

**Premium Miniature Diorama** contributes chunky readable forms, rounded low-poly silhouettes, a refined muted palette, soft controlled shadows, simple material families, clean visual hierarchy, and restrained detail density around buildable areas.

The resulting world should feel magical but not fantasy-heavy, premium but not realistic, and cozy without becoming visually flat.

### 3.2 Palette

Primary world palette:

- grass: sage / olive green;
- wood: warm brown;
- walls: cream / warm stone;
- roofs: muted terracotta / coral / moss;
- water: soft turquoise;
- stone: warm gray / cream stone;
- sky: pastel cyan with warm haze;
- magical accents: low-saturation gold/cream rather than neon.

Avoid saturated mobile-game greens, neon fantasy crystals, glossy metallic water, or high-contrast cyber lighting.

### 3.3 Lighting baseline

The default hero lighting profile is warm late-morning / early-afternoon:

- one primary warm directional light;
- soft hemispheric fill;
- moderate ambient contribution;
- controlled contact shadowing;
- pastel sky/fog background;
- slightly more saturation and contrast on the island than in the distant sky.

Dynamic day/night is not expanded in this phase. Existing sky/time settings are preserved, but the polished baseline is optimized around the approved warm hero lighting.

## 4. Scene Composition and First Impression

### 4.1 First three seconds

On Land load, the user should immediately see a hero composition rather than a grid.

The island should occupy roughly 70–80% of the safe viewport while leaving approximately 15–20% breathing room around its silhouette so the floating context is obvious.

The visual hierarchy is:

1. **Home** as the primary focal point, near center but not perfectly centered.
2. **Stone path** guiding the eye from Home toward garden and pond.
3. **Pond** as a secondary focal point, with rocks/reeds/vegetation around it.
4. **Tree grove** framing one side/back of Home.
5. **Buildable open land** remaining visibly free enough that the user understands where customization can happen.

At least approximately half of the island should remain visually and spatially open enough for customization.

### 4.2 Island silhouette

The logical surface remains a hex world, but the silhouette should read as one island.

To break the visible honeycomb edge:

- edge vegetation and small rocks overlap selected tile boundaries;
- additional low-poly underside rock masses create tapered organic depth;
- floating fragments sit at multiple depths;
- clouds occupy foreground and background layers;
- tile color variation remains subtle rather than checkerboard-like.

The implementation must not replace the canonical hex coordinate system or collision model with arbitrary mesh positions.

### 4.3 Starter environment details

The already-persisted starter composition continues to provide deterministic Home, pond, garden, path fragments, tree grove, rocks, flowers, and ambient metadata. Phase 2 improves how those features are rendered and composed; it must not regenerate existing persisted worlds into a different layout.

Existing Lands keep their current HexWorld state. New Lands can use the same deterministic generator with upgraded rendering.

## 5. Smart Diorama Camera

### 5.1 Camera intent states

Camera behavior has three internal intent states only:

- **Overview** — hero framing of the current island;
- **Focus** — gentle focus on a selected building;
- **Build framing** — slightly more placement-readable angle/distance.

These are internal camera intents, not product modes. No camera-mode selector is added to the UI.

### 5.2 Smart overview framing

On Land load:

1. derive world-space bounds from unlocked tile coordinates;
2. derive a stable focal target weighted toward the island center/Home area;
3. calculate a camera distance that keeps the island inside the safe frame;
4. ease from the entry camera into that framing;
5. allow user input to interrupt immediately.

`Reset View` recalculates the Overview framing from the current island bounds. It must not return to a hard-coded position that becomes wrong after expansion.

### 5.3 Building focus

Selecting a building may move the camera target modestly toward that building. The movement must preserve orientation and enough surrounding context to understand where the object sits in the island.

Selection focus should never zoom tightly enough that users lose island orientation.

### 5.4 Expansion reframe

After expansion is confirmed, camera framing changes only if the newly unlocked cluster would otherwise fall materially outside the safe frame. Expansion must not cause unnecessary camera movement every time.

### 5.5 Controls

Desktop:

- drag empty world/sky to orbit;
- mouse wheel to zoom;
- click/tap world for selection/anchor when applicable;
- `R` rotates clockwise during placement;
- `Esc` cancels placement;
- `Enter` confirms valid placement.

Mobile:

- tap selects anchor/building;
- one-finger drag on world/empty area orbits;
- pinch zooms;
- UI gestures do not propagate into camera controls.

Free pan remains disabled in this phase.

## 6. Premium Building Art Pass

### 6.1 Shared building language

All existing catalog assets are redesigned to follow one art system:

- chunky, rounded silhouettes;
- soft/beveled edge impression;
- miniature proportions;
- 2–4 coordinated material tones per major building;
- large readable roof/door/window shapes;
- visual detail concentrated on silhouette and focal faces;
- deterministic appearance; reload never randomly changes a placed object.

The catalog keys and server placement semantics do not change merely for the art pass.

### 6.2 Home

Home remains the hero asset and non-removable starter structure.

Target appearance:

- approximately 2–3 hex visual/footprint presence as supported by the existing catalog rules;
- cream wall material;
- terracotta/muted coral roof;
- chimney;
- small porch;
- warm window glow;
- planter / small flowers;
- strong silhouette without consuming excessive customizable space.

The server catalog remains authoritative for the actual footprint.

### 6.3 Workshop and Storage

Workshop uses a wider/lower silhouette than Home, moss-green roof, chimney/tool accents, and warm structural materials matching Home.

Storage uses a small shed/barn identity, clear door/roof silhouette, and the same Home/Workshop material family.

### 6.4 Decorations and utility objects

Tree, Flower Patch, Pond, Bench, Lamp, Fence, Stone Path, and Garden Patch must use the same material language and proportion logic. They should feel intentionally authored for the same game rather than individually assembled primitives.

## 7. Vegetation, Water, Atmosphere, and Magical Effects

### 7.1 Vegetation

Trees use clustered rounded low-poly canopies rather than simple identical foliage balls.

Deterministic visual variation may include rotation, approximately ±10–15% scale variation, canopy grouping, and small green-tone variation. Variation must be seed/coordinate-derived so it remains stable after reload.

Ambient visual-only vegetation may include grass tufts, tiny flowers, mushrooms, small rocks, and edge shrubs. These are rendering details, not `HexBuilding` rows.

### 7.2 Water

Pond/water appearance:

- translucent soft turquoise;
- moderate/high roughness rather than mirror-like gloss;
- subtle animated ripple/normal impression;
- darker edge/depth tone;
- stones, reeds, and sparse floating leaves around the edge.

No real-time planar reflection is required.

### 7.3 Magical effects budget

Magic should occupy roughly 15–20% of visual attention rather than dominate the scene.

Allowed effects include drifting pollen/dust, occasional subtle sparkle near flowers/water, slow cloud drift, selective foliage wind motion, warm window glow, and expansion dust/mist/sparkle.

Avoid full-scene bloom dependence, glowing outline on all objects, constant particle rain, neon crystal language, heavy lens flare, or deep DOF blur during normal building interaction.

### 7.4 Island underside

Additional visual-only low-poly rock masses may be rendered below edge/central regions to create a tapered island underside. These masses are derived from stable world geometry/seed and do not become persistence records.

## 8. Builder UX

### 8.1 Main flow

The core flow remains:

`Build → Category → Item → Ghost Preview → Rotate → Place`

After placement, selecting an existing object exposes:

`Move · Rotate · Remove`

Home exposes only allowed actions and never Remove.

### 8.2 Build catalog

The current catalog UI becomes a compact builder tray/bottom sheet rather than a large detached editor panel.

Categories:

- Home
- Nature
- Utility
- Decor

Each item shows thumbnail/silhouette, display name, and compact footprint cue. Buildings remain free to place in Phase 2, so price is not displayed for building items.

Desktop may use a horizontal floating tray. Mobile uses a larger bottom sheet that respects safe-area padding. Selecting an item closes/collapses the catalog and returns focus to the world.

### 8.3 Placement visualization

Normal view does not show the entire grid strongly.

During placement/move:

- valid footprint: soft emerald;
- invalid footprint: muted coral/red;
- expansion preview: amber;
- selected/anchor tile: higher-contrast white/cream emphasis;
- ghost model: translucent but still preserves readable silhouette/material grouping.

Invalid placement should expose a short reason such as `Occupied`, `Needs grass`, or `Outside unlocked land`.

The client preview is advisory; server rejection remains authoritative.

### 8.4 Contextual object toolbar

Selecting a building displays a compact action bubble near the selected object using 3D-to-screen projection.

Actions:

- Move
- Rotate
- Remove when allowed
- Deselect

The toolbar is clamped into the viewport. On small screens or when projection becomes cramped, it falls back to a bottom action bar.

### 8.5 Move behavior

The original building remains authoritative until the server accepts the move.

During move:

- the original location remains visible as a subdued/faded source marker;
- a ghost model follows the candidate anchor;
- cancel/API failure leaves the original unchanged;
- server-confirmed movement transitions into the new location with a short settle animation.

### 8.6 Rotate behavior

Normal selected state:

- Rotate advances 60° and persists immediately;
- the visual may optimistically animate only if rollback is deterministic, otherwise it animates after confirmation;
- if the server rejects rotation due to footprint conflict, the object must visually return to the authoritative orientation.

Placement state continues to support clockwise/counterclockwise preview rotation before confirm.

### 8.7 Remove behavior

Browser `window.confirm` is replaced by in-product confirmation.

Decorative removal uses lightweight inline confirmation. Main/important removable structures use a clearer confirmation treatment with the object name.

Home never exposes Remove.

## 9. Expansion UX

### 9.1 World-first expansion selection

Expansion moves from a list-centric panel to world-centric cluster selection.

Normal world toolbar contains approximately:

`Build · Expand · Reset View`

Entering Expand:

- eligible edge clusters are visible in amber;
- selecting a cluster previews its exact shape in-world;
- compact UI shows `+N hexes · Cost Points`;
- confirm happens from the shared action area.

Users should not need to reason through a long list of expansion definitions when the geometry is easier to understand directly on the island.

### 9.2 Confirmed expansion animation

Animation begins only after the existing server transaction confirms the purchase.

Sequence:

1. amber ghost cluster disappears/transitions;
2. mist/cloud intensifies briefly beneath the selected area;
3. confirmed hexes rise from below with staggered timing;
4. ambient grass/rocks settle in;
5. optional subtle dust/sparkle completes the reveal;
6. camera reframes only if needed.

Typical duration: approximately 700–1100 ms.

Expansion remains non-undoable in Phase 2 because it changes the shared Points economy and permanent land extent.

## 10. Motion Language

All major motion follows one language: **soft, weighted, slightly springy, short, and interruptible.**

Typical durations:

- UI / selection / placement transitions: 160–350 ms;
- camera ease: slightly slower than UI and immediately interruptible;
- expansion reveal: 700–1100 ms.

Examples include slight descend + settle for Place, source fade/ghost transition + settle for Move, 60° spring rotation, shrink/fade for Remove, soft highlight + small lift impression for Select, short panel slide/fade, and staggered tile rise for expansion.

Avoid exaggerated cartoon bounce.

## 11. One-Step Undo

### 11.1 Scope and ownership

Undo is supported for the latest successful action only:

- Place
- Move
- Rotate
- Remove

Undo is not supported for expansion.

The existing `requireConfigAccess` boundary provides `configId` and authenticated `userId`. Undo ownership is therefore scoped explicitly by **`(configId, landId, userId)`**.

Only one undo opportunity is valid for that scope at a time. A newer successful reversible mutation for the same authenticated user on the same Land replaces and invalidates the previous one.

### 11.2 User experience

After a reversible mutation succeeds, the toast includes `Undo`, for example:

`Bench placed · Undo`

The undo opportunity lives for approximately 12 seconds. The exact implementation constant should be centralized and covered by tests.

### 11.3 Server-owned undo token

The server returns an opaque random `undoToken`, action type, and expiry metadata after a reversible mutation.

The client does not receive or control the trusted inverse-state payload.

Redis is the Phase 2 storage mechanism because it is already part of the production stack and the undo history is intentionally ephemeral. No long-lived database history table is introduced.

The server maintains:

- a token payload keyed by opaque token identity;
- a latest-token pointer keyed by `(configId, landId, userId)`.

Creating a newer reversible action atomically replaces the latest pointer and invalidates the previous token payload for that scope.

Token payload contains only the minimum trusted inverse data and expected post-action state required for validation.

### 11.4 Undo safety rules

Undo must never overwrite a newer valid world edit.

Each token records the expected post-action state. Before applying the inverse, the server verifies that the current authoritative state still matches what the token expects.

Examples:

- Place undo deletes the placed building only if that building still exists in the expected just-placed state.
- Move undo restores previous anchor/rotation only if the building still matches the move result and the old footprint is still valid/free.
- Rotate undo restores the previous rotation only if the building still matches the rotated state.
- Remove undo recreates the removed building only if its old footprint remains valid/free and no replacement building now owns the same ID.

If semantic state changed, return `undo_conflict` and invalidate the stale undo opportunity.

If the token is missing, expired, superseded, or already used, return `undo_unavailable`.

Transient transaction/Redis failure must not be reported as successful undo.

### 11.5 Double-click/concurrency protection

Undo must be one-time and concurrency-safe. A double click or two parallel requests using the same token must produce at most one successful inverse mutation.

Implementation uses a short-lived Redis claim/lock for the token while leaving the trusted payload available until the database outcome is known. The inverse world mutation runs in a Serializable transaction. On successful commit, the token payload/latest pointer are consumed. If the database transaction fails before commit, the claim is released and no successful undo is reported.

This avoids both double execution and token loss caused by consuming Redis state before the database result is known.

### 11.6 API

Add a dedicated authenticated endpoint:

`POST /api/hex-world/undo`

Request body contains only:

- `landId`
- `undoToken`

The server resolves all inverse state from trusted server-side storage and uses the caller's `configId` and `userId` from `requireConfigAccess`. It verifies the token belongs to the same `(configId, landId, userId)` scope before mutation.

Stable error codes introduced by Phase 2:

- `undo_unavailable`
- `undo_conflict`

Existing HexWorld error codes remain unchanged.

## 12. Component Architecture

The visual pass must not turn `HexWorld3D.tsx` or `HexBuildController.tsx` into monoliths.

Target rendering responsibilities:

- `HexWorld3D` — scene composition and public renderer props only.
- `HexDioramaCamera` — bounds, camera intent, entry/reset/focus/reframe behavior.
- `HexWorldLighting` — hero light/fill/shadow setup.
- `HexSkyAtmosphere` — sky, fog, cloud layers, distant atmosphere.
- `HexIslandUnderside` — stable organic rock underside/fragments.
- `HexAmbientDecor` — deterministic grass/rocks/flowers/path/vegetation instances.
- `HexWorldParticles` — shared particle buffers and quality-aware effects.
- `HexSelectionEffects` — selected/hovered/build footprint visualization.
- `HexBuildings` / building model modules — placed objects and premium model compositions.

Interaction responsibilities:

- `HexBuildController` remains orchestration for build interaction but delegates catalog, contextual toolbar, placement bar, expansion controls, undo toast state, and camera intent through focused child components/hooks.
- Pure `validatePlacement` remains the client preview engine.
- API service remains the only browser boundary for persistent HexWorld mutations.

Server responsibilities:

- Existing HexWorld service remains authoritative for placement, move, rotate, remove, expansion.
- Reversible mutations gain creation of short-lived undo state.
- Undo logic lives in a dedicated server-side unit rather than embedding token semantics into React/API route files.

Exact file names may be adjusted during implementation planning to match repository conventions, but responsibility boundaries are mandatory.

## 13. Adaptive Quality and Performance Budget

### 13.1 Quality profiles

Quality uses the existing graphics-quality setting plus viewport/device characteristics. It does not continuously auto-adjust based on live FPS in Phase 2.

Target profiles:

| Feature | High | Medium | Mobile/Low |
| --- | --- | --- | --- |
| DPR | up to ~1.75 | ~1.35 | ~1.0 |
| Main shadow | 2048 | 1024 | 512 or off when necessary |
| Decorative particles | full | reduced | minimal |
| Cloud layers | 3 | 2 | 1 |
| Wind animation | full | reduced | selective |
| Ambient vegetation | 100% | ~75% | ~50% |
| Contact shadow | high | medium | simplified |
| Water detail | full | reduced | basic animated surface |

These are target budgets, not promises that require exact values if device testing shows a better threshold.

### 13.2 Render rules

- terrain remains instanced;
- ambient grass/rocks/flowers/path use instancing by asset type;
- repeated identical tree geometry should use instancing where practical;
- user-placed buildings remain individually selectable scene nodes;
- particles use shared buffers/points, not one React component per particle;
- clouds do not cast shadows;
- only one primary real-time directional shadow source;
- no real-time planar reflection;
- no mandatory expensive full-scene postprocessing chain;
- pointer hover/orbit never causes network writes.

### 13.3 Performance success target

Desktop Medium should feel smooth during orbit, zoom, hover, and placement on supported production island sizes.

Mobile fallback must remain usable in portrait and landscape without catastrophic frame drops caused by clouds, particles, vegetation, or shadow resolution.

The implementation plan must define concrete smoke/performance checks using actual target devices or browser emulation where automated FPS testing is unreliable.

## 14. Mobile and Accessibility Constraints

- no horizontal UI overflow;
- interactive targets at least approximately 44–48 px;
- safe-area aware bottom controls;
- Build/Expand sheets do not permanently cover more than approximately half the viewport;
- pinch zoom does not place/select by accident;
- drag orbit does not place/select by accident;
- screen-projected contextual toolbar is clamped to viewport;
- small-screen fallback uses bottom action bar;
- keyboard shortcuts never replace visible actions;
- disabled actions expose a reason/state, not only reduced opacity;
- color highlights should be supported by shape/text state where practical so validity is not communicated by color alone.

## 15. Error Handling and State Consistency

### 15.1 General mutation behavior

Permanent visual state changes only after authoritative confirmation unless the UI has a fully deterministic rollback path.

On placement/move failure:

- keep ghost/context active;
- show concise actionable error;
- do not reset the entire builder state.

On world reload/switch:

- clear transient selection, placement, and undo UI that belongs to the prior Land;
- stale network responses must not overwrite the current Land.

### 15.2 Camera failure isolation

Camera animation/state must never block persistent game actions. If calculated bounds are unavailable or invalid, fall back to a safe known overview framing without mutating HexWorld data.

### 15.3 Redis/Undo degradation

Core Place/Move/Rotate/Remove must not become unavailable solely because ephemeral Undo storage is down.

If a primary mutation succeeds but undo-token creation fails:

- return the successful authoritative HexWorld result;
- omit Undo capability for that action;
- log the undo-storage failure;
- never report the world mutation as failed when it already committed successfully.

Undo is a safety convenience, not a prerequisite for core world persistence.

## 16. Testing Strategy

### 16.1 Pure rendering/interaction logic

Cover:

- camera bounds calculation;
- overview framing for small and expanded worlds;
- camera focus/reset intent transitions;
- quality-profile selection;
- deterministic visual variation for vegetation/underside;
- placement reason mapping;
- contextual-toolbar viewport clamping;
- Build/Expand state separation;
- keyboard action mapping without duplicate commits.

### 16.2 Component/integration smoke

Cover:

- Home tab remains pointer-interactive with world;
- Build catalog opens/closes without changing app-shell navigation;
- contextual toolbar appears for selected building;
- Home does not expose Remove;
- invalid placement keeps context;
- Reset View exists and does not reintroduce game-mode UI;
- Expand selects clusters in-world;
- mobile fallback controls are rendered at small viewport.

### 16.3 Server/DB integration

Use real Postgres plus a controlled Redis/test adapter in CI for:

- reversible Place returns valid undo metadata;
- Place undo removes the expected building;
- Move undo restores the previous anchor/rotation;
- Rotate undo restores previous rotation;
- Remove undo recreates the expected building;
- token ownership rejects a different `userId`, `configId`, or `landId`;
- a newer mutation supersedes the prior token for the same `(configId, landId, userId)` scope;
- stale-state undo returns `undo_conflict` without overwriting newer state;
- expired/unknown/reused token returns `undo_unavailable`;
- double concurrent undo succeeds at most once;
- failed inverse placement leaves authoritative world unchanged;
- expansion never returns an undo token;
- core building mutations still succeed when undo-token storage is unavailable;
- existing expansion idempotency and Points tests remain green;
- legacy `PurchasedItem` preservation remains green.

### 16.4 Regression gates

Must continue to pass:

- HexWorld CI;
- existing DB migration/transaction tests;
- family-farm regression;
- Prisma validation if schema changes are introduced;
- lint;
- production Next.js build.

## 17. Acceptance Journey

Phase 2 is accepted only when this journey works without dead ends:

`Open Garden → hero island reveal → orbit/zoom → Build → choose item → preview footprint → rotate → place → select building → focus → move → rotate → Undo → remove → Undo where valid → Expand → preview cluster in-world → confirm expansion → watch island grow → Reset View → switch Land → return → reload`

### Visual acceptance

- island reads as one floating miniature world rather than a raw grid;
- Home is a clear focal point;
- pond/garden/path/tree grove composition feels intentional;
- buildings share one premium art language;
- clouds/depth/magic improve the scene without covering buildable land;
- normal view is visually clean; build grid becomes explicit only when needed.

### Interaction acceptance

- no dead ends;
- contextual controls stay near the selected object or fall back cleanly;
- invalid placement communicates the reason;
- server rejection never leaves a misleading permanent visual state;
- Home remains non-removable;
- expansion spends Points only through the existing confirmed transaction;
- Undo never overrides newer valid edits.

### Persistence acceptance

- placement/rotation/expansion persist through reload;
- switching Lands never mixes transient or persistent state;
- starter/legacy data is not regenerated destructively;
- `PurchasedItem` and family-farm saves remain untouched.

### Performance acceptance

- desktop Medium remains responsive while orbiting/building;
- mobile fallback remains usable in portrait and landscape;
- cloud/particle/vegetation reductions do not change core visual identity;
- no hover/orbit server writes.

## 18. Release Verification

Before merge:

1. full Phase 2 test suite green;
2. HexWorld DB-backed integration tests green;
3. family-farm regression green;
4. lint green;
5. production build green;
6. any Prisma migration validated as additive/non-destructive.

After merge:

1. verify Railway deploy corresponds to merged `main` SHA;
2. verify app, Postgres, and Redis report healthy/successful states;
3. inspect runtime logs for successful migration/startup and absence of destructive cleanup;
4. smoke `/garden` on an authenticated safe Land;
5. confirm hero camera, Build, Move, Rotate, Remove, Undo, Expand, Reset View, Land switch, and reload;
6. confirm existing legacy item count is not reduced by HexWorld activity;
7. verify mobile layout on at least portrait and landscape viewport sizes.

## 19. Non-Goals

Phase 2 does not add:

- farming economy;
- crafting;
- resource-production buildings;
- NPCs;
- avatar walking;
- WASD controls;
- multiplayer building;
- seasons;
- weather gameplay;
- long undo history;
- undo for expansion;
- terrain sculpting;
- real-time planar water reflection;
- heavy required bloom/DOF pipeline;
- dynamic FPS-driven quality switching.

## 20. Locked Decisions Summary

- Priority is **Visual Wow first, Builder UX second**.
- Visual direction is **Magical Floating Garden + Premium Miniature Diorama**.
- Phase 2 follows a **Hero Island Polish** approach rather than a surface-only tweak or unlimited art overhaul.
- The island is visually one diorama; hex remains the authoritative infrastructure.
- Smart Overview/Focus/Build framing replaces hard-coded camera framing.
- Reset View is bounds-aware.
- Building catalog stays the current MVP set; visuals are upgraded cohesively.
- Build catalog becomes a compact world-supporting tray/sheet.
- Selected-object controls become contextual.
- Expansion selection becomes in-world first.
- One-step Undo covers Place/Move/Rotate/Remove only.
- Undo is scoped by authenticated `(configId, landId, userId)` and uses short-lived trusted Redis state with one-time/concurrency-safe semantics.
- Core mutations remain available if Undo storage is temporarily unavailable.
- Expansion remains transactional, server-authoritative, and non-undoable.
- Rendering quality scales by profile, not continuous FPS adaptation.
- Existing app shell, HexWorld persistence, shared Points economy, legacy `PurchasedItem`, and family-farm saves remain intact.
