-- CreateTable
CREATE TABLE "historique_maintenance_preventive" (
    "id" TEXT NOT NULL,
    "planMaintenanceId" TEXT NOT NULL,
    "enginId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dateMaintenance" DATE NOT NULL,
    "compteur" DOUBLE PRECISION NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_maintenance_preventive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historique_maintenance_preventive_tenantId_enginId_dateMain_idx" ON "historique_maintenance_preventive"("tenantId", "enginId", "dateMaintenance");

-- CreateIndex
CREATE INDEX "historique_maintenance_preventive_tenantId_planMaintenanceI_idx" ON "historique_maintenance_preventive"("tenantId", "planMaintenanceId", "dateMaintenance");

-- AddForeignKey
ALTER TABLE "historique_maintenance_preventive" ADD CONSTRAINT "historique_maintenance_preventive_planMaintenanceId_fkey" FOREIGN KEY ("planMaintenanceId") REFERENCES "plan_maintenance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_maintenance_preventive" ADD CONSTRAINT "historique_maintenance_preventive_enginId_fkey" FOREIGN KEY ("enginId") REFERENCES "engin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_maintenance_preventive" ADD CONSTRAINT "historique_maintenance_preventive_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
