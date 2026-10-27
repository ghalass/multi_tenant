-- CreateEnum
CREATE TYPE "SourceBacklog" AS ENUM ('VS', 'VJ', 'INSPECTION', 'AUTRE');

-- CreateEnum
CREATE TYPE "PrioriteBacklog" AS ENUM ('ELEVEE', 'MOYENNE', 'FAIBLE');

-- CreateEnum
CREATE TYPE "StatutBacklog" AS ENUM ('ATTENTE_PDR', 'PDR_PRET', 'PROGRAMMEE', 'EXECUTE');

-- CreateTable
CREATE TABLE "backlog" (
    "id" TEXT NOT NULL,
    "numeroBacklog" TEXT NOT NULL,
    "dateDetection" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "source" "SourceBacklog" NOT NULL,
    "priorite" "PrioriteBacklog" NOT NULL,
    "besoinPDR" BOOLEAN NOT NULL DEFAULT false,
    "programmation" TEXT,
    "equipe" TEXT,
    "statut" "StatutBacklog" NOT NULL DEFAULT 'ATTENTE_PDR',
    "dateExecution" DATE,
    "confirmation" TEXT,
    "observations" TEXT,
    "enginId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backlog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_statut_backlog" (
    "id" TEXT NOT NULL,
    "backlogId" TEXT NOT NULL,
    "ancienStatut" "StatutBacklog" NOT NULL,
    "nouveauStatut" "StatutBacklog" NOT NULL,
    "dateChangement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaire" TEXT,

    CONSTRAINT "historique_statut_backlog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backlog_tenantId_dateDetection_idx" ON "backlog"("tenantId", "dateDetection");

-- CreateIndex
CREATE INDEX "backlog_tenantId_statut_idx" ON "backlog"("tenantId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "backlog_numeroBacklog_tenantId_key" ON "backlog"("numeroBacklog", "tenantId");

-- CreateIndex
CREATE INDEX "historique_statut_backlog_backlogId_dateChangement_idx" ON "historique_statut_backlog"("backlogId", "dateChangement");

-- AddForeignKey
ALTER TABLE "backlog" ADD CONSTRAINT "backlog_enginId_fkey" FOREIGN KEY ("enginId") REFERENCES "engin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog" ADD CONSTRAINT "backlog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog" ADD CONSTRAINT "backlog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_statut_backlog" ADD CONSTRAINT "historique_statut_backlog_backlogId_fkey" FOREIGN KEY ("backlogId") REFERENCES "backlog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
