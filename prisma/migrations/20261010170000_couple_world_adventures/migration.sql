-- Each couple quest response is scoped to its private AppKit circle.
-- Cascade deletion removes story answers when the circle/member is deleted.
CREATE TABLE "CoupleQuestEntry" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "questKey" TEXT NOT NULL,
    "answer" VARCHAR(240) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoupleQuestEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoupleQuestEntry_configId_dayKey_questKey_partnerId_key"
    ON "CoupleQuestEntry"("configId", "dayKey", "questKey", "partnerId");
CREATE INDEX "CoupleQuestEntry_configId_dayKey_idx"
    ON "CoupleQuestEntry"("configId", "dayKey");

ALTER TABLE "CoupleQuestEntry" ADD CONSTRAINT "CoupleQuestEntry_configId_fkey"
    FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoupleQuestEntry" ADD CONSTRAINT "CoupleQuestEntry_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
