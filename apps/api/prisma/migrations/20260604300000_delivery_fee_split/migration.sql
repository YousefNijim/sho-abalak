-- Driver's share of delivery fee per area (admin-configurable)
ALTER TABLE "areas" ADD COLUMN "driverDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Default the driver share to 2 ILS for all existing areas
-- (capped at the area's total deliveryFee so platform share never goes negative)
UPDATE "areas" SET "driverDeliveryFee" = LEAST(2, "deliveryFee");

-- Snapshotted fee split per order
ALTER TABLE "orders" ADD COLUMN "driverDeliveryFee"   DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "platformDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
