-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryMode" TEXT DEFAULT 'PLATFORM',
ADD COLUMN     "needsCustomerContact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiredVehicleType" TEXT;
