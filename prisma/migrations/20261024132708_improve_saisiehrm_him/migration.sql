/*
  Warnings:

  - You are about to drop the column `enginId` on the `saisie_him` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "saisie_him" DROP CONSTRAINT "saisie_him_enginId_fkey";

-- AlterTable
ALTER TABLE "saisie_him" DROP COLUMN "enginId";

-- AlterTable
ALTER TABLE "saisie_hrm" ALTER COLUMN "du" SET DATA TYPE DATE;
