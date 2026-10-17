-- Persist settings formerly present only in the client-side editor.
ALTER TABLE "AppConfig"
  ADD COLUMN "galleryPhysicsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "galleryInterval" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "showTimelineImagesOnHomepage" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "includeTimelineInGallery" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "proposalFinalWording" TEXT NOT NULL DEFAULT '';
