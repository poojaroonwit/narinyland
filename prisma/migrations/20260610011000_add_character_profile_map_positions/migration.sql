-- Store per-land resume points so switching maps does not overwrite another land's last location.
ALTER TABLE "CharacterProfile" ADD COLUMN "lastMapPositions" JSONB NOT NULL DEFAULT '{}';
