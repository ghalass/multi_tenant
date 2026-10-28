-- CreateEnum
CREATE TYPE "PorteeAffectationMaintenance" AS ENUM ('TYPEPARC', 'PARC', 'SITE', 'ENGIN');

-- CreateTable
CREATE TABLE "affectation_plan_maintenance" (
    "id" TEXT NOT NULL,
    "planMaintenanceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "portee" "PorteeAffectationMaintenance" NOT NULL,
    "typeparcId" TEXT,
    "parcId" TEXT,
    "siteId" TEXT,
    "enginId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affectation_plan_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suivi_plan_maintenance_engin" (
    "id" TEXT NOT NULL,
    "planMaintenanceId" TEXT NOT NULL,
    "enginId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "compteurDerniereMaintenance" DOUBLE PRECISION,
    "dateDerniereMaintenance" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suivi_plan_maintenance_engin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affectation_plan_maintenance_tenantId_portee_active_idx" ON "affectation_plan_maintenance"("tenantId", "portee", "active");

-- CreateIndex
CREATE INDEX "affectation_plan_maintenance_planMaintenanceId_active_idx" ON "affectation_plan_maintenance"("planMaintenanceId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "affectation_plan_maintenance_planMaintenanceId_tenantId_typ_key" ON "affectation_plan_maintenance"("planMaintenanceId", "tenantId", "typeparcId");

-- CreateIndex
CREATE UNIQUE INDEX "affectation_plan_maintenance_planMaintenanceId_tenantId_par_key" ON "affectation_plan_maintenance"("planMaintenanceId", "tenantId", "parcId");

-- CreateIndex
CREATE UNIQUE INDEX "affectation_plan_maintenance_planMaintenanceId_tenantId_sit_key" ON "affectation_plan_maintenance"("planMaintenanceId", "tenantId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "affectation_plan_maintenance_planMaintenanceId_tenantId_eng_key" ON "affectation_plan_maintenance"("planMaintenanceId", "tenantId", "enginId");

-- CreateIndex
CREATE INDEX "suivi_plan_maintenance_engin_tenantId_enginId_idx" ON "suivi_plan_maintenance_engin"("tenantId", "enginId");

-- CreateIndex
CREATE UNIQUE INDEX "suivi_plan_maintenance_engin_planMaintenanceId_enginId_tena_key" ON "suivi_plan_maintenance_engin"("planMaintenanceId", "enginId", "tenantId");

-- AddForeignKey
ALTER TABLE "affectation_plan_maintenance" ADD CONSTRAINT "affectation_plan_maintenance_planMaintenanceId_fkey" FOREIGN KEY ("planMaintenanceId") REFERENCES "plan_maintenance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation_plan_maintenance" ADD CONSTRAINT "affectation_plan_maintenance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation_plan_maintenance" ADD CONSTRAINT "affectation_plan_maintenance_typeparcId_fkey" FOREIGN KEY ("typeparcId") REFERENCES "typeparc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation_plan_maintenance" ADD CONSTRAINT "affectation_plan_maintenance_parcId_fkey" FOREIGN KEY ("parcId") REFERENCES "parc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation_plan_maintenance" ADD CONSTRAINT "affectation_plan_maintenance_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation_plan_maintenance" ADD CONSTRAINT "affectation_plan_maintenance_enginId_fkey" FOREIGN KEY ("enginId") REFERENCES "engin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_plan_maintenance_engin" ADD CONSTRAINT "suivi_plan_maintenance_engin_planMaintenanceId_fkey" FOREIGN KEY ("planMaintenanceId") REFERENCES "plan_maintenance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_plan_maintenance_engin" ADD CONSTRAINT "suivi_plan_maintenance_engin_enginId_fkey" FOREIGN KEY ("enginId") REFERENCES "engin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_plan_maintenance_engin" ADD CONSTRAINT "suivi_plan_maintenance_engin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
