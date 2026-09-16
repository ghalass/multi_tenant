/*
  Warnings:

  - You are about to drop the column `isOwner` on the `user` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_tenantId_fkey";

-- AlterTable
ALTER TABLE "tenant" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "isOwner";

-- AddForeignKey
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
