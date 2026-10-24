-- DropForeignKey
ALTER TABLE "engin" DROP CONSTRAINT "engin_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "panne" DROP CONSTRAINT "panne_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "parc" DROP CONSTRAINT "parc_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "saisie_him" DROP CONSTRAINT "saisie_him_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "saisie_hrm" DROP CONSTRAINT "saisie_hrm_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "site" DROP CONSTRAINT "site_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "typepanne" DROP CONSTRAINT "typepanne_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "typeparc" DROP CONSTRAINT "typeparc_tenantId_fkey";

-- CreateTable
CREATE TABLE "objectif" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "parcId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "dispo" DOUBLE PRECISION,
    "mtbf" DOUBLE PRECISION,
    "tdm" DOUBLE PRECISION,
    "spe_huile" DOUBLE PRECISION,
    "spe_go" DOUBLE PRECISION,
    "spe_graisse" DOUBLE PRECISION,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "objectif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "objectif_annee_parcId_siteId_key" ON "objectif"("annee", "parcId", "siteId");

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "typeparc" ADD CONSTRAINT "typeparc_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parc" ADD CONSTRAINT "parc_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engin" ADD CONSTRAINT "engin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "typepanne" ADD CONSTRAINT "typepanne_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panne" ADD CONSTRAINT "panne_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisie_hrm" ADD CONSTRAINT "saisie_hrm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisie_him" ADD CONSTRAINT "saisie_him_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectif" ADD CONSTRAINT "objectif_parcId_fkey" FOREIGN KEY ("parcId") REFERENCES "parc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectif" ADD CONSTRAINT "objectif_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectif" ADD CONSTRAINT "objectif_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
