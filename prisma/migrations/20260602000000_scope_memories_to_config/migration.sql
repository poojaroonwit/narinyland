INSERT INTO "AppConfig" ("id") VALUES ('default')
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Memory"
ADD COLUMN IF NOT EXISTS "configId" TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS "Memory_configId_idx" ON "Memory"("configId");

DO $$
BEGIN
  ALTER TABLE "Memory"
  ADD CONSTRAINT "Memory_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "AppConfig"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
