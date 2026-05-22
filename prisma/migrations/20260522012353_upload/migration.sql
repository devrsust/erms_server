-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signaturePublicId" TEXT,
ADD COLUMN     "stamp" TEXT,
ADD COLUMN     "stampPublicId" TEXT;

-- CreateTable
CREATE TABLE "Upload" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "folder" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);
