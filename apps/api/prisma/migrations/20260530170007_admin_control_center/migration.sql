-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10.00;

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultCommission" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "baseDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 3.00,
    "customerAppActive" BOOLEAN NOT NULL DEFAULT true,
    "businessAppActive" BOOLEAN NOT NULL DEFAULT true,
    "driverAppActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
