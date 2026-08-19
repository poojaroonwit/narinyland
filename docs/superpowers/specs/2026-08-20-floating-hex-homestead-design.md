# Floating Hex Homestead Design

Date: 2026-08-20
Status: Design approved in chat; awaiting written-spec review before implementation
Target: `poojaroonwit/narinyland`
Primary route: `/garden`

## 1. Product Direction

Narinyland `/garden` will be replaced with a **Cozy Floating Homestead** experience. The current classic 3D garden renderer will no longer be the primary world surface once this design is implemented.

The experience is a stylized floating 3D island built from hexagonal tiles. Each Land owns one HexWorld. A new world begins from a 20x20 starter axial envelope and exposes an organic connected subset as usable Land. Players decorate the island, place useful structures, move and rotate placed objects, and expand the island by unlocking additional connected hex clusters.

The design deliberately avoids a character-control game mode. There is no LAND/WORLD switch, no WASD exploration mode, no Explore/Orbit mode selector, and no separate game-mode selector. The world uses one elevated diorama camera with orbit and constrained zoom.

Existing app-level navigation remains visible and independent of the world renderer. Circle switching, Land switching, profile, settings, proposal flow, and the existing Home / Timeline / Coupons / Letters navigation are preserved.

### MVP goals

The first release must support:

- a floating hex island rendered in 3D;
- a starter coordinate envelope with exactly 400 candidate coordinates;
- an organic connected starter island containing 260-340 unlocked tiles;
- build, preview, rotate, place, move, and remove interactions;
- Land expansion by unlocking predefined connected clusters;
- starter structures and decorations;
- server-authoritative persistence;
- backward-safe migration from existing Land data;
- responsive desktop and mobile interaction;
- no destructive migration of legacy `PurchasedItem` or family-farm data.

The first release is intentionally a **cozy building sandbox**, not a city-economy simulator. Building placement is free in the MVP. Spendable shared partner Points are used for Land expansion only.

## 2. Player Experience

### 2.1 First load

When a player opens `/garden` for a Land that does not yet have a HexWorld, the server lazily initializes one. The first view immediately shows a small floating homestead rather than an empty editor.

The starter composition contains:

- one starter Home anchored at hex `(0, 0)`;
- a small garden area;
- a pond positioned off-center;
- a loose tree grove on one side;
- stone-path fragments connecting the central area;
- rock and flower clusters around island edges;
- substantial empty buildable space so the player can shape the world themselves.

The generator must guarantee that `(0, 0)` is unlocked and suitable for the starter Home.

The generated composition is deterministic from a persisted seed derived from `landId` and `generatorVersion`. Retrying initialization must produce the same world rather than a different random island.

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

- orbit around the island center;
- constrained zoom;
- smooth damping;
- no camera pan in the MVP;
- no player-avatar movement controls;
- no camera/game mode switch exposed to the player.

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

Hexes are 3D prisms, not flat planes. Each tile has:

- axial coordinate `q`, `r`;
- terrain type;
- small deterministic height variation;
- unlocked/locked state;
- build occupancy derived from placed buildings.

Normal view visually merges adjacent tiles through matching materials, vegetation, and lighting. Strong grid borders are avoided outside interaction states.

### 3.3 Starter island shape

The exact starter coordinate envelope is:

- `q = -10..9`;
- `r = -10..9`;
- 400 candidate coordinates total.

The generator applies a deterministic organic mask and connectivity pass so 260-340 of these coordinates are unlocked while the island remains a single connected component. The remaining starter-envelope coordinates may be retained as locked visual candidates or omitted from normal rendering.

Expansion clusters may extend outside this original 400-coordinate envelope.

### 3.4 Expansion animation

Expanding Land is a visual reward. Confirmed expansion clusters animate upward from clouds/void and settle into the island.

The animation never determines state. The server commits the expansion first; the client animates only the confirmed result.

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

Each catalog entry defines:

- stable building key;
- category;
- display name;
- visual/model reference;
- footprint in axial offsets;
- supported terrain types;
- allowed rotations;
- duplicate policy;
- default metadata.

### 5.2 Footprints

The data model supports multi-hex buildings from the beginning even though most decorative objects are one hex in the MVP.

A building has an anchor hex and a rotation from 0 through 5. The server rotates the catalog footprint and validates every occupied coordinate before placement or movement.

### 5.3 Server placement rules

A placement is valid only when:

- the Land belongs to the active authorized config/circle;
- every footprint coordinate exists in the generated/unlocked world state;
- every footprint coordinate is unlocked;
- no other building occupies any required coordinate;
- terrain constraints are satisfied;
- the building key exists in the server catalog;
- the requested rotation is allowed.

The client never supplies a trusted price, footprint, or terrain rule.

### 5.4 Object editing

Selecting a placed building exposes a compact contextual action menu:

- Move
- Rotate
- Remove

Move enters the same ghost-placement flow as new placement. The old placement remains authoritative until the server accepts the new coordinates.

The starter Home can be moved and rotated but **cannot be removed in the MVP**. Removal of other structures requires confirmation when the catalog marks them as important.

## 6. Expansion System

Land expansion unlocks predefined connected clusters rather than individual tiles.

The MVP expansion catalog supports these exact cluster sizes and costs:

- 7 hexes: 100 Points;
- 19 hexes: 250 Points;
- 37 hexes: 500 Points.

The catalog may contain multiple uniquely keyed clusters of each supported size around different island edges. Costs depend only on cluster size in the MVP; there is no hidden dynamic price multiplier.

An expansion is eligible only when:

- its `expansionKey` has not already been purchased;
- at least one cluster tile is adjacent to a currently unlocked tile;
- the cluster does not overlap another purchased expansion in an invalid way;
- the current shared spendable Points are sufficient.

`expansionLevel` is the count of successfully purchased expansion clusters, not a price tier.

### 6.1 Shared Points deduction

Expansion uses the same shared partner Points pool already represented by current stats logic. Deduction is deterministic:

1. load partners for the config ordered by `points DESC, id ASC`;
2. deduct from the highest balance first;
3. continue until the expansion cost is fully covered;
4. never alter historical/lifetime totals merely because Points are spent.

The implementation should extract/reuse a shared transaction helper rather than duplicate inconsistent deduction logic across features.

### 6.2 Atomic expansion transaction

Expansion is committed in one Serializable transaction:

1. validate config and Land access;
2. load the target server-owned expansion definition;
3. return the existing expansion result if `expansionKey` is already purchased;
4. verify current eligibility/adjacency;
5. verify spendable Points;
6. deduct Points using the shared deterministic rule;
7. create/unlock the target tiles;
8. create the `HexExpansion` audit record;
9. increment `expansionLevel`;
10. commit.

The existing P2034 conflict-retry pattern used by current stats/farm transactions is reused.

### 6.3 Idempotency

`expansionKey` is the idempotency identity for the MVP. The database unique constraint `(worldId, expansionKey)` guarantees that retries or double-clicks cannot charge twice. A repeated request for an already-purchased expansion returns the already-confirmed world/expansion state without another deduction.

## 7. Persistence Model

The implementation adds new Prisma models rather than overloading legacy `PurchasedItem` coordinates.

### 7.1 `HexWorld`

One per `Land`.

Required fields:

- `id String @id @default(uuid())`;
- `landId String @unique`;
- `schemaVersion Int`;
- `generatorVersion Int`;
- `seed String`;
- `expansionLevel Int @default(0)`;
- `createdAt DateTime @default(now())`;
- `updatedAt DateTime @updatedAt`;
- relation to `Land` with cascade on Land deletion;
- relations to tiles, buildings, and expansions.

### 7.2 `HexTile`

Required fields:

- `id String @id @default(uuid())`;
- `worldId String`;
- `q Int`;
- `r Int`;
- `terrainType String`;
- `height Float`;
- `unlocked Boolean`;
- `metadata Json @default("{}")`;
- timestamps;
- relation to `HexWorld` with cascade on world deletion;
- unique `(worldId, q, r)`;
- index `(worldId, unlocked)`.

The starter initialization persists the 400 starter-envelope coordinates so locked candidates have stable state. Expansion tiles outside the envelope are created only when their expansion is purchased.

### 7.3 `HexBuilding`

Required fields:

- `id String @id @default(uuid())`;
- `worldId String`;
- `buildingKey String`;
- `anchorQ Int`;
- `anchorR Int`;
- `rotation Int` constrained in application logic to 0-5;
- `modelUrl String?` for catalog-supported custom assets only;
- `metadata Json @default("{}")`;
- timestamps;
- relation to `HexWorld` with cascade on world deletion;
- indexes on `worldId` and `(worldId, anchorQ, anchorR)`.

Occupancy is derived from the server catalog footprint plus anchor and rotation; duplicate per-tile occupancy rows are not required for the MVP.

### 7.4 `HexExpansion`

Required fields:

- `id String @id @default(uuid())`;
- `worldId String`;
- `expansionKey String`;
- `tileCount Int`;
- `pointCost Int` recorded for audit;
- timestamps;
- relation to `HexWorld` with cascade on world deletion;
- unique `(worldId, expansionKey)`.

## 8. API Design

All routes use the current `requireConfigAccess` authorization pattern and validate that `landId` belongs to the authorized config.

### `GET /api/hex-world?landId=<uuid>`

Returns:

- world metadata;
- starter/purchased tiles required for rendering/building;
- placed buildings;
- eligible expansion summaries including their preview coordinates;
- current expansion progression;
- spendable shared Points summary.

If a HexWorld does not exist, the server lazily initializes the deterministic starter world within a transaction.

### `POST /api/hex-world/buildings`

Request body:

- `landId`;
- `buildingKey`;
- `anchorQ`;
- `anchorR`;
- `rotation`.

The server places the building after catalog, authorization, terrain, footprint, and collision validation.

### `PATCH /api/hex-world/buildings/[id]`

Request body contains the complete intended transform for the new state:

- `anchorQ`;
- `anchorR`;
- `rotation`.

The same placement validator is used while excluding the building being moved.

### `DELETE /api/hex-world/buildings/[id]`

Removes a building when catalog removal rules permit it. The starter Home is rejected with `building_not_removable`.

### `POST /api/hex-world/expand`

Request body:

- `landId`;
- `expansionKey`.

The server resolves all coordinates and cost from its own expansion catalog and atomically purchases/unlocks the cluster.

Stable error codes include:

- `tile_locked`;
- `tile_occupied`;
- `invalid_terrain`;
- `invalid_building`;
- `invalid_rotation`;
- `building_not_removable`;
- `expansion_not_available`;
- `not_enough_points`;
- `land_access_denied`.

## 9. Client Architecture

The new Garden world is split into focused modules instead of growing one large renderer component.

Required boundaries:

- `lib/hex-world/hex-grid.ts`: coordinates, rotations, geometry math;
- `lib/hex-world/hex-world-generator.ts`: deterministic starter and expansion definitions;
- `lib/hex-world/building-catalog.ts`: shared safe catalog definitions;
- `lib/hex-world/hex-world-service.ts`: server persistence and transactions;
- `components/hex-world/HexWorld3D.tsx`: high-level scene composition;
- `components/hex-world/HexTileInstances.tsx`: instanced terrain/selection rendering;
- `components/hex-world/HexBuildings.tsx`: placed-building rendering;
- `components/hex-world/HexBuildController.tsx`: selection/preview/placement local state;
- `components/hex-world/HexBuildCatalog.tsx`: catalog UI;
- `components/hex-world/HexExpansionController.tsx`: expansion preview/confirmation;
- API client additions in the existing service layer.

The app shell remains outside this renderer. The world does not own Circle switching, Land switching, user profile, settings, or main romantic-feature navigation.

## 10. Rendering and Performance

The starter world contains 400 candidate tiles, so repeated geometry uses instancing.

Required rendering strategy:

- `InstancedMesh` or equivalent batching for hex ground blocks;
- instancing for repeated grass, rocks, and flowers where practical;
- individual scene nodes only for meaningful placed buildings;
- limited real-time shadows focused on important structures;
- reduced decoration density on low quality/mobile;
- hover selection through coordinate/raycast lookup rather than React state per tile;
- no server write on hover, camera movement, or preview movement.

The medium-quality target is smooth interaction on desktop and a typical mid-range mobile device. Existing graphics-quality settings remain the source for low/medium/high density choices.

## 11. Migration and Backward Safety

Migration is lazy and additive.

When a Land is opened:

1. load existing Land normally;
2. if no `HexWorld` exists, initialize one in a transaction;
3. persist the 400 starter-envelope tiles using the deterministic generator;
4. create the starter Home at `(0, 0)` plus deterministic starter decorative composition;
5. leave all legacy `PurchasedItem` rows untouched;
6. return the new HexWorld snapshot.

Legacy objects may be imported later only when their type and footprint can be mapped safely. Custom GLB objects that lack a known footprint remain legacy data until a dedicated import design exists.

The old 2D family-farm save remains untouched in storage, but the new `/garden` world does not mount that experience.

**Production safety gate:** the deployment/startup path must not drop or recreate `Land`, `PurchasedItem`, `HexWorld`, `HexTile`, `HexBuilding`, or `HexExpansion` tables as routine startup behavior. Any existing destructive cleanup affecting these tables must be removed or disabled before the HexWorld feature is enabled in production.

## 12. State Ownership and Failure Behavior

The server owns:

- unlocked tiles;
- expansion progression;
- placed buildings;
- building coordinates and rotations;
- shared Points deduction for expansion.

The client owns transient interaction state:

- camera transform;
- hover hex;
- selected building;
- build catalog state;
- ghost preview;
- expansion preview animation.

Placement/move/remove interactions do not visually commit as permanent state until the server confirms. If a mutation fails, the ghost/selection remains available and a meaningful toast is shown.

If world loading fails, the client displays a retry state. It never silently generates a replacement world client-side.

## 13. Security and Concurrency

- All mutations authorize config and Land ownership/membership.
- Prices, footprints, terrain rules, expansion clusters, and rotation rules come from server-owned definitions.
- Expansion and building mutations that depend on occupancy/balances use Serializable transactions with conflict retry.
- Building mutations re-read current buildings inside the transaction before validating footprint occupancy.
- Stable mutation errors are returned without exposing database internals.

## 14. Testing and Release Gates

Unit/integration coverage must include:

- axial neighbor and distance functions;
- axial/world-space conversion;
- exact 400-coordinate starter envelope;
- deterministic starter generation from a fixed seed;
- starter unlocked tile-count bounds of 260-340;
- starter unlocked-tile connectivity;
- guaranteed unlocked `(0, 0)` Home anchor;
- six-direction footprint rotation;
- collision detection;
- locked-tile rejection;
- terrain-rule rejection;
- valid place/move/rotate/remove flows;
- starter Home remove rejection;
- expansion adjacency and eligibility;
- exact expansion costs for 7/19/37 tile clusters;
- shared Points deduction order and atomicity;
- duplicate expansion idempotency;
- concurrent placement/expansion conflict handling;
- lazy HexWorld creation;
- legacy `PurchasedItem` preservation;
- family-farm save preservation;
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
- automatic conversion of every legacy GLB object;
- seasons, festivals, NPC schedules, or family simulation;
- charging Points for individual buildings;
- dynamic expansion pricing;
- an infinite pre-generated map.

These can build on the HexWorld foundation later without being prerequisites for the first playable floating homestead.

## 16. Acceptance Criteria

The design is implemented successfully when:

1. opening `/garden` on a new or existing Land displays a floating stylized hex island;
2. a new HexWorld initializes deterministically without deleting legacy Land data;
3. the starter world persists exactly 400 envelope coordinates and unlocks a connected organic subset of 260-340 tiles;
4. `(0, 0)` is unlocked and contains the starter Home;
5. the player can open Build, preview a catalog object, rotate it, place it on valid unlocked hexes, move it, and remove permitted objects;
6. the starter Home cannot be removed;
7. overlapping, locked, invalid-terrain, and invalid-rotation placement is rejected by the server;
8. the player can purchase eligible connected 7/19/37-hex expansion clusters for 100/250/500 shared Points respectively;
9. expansion retries are idempotent and cannot charge twice;
10. the island visually grows only after a confirmed expansion;
11. the Garden app shell and main menu remain available independently of the 3D world;
12. no game-mode or character-control switch is introduced;
13. legacy `PurchasedItem` and family-farm data remain intact;
14. production startup does not destructively drop Land/PurchasedItem/HexWorld persistence tables;
15. tests, lint, production build, and deployment checks pass.
