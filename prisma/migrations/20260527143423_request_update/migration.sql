/*
  Warnings:

  - You are about to drop the column `userId` on the `Request` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_userId_fkey";

-- DropIndex
DROP INDEX "Request_userId_idx";

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "userId",
ADD COLUMN     "alumniId" INTEGER;

-- CreateIndex
CREATE INDEX "Request_alumniId_idx" ON "Request"("alumniId");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "Alumni"("id") ON DELETE SET NULL ON UPDATE CASCADE;
