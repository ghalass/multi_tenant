-- CreateTable
CREATE TABLE "plan_maintenance" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "intervalleHeures" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_maintenance_tenantId_active_idx" ON "plan_maintenance"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "plan_maintenance_code_tenantId_key" ON "plan_maintenance"("code", "tenantId");

-- AddForeignKey
ALTER TABLE "plan_maintenance" ADD CONSTRAINT "plan_maintenance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
