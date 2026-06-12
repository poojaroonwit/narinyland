-- CreateTable
CREATE TABLE "WorldSocialAction" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldSocialAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldSocialAction_configId_createdAt_idx" ON "WorldSocialAction"("configId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldSocialAction_configId_toUserId_status_idx" ON "WorldSocialAction"("configId", "toUserId", "status");

-- CreateIndex
CREATE INDEX "WorldSocialAction_configId_fromUserId_type_idx" ON "WorldSocialAction"("configId", "fromUserId", "type");

-- AddForeignKey
ALTER TABLE "WorldSocialAction" ADD CONSTRAINT "WorldSocialAction_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
