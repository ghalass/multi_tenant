-- Suppression de l'ancien compteur initial des engins.
ALTER TABLE "engin" DROP COLUMN "initialHeureChassis";

-- Index optimisant la recherche des relevés d'un engin
-- par tenant et par date.
CREATE INDEX "saisie_hrm_tenantId_enginId_du_idx" ON "saisie_hrm" ("tenantId", "enginId", "du");