-- CreateTable
CREATE TABLE "saisie_hrm" (
    "id" TEXT NOT NULL,
    "du" TIMESTAMP(3) NOT NULL,
    "enginId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "hrm" DOUBLE PRECISION NOT NULL,
    "compteur" DOUBLE PRECISION,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "saisie_hrm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saisie_him" (
    "id" TEXT NOT NULL,
    "panneId" TEXT NOT NULL,
    "him" DOUBLE PRECISION NOT NULL,
    "ni" INTEGER NOT NULL,
    "saisiehrmId" TEXT NOT NULL,
    "obs" TEXT,
    "tenantId" TEXT NOT NULL,
    "enginId" TEXT NOT NULL,

    CONSTRAINT "saisie_him_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saisie_hrm_du_enginId_tenantId_key" ON "saisie_hrm"("du", "enginId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "saisie_him_panneId_saisiehrmId_tenantId_key" ON "saisie_him"("panneId", "saisiehrmId", "tenantId");

-- AddForeignKey
ALTER TABLE "saisie_hrm" ADD CONSTRAINT "saisie_hrm_enginId_fkey" FOREIGN KEY ("enginId") REFERENCES "engin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisie_hrm" ADD CONSTRAINT "saisie_hrm_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisie_hrm" ADD CONSTRAINT "saisie_hrm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisie_him" ADD CONSTRAINT "saisie_him_panneId_fkey" FOREIGN KEY ("panneId") REFERENCES "panne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisie_him" ADD CONSTRAINT "saisie_him_saisiehrmId_fkey" FOREIGN KEY ("saisiehrmId") REFERENCES "saisie_hrm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisie_him" ADD CONSTRAINT "saisie_him_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisie_him" ADD CONSTRAINT "saisie_him_enginId_fkey" FOREIGN KEY ("enginId") REFERENCES "engin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
