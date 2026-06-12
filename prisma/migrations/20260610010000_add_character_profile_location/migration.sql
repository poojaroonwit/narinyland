-- Persist the last known world location so avatars respawn where they left the 3D world.
ALTER TABLE "CharacterProfile" ADD COLUMN "lastPosition" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "CharacterProfile" ADD COLUMN "lastZone" TEXT NOT NULL DEFAULT 'Narinyland Commons';
