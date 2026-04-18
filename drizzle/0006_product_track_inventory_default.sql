UPDATE "product" SET "track_inventory" = true WHERE "track_inventory" = false;
ALTER TABLE "product" ALTER COLUMN "track_inventory" SET DEFAULT true;
