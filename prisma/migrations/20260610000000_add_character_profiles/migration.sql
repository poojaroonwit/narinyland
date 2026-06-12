-- CreateTable
CREATE TABLE "CharacterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Explorer',
    "status" TEXT NOT NULL DEFAULT 'online',
    "activity" TEXT NOT NULL DEFAULT 'Exploring',
    "emote" TEXT NOT NULL DEFAULT 'idle',
    "modelUrl" TEXT,
    "appearance" JSONB NOT NULL DEFAULT '{}',
    "equipment" JSONB NOT NULL DEFAULT '{}',
    "cosmetics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterProfile_configId_userId_key" ON "CharacterProfile"("configId", "userId");

-- CreateIndex
CREATE INDEX "CharacterProfile_configId_status_idx" ON "CharacterProfile"("configId", "status");

-- AddForeignKey
ALTER TABLE "CharacterProfile" ADD CONSTRAINT "CharacterProfile_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
