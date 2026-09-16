/*
  Warnings:

  - You are about to drop the column `tenantId` on the `permission` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `role` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[resource,action]` on the table `permission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "permission" DROP CONSTRAINT "permission_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "role" DROP CONSTRAINT "role_tenantId_fkey";

-- DropIndex
DROP INDEX "permission_resource_action_tenantId_key";

-- DropIndex
DROP INDEX "role_tenantId_name_key";

-- AlterTable
ALTER TABLE "permission" DROP COLUMN "tenantId";

-- AlterTable
ALTER TABLE "role" DROP COLUMN "tenantId";

-- CreateIndex
CREATE UNIQUE INDEX "permission_resource_action_key" ON "permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");
