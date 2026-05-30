-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "addressDetail" TEXT,
ADD COLUMN     "closeTime" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "openTime" TEXT;

