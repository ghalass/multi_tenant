/*
  Warnings:

  - A unique constraint covering the columns `[isSuperAdmin]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_single_super_admin_key" ON "user"("isSuperAdmin") WHERE ("isSuperAdmin" = true);
