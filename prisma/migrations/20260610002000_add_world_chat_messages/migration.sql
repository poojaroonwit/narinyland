-- CreateTable
CREATE TABLE "WorldChatMessage" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'world',
    "body" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldChatMessage_configId_channel_createdAt_idx" ON "WorldChatMessage"("configId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "WorldChatMessage_configId_fromUserId_createdAt_idx" ON "WorldChatMessage"("configId", "fromUserId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldChatMessage_configId_toUserId_createdAt_idx" ON "WorldChatMessage"("configId", "toUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorldChatMessage" ADD CONSTRAINT "WorldChatMessage_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
