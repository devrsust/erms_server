/*
  Warnings:

  - You are about to drop the column `alumniId` on the `Request` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_alumniId_fkey";

-- DropIndex
DROP INDEX "Request_alumniId_idx";

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "alumniId",
ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE INDEX "Request_userId_idx" ON "Request"("userId");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Alumni"("id") ON DELETE SET NULL ON UPDATE CASCADE;
