-- CreateTable
CREATE TABLE "WorldGuild" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "bannerColor" TEXT NOT NULL DEFAULT '#047857',
    "motto" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldGuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldGuildMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldGuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldGuild_configId_status_idx" ON "WorldGuild"("configId", "status");

-- CreateIndex
CREATE INDEX "WorldGuild_configId_leaderUserId_idx" ON "WorldGuild"("configId", "leaderUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldGuildMember_guildId_userId_key" ON "WorldGuildMember"("guildId", "userId");

-- CreateIndex
CREATE INDEX "WorldGuildMember_userId_status_idx" ON "WorldGuildMember"("userId", "status");

-- CreateIndex
CREATE INDEX "WorldGuildMember_guildId_status_idx" ON "WorldGuildMember"("guildId", "status");

-- AddForeignKey
ALTER TABLE "WorldGuild" ADD CONSTRAINT "WorldGuild_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldGuildMember" ADD CONSTRAINT "WorldGuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "WorldGuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
