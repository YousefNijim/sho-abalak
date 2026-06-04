-- Set the driver's share of the delivery fee to 2 ILS for all existing areas.
-- Capped at the area's total deliveryFee so the platform share never goes negative.
UPDATE "areas" SET "driverDeliveryFee" = LEAST(2, "deliveryFee");
