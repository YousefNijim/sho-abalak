-- Add deliveryRating to reviews (replaces driverRating — driver is now rated by business)
ALTER TABLE "reviews" ADD COLUMN "deliveryRating" INTEGER;
ALTER TABLE "reviews" DROP COLUMN IF EXISTS "driverRating";

-- DriverReview: business rates driver after each delivery
CREATE TABLE "driver_reviews" (
  "id"         TEXT NOT NULL,
  "orderId"    TEXT NOT NULL,
  "driverId"   TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "rating"     INTEGER NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_reviews_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "driver_reviews_orderId_key" UNIQUE ("orderId"),
  CONSTRAINT "driver_reviews_orderId_fkey"    FOREIGN KEY ("orderId")    REFERENCES "orders"("id")     ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "driver_reviews_driverId_fkey"   FOREIGN KEY ("driverId")   REFERENCES "drivers"("id")   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "driver_reviews_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
