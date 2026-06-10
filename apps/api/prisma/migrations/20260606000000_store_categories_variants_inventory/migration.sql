-- ── ProductCategory ──────────────────────────────────────────────────────────
CREATE TABLE "product_categories" (
    "id"         TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "parentId"   TEXT,
    "sortOrder"  INTEGER NOT NULL DEFAULT 0,
    "imageUrl"   TEXT,
    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_categories_businessId_idx" ON "product_categories"("businessId");
CREATE INDEX "product_categories_parentId_idx"   ON "product_categories"("parentId");

ALTER TABLE "product_categories"
    ADD CONSTRAINT "product_categories_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_categories"
    ADD CONSTRAINT "product_categories_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ProductVariant ───────────────────────────────────────────────────────────
CREATE TABLE "product_variants" (
    "id"          TEXT NOT NULL,
    "productId"   TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "price"       DECIMAL(10,2) NOT NULL,
    "stock"       INTEGER,
    "barcode"     TEXT,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

ALTER TABLE "product_variants"
    ADD CONSTRAINT "product_variants_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Product — ADD ONLY ───────────────────────────────────────────────────────
ALTER TABLE "products"
    ADD COLUMN "categoryId"    TEXT,
    ADD COLUMN "barcode"       TEXT,
    ADD COLUMN "stock"         INTEGER,
    ADD COLUMN "lowStockAlert" INTEGER,
    ADD COLUMN "hasVariants"   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "unit"          TEXT;

CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_barcode_idx"    ON "products"("barcode");

ALTER TABLE "products"
    ADD CONSTRAINT "products_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── OrderItem — ADD ONLY ─────────────────────────────────────────────────────
ALTER TABLE "order_items"
    ADD COLUMN "variantId"   TEXT,
    ADD COLUMN "variantName" TEXT;

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
