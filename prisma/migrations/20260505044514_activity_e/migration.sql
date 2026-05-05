/*
  Warnings:

  - You are about to drop the column `entityId` on the `Activity` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Activity_entityId_idx";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "entityId";
