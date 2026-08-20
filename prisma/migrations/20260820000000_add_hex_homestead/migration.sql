-- CreateTable
CREATE TABLE "HexWorld" (
    "id" TEXT NOT NULL,
    "landId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "generatorVersion" INTEGER NOT NULL DEFAULT 1,
    "seed" TEXT NOT NULL,
    "expansionLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HexWorld_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HexTile" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "q" INTEGER NOT NULL,
    "r" INTEGER NOT NULL,
    "terrainType" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlocked" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HexTile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HexBuilding" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "buildingKey" TEXT NOT NULL,
    "anchorQ" INTEGER NOT NULL,
    "anchorR" INTEGER NOT NULL,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "modelUrl" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HexBuilding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HexExpansion" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "expansionKey" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "pointCost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HexExpansion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HexWorld_landId_key" ON "HexWorld"("landId");
CREATE UNIQUE INDEX "HexTile_worldId_q_r_key" ON "HexTile"("worldId", "q", "r");
CREATE INDEX "HexTile_worldId_unlocked_idx" ON "HexTile"("worldId", "unlocked");
CREATE INDEX "HexBuilding_worldId_idx" ON "HexBuilding"("worldId");
CREATE INDEX "HexBuilding_worldId_buildingKey_idx" ON "HexBuilding"("worldId", "buildingKey");
CREATE UNIQUE INDEX "HexExpansion_worldId_expansionKey_key" ON "HexExpansion"("worldId", "expansionKey");
CREATE INDEX "HexExpansion_worldId_tier_idx" ON "HexExpansion"("worldId", "tier");

ALTER TABLE "HexWorld" ADD CONSTRAINT "HexWorld_landId_fkey" FOREIGN KEY ("landId") REFERENCES "Land"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HexTile" ADD CONSTRAINT "HexTile_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "HexWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HexBuilding" ADD CONSTRAINT "HexBuilding_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "HexWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HexExpansion" ADD CONSTRAINT "HexExpansion_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "HexWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;
