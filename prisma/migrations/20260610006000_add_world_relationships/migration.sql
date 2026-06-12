-- CreateTable
CREATE TABLE "WorldRelationship" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorldRelationship_configId_fromUserId_toUserId_type_key" ON "WorldRelationship"("configId", "fromUserId", "toUserId", "type");

-- CreateIndex
CREATE INDEX "WorldRelationship_configId_fromUserId_type_status_idx" ON "WorldRelationship"("configId", "fromUserId", "type", "status");

-- CreateIndex
CREATE INDEX "WorldRelationship_configId_toUserId_type_status_idx" ON "WorldRelationship"("configId", "toUserId", "type", "status");

-- AddForeignKey
ALTER TABLE "WorldRelationship" ADD CONSTRAINT "WorldRelationship_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
