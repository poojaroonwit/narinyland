-- CreateTable
CREATE TABLE "WorldAchievement" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'fa-award',
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "titleReward" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorldAchievement_configId_userId_achievementKey_key" ON "WorldAchievement"("configId", "userId", "achievementKey");

-- CreateIndex
CREATE INDEX "WorldAchievement_configId_userId_idx" ON "WorldAchievement"("configId", "userId");

-- CreateIndex
CREATE INDEX "WorldAchievement_configId_userId_earnedAt_idx" ON "WorldAchievement"("configId", "userId", "earnedAt");

-- AddForeignKey
ALTER TABLE "WorldAchievement" ADD CONSTRAINT "WorldAchievement_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
