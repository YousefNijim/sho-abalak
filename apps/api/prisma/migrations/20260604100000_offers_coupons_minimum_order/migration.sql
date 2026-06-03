-- Business minimum order amount
ALTER TABLE "businesses" ADD COLUMN "minimumOrder" DECIMAL(10,2);

-- Order pricing breakdown columns
ALTER TABLE "orders" ADD COLUMN "subtotal"       DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "couponDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "deliveryFee"    DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "couponCode"     TEXT;

-- Offer type enum
CREATE TYPE "OfferType" AS ENUM ('INDIVIDUAL', 'SHARED');

-- Offers table
CREATE TABLE "offers" (
  "id"          TEXT        NOT NULL,
  "title"       TEXT        NOT NULL,
  "description" TEXT,
  "rules"       TEXT,
  "imageUrl"    TEXT,
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "type"        "OfferType" NOT NULL DEFAULT 'INDIVIDUAL',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- Offer ↔ Business join
CREATE TABLE "offer_businesses" (
  "id"         TEXT NOT NULL,
  "offerId"    TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "offer_businesses_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "offer_businesses_offerId_businessId_key" UNIQUE ("offerId", "businessId"),
  CONSTRAINT "offer_businesses_offerId_fkey"    FOREIGN KEY ("offerId")    REFERENCES "offers"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "offer_businesses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Offer products / categories
CREATE TABLE "offer_products" (
  "id"           TEXT           NOT NULL,
  "offerId"      TEXT           NOT NULL,
  "productId"    TEXT,
  "categoryName" TEXT,
  "discountPct"  DECIMAL(5,2)   NOT NULL,
  CONSTRAINT "offer_products_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "offer_products_offerId_fkey"  FOREIGN KEY ("offerId")   REFERENCES "offers"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "offer_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Coupons
CREATE TABLE "coupons" (
  "id"             TEXT         NOT NULL,
  "code"           TEXT         NOT NULL,
  "discountAmount" DECIMAL(10,2) NOT NULL,
  "minimumOrder"   DECIMAL(10,2) NOT NULL,
  "isActive"       BOOLEAN      NOT NULL DEFAULT true,
  "usedAt"         TIMESTAMP(3),
  "usedByOrderId"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupons_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "coupons_code_key"        UNIQUE ("code"),
  CONSTRAINT "coupons_usedByOrderId_key" UNIQUE ("usedByOrderId")
);
