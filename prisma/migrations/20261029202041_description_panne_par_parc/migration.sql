-- 1. Créer la nouvelle table sans supprimer les anciennes données
CREATE TABLE "panne_parc" (
    "panneId" TEXT NOT NULL,
    "parcId" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "panne_parc_pkey" PRIMARY KEY ("panneId", "parcId")
);

CREATE INDEX "panne_parc_parcId_idx" ON "panne_parc" ("parcId");

-- 2. Transférer les 789 associations existantes.
-- La description actuelle de panne sert de valeur initiale.
-- Vérifier les colonnes A et B avant d'exécuter cette migration.
INSERT INTO
    "panne_parc" (
        "panneId",
        "parcId",
        "description"
    )
SELECT r."A", r."B", p."description"
FROM "_PanneToParc" r
    JOIN "panne" p ON p."id" = r."A";

-- 3. Ajouter les clés étrangères de la nouvelle table
ALTER TABLE "panne_parc"
ADD CONSTRAINT "panne_parc_panneId_fkey" FOREIGN KEY ("panneId") REFERENCES "panne" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "panne_parc"
ADD CONSTRAINT "panne_parc_parcId_fkey" FOREIGN KEY ("parcId") REFERENCES "parc" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Modifier les autres éléments du schéma
ALTER TABLE "saisie_hrm" ALTER COLUMN "nho" SET DEFAULT 24;

-- 5. Supprimer les anciennes contraintes et tables seulement
-- après le transfert des associations
ALTER TABLE "_PanneToParc" DROP CONSTRAINT "_PanneToParc_A_fkey";

ALTER TABLE "_PanneToParc" DROP CONSTRAINT "_PanneToParc_B_fkey";

DROP TABLE "_PanneToParc";

ALTER TABLE "panne" DROP COLUMN "description";