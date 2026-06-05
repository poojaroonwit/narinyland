ALTER TABLE "Partner"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

UPDATE "Partner"
SET "userId" = "partnerId"
WHERE "userId" IS NULL
  AND "partnerId" NOT IN ('partner1', 'partner2');

CREATE INDEX IF NOT EXISTS "Partner_configId_userId_idx" ON "Partner"("configId", "userId");
