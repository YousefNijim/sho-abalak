-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'ESCALATED';

-- AlterTable
ALTER TABLE "areas" ADD COLUMN     "motorcycleDriverFee" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "motorcycleFee" DECIMAL(10,2),
ADD COLUMN     "motorcyclePlatformFee" DECIMAL(10,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryFeeAdjusted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryVehicleType" TEXT DEFAULT 'MOTORCYCLE',
ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalationReason" TEXT,
ADD COLUMN     "originalDeliveryFee" DECIMAL(10,2);

-- DataMigration: copy existing deliveryFee / driverDeliveryFee into new motorcycle fee columns
-- motorcyclePlatformFee = deliveryFee - driverDeliveryFee
UPDATE "areas"
SET
  "motorcycleFee"         = "deliveryFee",
  "motorcycleDriverFee"   = "driverDeliveryFee",
  "motorcyclePlatformFee" = "deliveryFee" - "driverDeliveryFee";

