-- CreateTable
CREATE TABLE "WorldInventoryItem" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "icon" TEXT NOT NULL DEFAULT 'fa-gem',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorldInventoryItem_configId_userId_itemKey_key" ON "WorldInventoryItem"("configId", "userId", "itemKey");

-- CreateIndex
CREATE INDEX "WorldInventoryItem_configId_userId_idx" ON "WorldInventoryItem"("configId", "userId");

-- CreateIndex
CREATE INDEX "WorldInventoryItem_configId_userId_slot_idx" ON "WorldInventoryItem"("configId", "userId", "slot");

-- AddForeignKey
ALTER TABLE "WorldInventoryItem" ADD CONSTRAINT "WorldInventoryItem_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
