-- CreateTable
CREATE TABLE "WorldEvent" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT 'Event Lawn',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldEventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'attending',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldEventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldEvent_configId_status_idx" ON "WorldEvent"("configId", "status");

-- CreateIndex
CREATE INDEX "WorldEvent_configId_district_status_idx" ON "WorldEvent"("configId", "district", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorldEventParticipant_eventId_userId_key" ON "WorldEventParticipant"("eventId", "userId");

-- CreateIndex
CREATE INDEX "WorldEventParticipant_userId_status_idx" ON "WorldEventParticipant"("userId", "status");

-- CreateIndex
CREATE INDEX "WorldEventParticipant_eventId_status_idx" ON "WorldEventParticipant"("eventId", "status");

-- AddForeignKey
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEventParticipant" ADD CONSTRAINT "WorldEventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WorldEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
