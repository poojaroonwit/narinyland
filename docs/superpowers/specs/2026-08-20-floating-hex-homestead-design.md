# Floating Hex Homestead Design

Date: 2026-08-20
Status: Design approved in chat; awaiting written-spec review before implementation
Target: `poojaroonwit/narinyland`
Primary route: `/garden`

## 1. Product Direction

Narinyland `/garden` will be replaced with a **Cozy Floating Homestead** experience. The current classic 3D garden renderer will no longer be the primary world surface once this design is implemented.

The experience is a stylized floating 3D island built from hexagonal tiles. A new Land begins with an organic island generated inside an approximately 20x20 axial-coordinate envelope. Players can decorate the island, place useful structures, move and rotate placed objects, and expand the island over time by unlocking additional hex clusters.

The design deliberately avoids a character-control game mode. There is no LAND/WORLD switch, no WASD exploration mode, and no separate game-mode selector. The camera remains an elevated orbit/isometric-style builder camera.

Existing app-level navigation remains visible and independent of the world renderer. Circle switching, Land switching, profile, settings, proposal flow, and the existing Home / Timeline / Coupons / Letters navigation are preserved.

### MVP goals

The first release must support:

- a floating hex island rendered in 3D;
- an initial world footprint of roughly 20x20 coordinates;
- an organic starter island of about 300 +/- 40 unlocked tiles rather than a visible square grid;
- build, preview, rotate, place, move, and remove interactions;
- land expansion by unlocking predefined clusters;
- starter structures and decorations;
- server-authoritative persistence;
- backward-safe migration from existing Land data;
- responsive desktop and mobile interaction;
- no destructive migration of legacy `PurchasedItem` data.

The first release is intentionally a **cozy building sandbox**, not a city-economy simulator. Building placement is free in the MVP. Spendable partner Points are used for Land expansion only.

## 2. Player Experience

### 2.1 First load

When a player opens `/garden` for a Land that does not yet have a hex world, the server lazily initializes one. The first view should immediately show a small floating homestead rather than an empty editor.

The starter island contains:

- one starter Home near the visual center;
- a small garden area;
- a pond positioned off-center;
- a loose tree grove on one side;
- stone-path fragments connecting the central area;
- rock and flower clusters around island edges;
- substantial empty buildable space so the player can shape the world themselves.

The generated composition is deterministic from `landId`; retrying initialization must produce the same world rather than a different random island.

### 2.2 Main interaction loop

The primary loop is:

1. view the floating island;
2. press **Build**;
3. choose a catalog item;
4. hover/select a hex tile;
5. inspect a ghost preview;
6. rotate if necessary;
7. place the object;
8. later select an object to Move, Rotate, or Remove;
9. expand the Land when more space is needed.

The normal view keeps the grid visually quiet. Hex outlines become prominent only while selecting, building, moving, or expanding.

### 2.3 Placement feedback

Placement states are consistent across desktop and mobile:

- green: valid placement;
- red: invalid or occupied placement;
- amber: available expansion area;
- white: current selection.

Server validation is authoritative. Client highlights are previews only.

### 2.4 Camera

The camera uses a three-quarter elevated perspective suitable for a diorama/building game.

Required camera behaviors:

- orbit around island center;
- constrained zoom;
- optional light pan where appropriate;
- smooth damping;
- no player-avatar movement controls;
- no Explore / Orbit mode switch exposed to the player.

## 3. Visual Design

### 3.1 Art direction

The world uses a **rounded, stylized, low-poly 3D** language rather than photorealism or technical-grid visuals.

Key characteristics:

- chunky readable silhouettes;
- slightly oversized roofs and vegetation;
- warm wood, cream stone, sage/olive grass, and turquoise water;
- soft directional lighting and contact shadows;
- modest saturation;
- subtle atmospheric clouds and fog beneath the island;
- visible rock/soil mass below the grass layer;
- small floating rock fragments around the island for depth.

The goal is a familiar cozy-life-sim presentation without copying a specific existing game.

### 3.2 Hex tiles

Hexes are 3D prisms, not flat planes. Each tile can have:

- axial coordinate `q`, `r`;
- terrain type;
- small height variation;
- unlocked/locked state;
- build occupancy derived from buildings.

Normal view should visually merge adjacent tiles through matching material, vegetation, and lighting. Strong grid borders are avoided outside interaction states.

### 3.3 Starter island shape

The initial coordinate envelope is approximately 20x20. The generator masks and shapes this envelope so the unlocked island is irregular and natural instead of a visible rectangle.

Target unlocked count: approximately 260-340 tiles.

The remaining nearby coordinates form future expansion candidates or remain absent until generated by an expansion definition.

### 3.4 Expansion animation

Expanding Land is a visual reward. Confirmed expansion clusters animate upward from clouds/void and settle into the island.

The animation must not determine state. Server state is committed first; the client animates the confirmed result.

## 4. Hex Coordinate System

The world uses axial hex coordinates `(q, r)` as the canonical logical coordinate system.

Core shared utilities must include:

- axial to world-space conversion;
- world-space to axial selection conversion;
- neighbor lookup;
- distance calculation;
- six-direction rotation;
- building-footprint rotation;
- deterministic coordinate ordering for persistence and tests.

World-space `x/y/z` remains a rendering concern. Building and expansion rules are expressed in hex coordinates so layout logic does not depend on arbitrary mesh positions.

## 5. Building System

### 5.1 Building catalog

A shared catalog is used by both client and server. MVP categories are:

#### Main structures

- Home
- Storage
- Workshop

#### Nature and decoration

- Tree
- Flower Patch
- Pond
- Bench
- Lamp
- Fence
- Stone Path

#### Utility

- Garden Patch

The catalog entry for each building defines at minimum:

- stable building key;
- category;
- display name;
- visual/model reference;
- footprint in axial offsets;
- supported terrain types;
- allowed rotations;
- whether duplicates are allowed;
- optional metadata defaults.

### 5.2 Footprints

The data model supports multi-hex buildings from the beginning even though most decorative objects are 1-hex in the MVP.

A building has an anchor hex and rotation from 0 through 5. The server rotates the catalog footprint and validates every occupied coordinate before placement or movement.

### 5.3 Server placement rules

A placement is valid only when:

- the Land belongs to the active config/circle;
- every footprint coordinate exists;
- every footprint coordinate is unlocked;
- no other building occupies any required coordinate;
- terrain constraints are satisfied;
- the building key exists in the server catalog;
- the requested rotation is allowed.

The client never supplies a trusted price or trusted footprint.

### 5.4 Object editing

Selecting a placed building exposes a compact contextual action menu:

- Move
- Rotate
- Remove

Move enters the same ghost-placement flow as new placement. The old placement remains authoritative until the server accepts the new coordinates.

Remove requires confirmation for main/important structures. Starter Home removal may be disabled in the MVP to ensure each Land retains a home anchor.

## 6. Expansion System

Land expansion unlocks predefined connected clusters rather than individual tiles.

Initial recommended cluster sizes are:

- first expansion: 7 hexes;
- second tier: 19 hexes;
- later tier: 37 hexes.

Expansion definitions are deterministic and connected to the current island edge. The UI shows only eligible clusters.

Recommended point-cost progression:

- 7 hexes: 100 Points;
- 19 hexes: 250 Points;
- 37 hexes: 500 Points;
- later costs scale from expansion level using a server-owned rule.

The exact catalog may offer multiple edge clusters at the same tier, but a cluster must not be unlockable twice.

### 6.1 Atomic expansion transaction

Expansion is committed in one Serializable transaction:

1. validate config and Land access;
2. load the target expansion definition;
3. reject already-unlocked expansion IDs;
4. verify the cluster is currently eligible/adjacent;
5. verify spendable Points;
6. deduct Points;
7. create or unlock the target tiles;
8. record expansion ownership/state;
9. increment expansion progression;
10. commit.

The existing P2034 retry pattern used by stats/farm transactions should be reused.

### 6.2 Idempotency

Expansion requests carry an idempotency key or stable expansion identifier so double-clicks and network retries cannot charge twice.

## 7. Persistence Model

The implementation adds new models rather than overloading legacy `PurchasedItem` coordinates.

### 7.1 `HexWorld`

One per `Land`.

Suggested fields:

- `id` UUID;
- `landId` unique FK;
- `schemaVersion` integer;
- `generatorVersion` integer/string;
- `seed` string;
- `expansionLevel` integer;
- timestamps.

### 7.2 `HexTile`

Suggested fields:

- `id` UUID;
- `worldId` FK;
- `q` integer;
- `r` integer;
- `terrainType` string;
- `height` float;
- `unlocked` boolean;
- optional metadata JSON;
- timestamps;
- unique `(worldId, q, r)`.

Only generated/unlocked/candidate tiles need records. The system does not pre-create an unbounded world.

### 7.3 `HexBuilding`

Suggested fields:

- `id` UUID;
- `worldId` FK;
- `buildingKey` string;
- `anchorQ` integer;
- `anchorR` integer;
- `rotation` integer 0-5;
- optional `modelUrl` for supported custom assets;
- metadata JSON;
- timestamps.

Occupancy is derived from the catalog footprint plus anchor and rotation; duplicate per-tile occupancy rows are not required for the MVP.

### 7.4 `HexExpansion`

Suggested fields:

- `id` UUID;
- `worldId` FK;
- `expansionKey` string;
- `tier` integer;
- `pointCost` integer recorded for audit;
- timestamps;
- unique `(worldId, expansionKey)`.

## 8. API Design

All routes use the current `requireConfigAccess` authorization pattern and validate that the supplied/active `landId` belongs to the authorized config.

### `GET /api/hex-world`

Returns a snapshot for the active/specified Land:

- world metadata;
- tiles needed for rendering/building;
- placed buildings;
- eligible expansion summaries;
- current expansion progression;
- spendable Points summary needed by the UI.

If a HexWorld does not exist, the server lazily initializes the deterministic starter world.

### `POST /api/hex-world/buildings`

Places a building after server-side catalog and collision validation.

### `PATCH /api/hex-world/buildings/[id]`

Moves and/or rotates a building using the same placement validator.

### `DELETE /api/hex-world/buildings/[id]`

Removes a building when removal rules permit it.

### `POST /api/hex-world/expand`

Atomically purchases and unlocks one eligible expansion cluster.

Error responses use stable error codes and user-safe messages such as:

- `tile_locked`;
- `tile_occupied`;
- `invalid_terrain`;
- `invalid_building`;
- `invalid_rotation`;
- `expansion_not_available`;
- `not_enough_points`;
- `land_access_denied`.

## 9. Client Architecture

The new Garden world should be split into focused modules instead of growing one large renderer component.

Recommended boundaries:

- `hex-grid.ts`: coordinates, rotations, geometry math;
- `hex-world-generator.ts`: deterministic starter/expansion definitions shared by server tests and initialization;
- `building-catalog.ts`: catalog and footprint definitions safe to share;
- `hex-world-service.ts`: server persistence/transactions;
- `HexWorld3D.tsx`: high-level scene composition;
- `HexTileInstances.tsx`: instanced terrain/selection rendering;
- `HexBuildings.tsx`: placed-building rendering;
- `HexBuildController.tsx`: selection/preview/placement local state;
- `HexBuildCatalog.tsx`: catalog UI;
- `HexExpansionController.tsx`: expansion preview/confirmation;
- client API service additions for the new routes.

The app shell remains outside this renderer. The world must not own Circle switching, Land switching, user profile, settings, or main romantic-feature navigation.

## 10. Rendering and Performance

The starter world contains several hundred hexes, so repeated geometry uses instancing.

Required rendering strategy:

- `InstancedMesh` or equivalent batching for hex ground blocks;
- instancing for repeated grass/rocks/flowers where practical;
- individual scene nodes only for meaningful placed buildings;
- limited real-time shadows, focused on important structures;
- reduced decoration density on low quality/mobile;
- hover selection through coordinate/raycast lookup rather than React state per tile;
- no server write on hover, camera movement, or preview movement.

The medium-quality target is smooth interaction on desktop and a typical mid-range mobile device.

## 11. Migration and Backward Safety

Migration is lazy and additive.

When a Land is opened:

1. load existing Land normally;
2. if no `HexWorld` exists, create it deterministically;
3. generate starter tiles;
4. create one starter Home;
5. leave all legacy `PurchasedItem` rows untouched;
6. return the new HexWorld snapshot.

Legacy objects may be imported later only when their type and footprint can be mapped safely. Custom GLB objects that lack a known footprint remain legacy data until a dedicated import design exists.

No production startup script may destructively drop legacy tables or erase rows as part of this feature.

The old 2D family-farm save remains untouched in storage, but the new `/garden` world does not mount that experience.

## 12. State Ownership and Failure Behavior

The server owns:

- unlocked tiles;
- expansion progression;
- placed buildings;
- coordinates and rotations;
- Points deduction for expansion.

The client owns transient interaction state:

- camera transform;
- hover hex;
- selected building;
- build catalog state;
- ghost preview;
- expansion preview animation.

Placement/move/remove interactions do not visually commit as permanent state until the server confirms. If a mutation fails, the ghost/selection remains available and a meaningful toast is shown.

If world loading fails, the client displays a retry state. It does not silently generate a replacement world client-side.

## 13. Security and Concurrency

- All mutations authorize config and Land ownership/membership.
- Prices, footprints, terrain rules, expansion clusters, and rotation rules come from server-owned definitions.
- Expansion transactions use Serializable isolation and conflict retry.
- Building mutation validation is performed against current database state to prevent overlapping placements from concurrent clients.
- Stable mutation errors are returned without exposing database internals.

## 14. Testing and Release Gates

Unit/integration coverage must include:

- axial neighbor and distance functions;
- axial/world-space conversion where deterministic inputs allow it;
- deterministic starter generation from a fixed `landId`/seed;
- starter tile-count bounds and connectivity;
- six-direction footprint rotation;
- collision detection;
- locked-tile rejection;
- terrain-rule rejection;
- valid place/move/rotate/remove flows;
- expansion adjacency/eligibility;
- expansion point deduction atomicity;
- duplicate expansion idempotency;
- concurrent placement/expansion conflict handling;
- lazy HexWorld creation;
- legacy `PurchasedItem` preservation;
- Circle/config/Land authorization boundaries;
- Garden world render smoke test;
- build-preview interaction smoke tests where practical.

Every implementation PR must pass:

- relevant unit/integration tests;
- ESLint;
- TypeScript/Next.js production build;
- existing Garden/farm regression tests that still apply;
- Railway deployment verification after merge.

## 15. Non-Goals for the MVP

The following are intentionally excluded from the first implementation:

- full production-chain/city-builder economy;
- resource generators and factories;
- character/avatar walking controls;
- multiplayer movement simulation;
- freeform terrain sculpting;
- arbitrary user-authored building footprints;
- converting every legacy GLB object automatically;
- seasons, festivals, NPC schedules, or family simulation;
- charging Points for individual buildings;
- an infinite pre-generated map.

These can build on the HexWorld foundation later without being prerequisites for the first playable floating homestead.

## 16. Acceptance Criteria

The design is implemented successfully when:

1. opening `/garden` on a new/current Land displays a floating stylized hex island;
2. a new HexWorld initializes deterministically without deleting legacy Land data;
3. the starter island occupies an organic subset of an approximately 20x20 envelope and exposes meaningful free build space;
4. the player can open Build, preview a catalog object, rotate it, place it on valid unlocked hexes, move it, and remove permitted objects;
5. overlapping/locked/invalid placement is rejected by the server;
6. the player can purchase eligible connected expansion clusters using Points with atomic/idempotent transactions;
7. the island visually grows after a confirmed expansion;
8. the Garden app shell and main menu remain available independently of the 3D world;
9. no game-mode/character-control switch is introduced;
10. legacy `PurchasedItem` and family-farm data remain intact;
11. tests, lint, production build, and deployment checks pass.
