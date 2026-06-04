-- Driver's share of delivery fee per area (admin-configurable)
ALTER TABLE "areas" ADD COLUMN "driverDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Snapshotted fee split per order
ALTER TABLE "orders" ADD COLUMN "driverDeliveryFee"   DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "platformDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
