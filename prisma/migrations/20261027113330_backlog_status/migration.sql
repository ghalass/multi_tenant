/*
  Warnings:

  - You are about to drop the column `besoinPDR` on the `backlog` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "StatutBacklog" ADD VALUE 'ATTENTE_PROGRAMME';

-- AlterTable
ALTER TABLE "backlog" DROP COLUMN "besoinPDR",
ALTER COLUMN "statut" SET DEFAULT 'ATTENTE_PROGRAMME';
