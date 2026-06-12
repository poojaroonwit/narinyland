-- CreateTable
CREATE TABLE "WorldVoiceRoom" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldVoiceRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldVoiceMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldVoiceMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldVoiceRoom_configId_kind_status_idx" ON "WorldVoiceRoom"("configId", "kind", "status");

-- CreateIndex
CREATE INDEX "WorldVoiceRoom_configId_scopeKey_status_idx" ON "WorldVoiceRoom"("configId", "scopeKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorldVoiceMember_roomId_userId_key" ON "WorldVoiceMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "WorldVoiceMember_userId_status_idx" ON "WorldVoiceMember"("userId", "status");

-- CreateIndex
CREATE INDEX "WorldVoiceMember_roomId_status_idx" ON "WorldVoiceMember"("roomId", "status");

-- AddForeignKey
ALTER TABLE "WorldVoiceRoom" ADD CONSTRAINT "WorldVoiceRoom_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldVoiceMember" ADD CONSTRAINT "WorldVoiceMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "WorldVoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
