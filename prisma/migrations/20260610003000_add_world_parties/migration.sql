-- CreateTable
CREATE TABLE "WorldParty" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldPartyMember" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldPartyMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldParty_configId_status_idx" ON "WorldParty"("configId", "status");

-- CreateIndex
CREATE INDEX "WorldParty_configId_leaderUserId_idx" ON "WorldParty"("configId", "leaderUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldPartyMember_partyId_userId_key" ON "WorldPartyMember"("partyId", "userId");

-- CreateIndex
CREATE INDEX "WorldPartyMember_userId_status_idx" ON "WorldPartyMember"("userId", "status");

-- CreateIndex
CREATE INDEX "WorldPartyMember_partyId_status_idx" ON "WorldPartyMember"("partyId", "status");

-- AddForeignKey
ALTER TABLE "WorldParty" ADD CONSTRAINT "WorldParty_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldPartyMember" ADD CONSTRAINT "WorldPartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "WorldParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
