ALTER TABLE "saisie_hrm" ADD COLUMN "nho" DOUBLE PRECISION;

UPDATE "saisie_hrm" SET "nho" = 24 WHERE "nho" IS NULL;

ALTER TABLE "saisie_hrm" ALTER COLUMN "nho" SET NOT NULL;