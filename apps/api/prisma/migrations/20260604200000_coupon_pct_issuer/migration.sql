CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');
CREATE TYPE "CouponIssuer" AS ENUM ('PLATFORM', 'BUSINESS');

ALTER TABLE "coupons"
  ADD COLUMN "discountType" "DiscountType" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "discountPct"  DECIMAL(5,2),
  ADD COLUMN "maxDiscount"  DECIMAL(10,2),
  ADD COLUMN "issuedBy"     "CouponIssuer" NOT NULL DEFAULT 'PLATFORM';

ALTER TABLE "orders"
  ADD COLUMN "couponIssuedBy" TEXT;
