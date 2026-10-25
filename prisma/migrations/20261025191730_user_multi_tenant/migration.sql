/*
Warnings:

- A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_tenantId_email_key";

-- CreateTable
CREATE TABLE "user_tenant" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "user_tenant_pkey" PRIMARY KEY ("userId", "tenantId")
);

UPDATE "user" SET email = LOWER(TRIM(email));

-- CreateIndex
CREATE INDEX "user_tenant_tenantId_idx" ON "user_tenant" ("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user" ("email");

-- AddForeignKey
ALTER TABLE "user_tenant"
ADD CONSTRAINT "user_tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO
    "user_tenant" ("userId", "tenantId")
SELECT id, "tenantId"
FROM "user"
WHERE
    "tenantId" IS NOT NULL
ON CONFLICT ("userId", "tenantId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "user_tenant"
ADD CONSTRAINT "user_tenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;