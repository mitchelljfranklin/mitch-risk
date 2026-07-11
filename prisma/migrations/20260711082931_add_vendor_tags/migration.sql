-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
