-- شو عبالك؟ — Split business categorization into top-level type (FOOD/STORE) + multi-value tags.
-- Safe + data-preserving: existing businesses are migrated to FOOD per product decision.

-- 1) New top-level type enum
CREATE TYPE "BusinessType" AS ENUM ('FOOD', 'STORE');

-- 2) Add the new column with a default, backfill every existing row to FOOD, then enforce.
ALTER TABLE "businesses" ADD COLUMN "type" "BusinessType" NOT NULL DEFAULT 'FOOD';
UPDATE "businesses" SET "type" = 'FOOD';

-- 3) Drop the old single-category field + its enum.
ALTER TABLE "businesses" DROP COLUMN "category";
DROP TYPE "BusinessCategory";

-- 4) Tags table + Business<->Tag join.
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BusinessType" NOT NULL,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tags_name_type_key" ON "tags"("name", "type");

CREATE TABLE "_BusinessTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_BusinessTags_AB_unique" ON "_BusinessTags"("A", "B");
CREATE INDEX "_BusinessTags_B_index" ON "_BusinessTags"("B");
ALTER TABLE "_BusinessTags" ADD CONSTRAINT "_BusinessTags_A_fkey" FOREIGN KEY ("A") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_BusinessTags" ADD CONSTRAINT "_BusinessTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Seed the predefined tag lists (idempotent via the unique [name,type]).
INSERT INTO "tags" ("id", "name", "type") VALUES
  (gen_random_uuid(), 'شرقي',        'FOOD'),
  (gen_random_uuid(), 'غربي',        'FOOD'),
  (gen_random_uuid(), 'شاورما',      'FOOD'),
  (gen_random_uuid(), 'فلافل',       'FOOD'),
  (gen_random_uuid(), 'بيتزا',       'FOOD'),
  (gen_random_uuid(), 'مشاوي',       'FOOD'),
  (gen_random_uuid(), 'إفطار',       'FOOD'),
  (gen_random_uuid(), 'كافيه',       'FOOD'),
  (gen_random_uuid(), 'حلويات',      'FOOD'),
  (gen_random_uuid(), 'سوبرماركت',   'STORE'),
  (gen_random_uuid(), 'ماركت صغير',  'STORE'),
  (gen_random_uuid(), 'خضار وفواكه', 'STORE'),
  (gen_random_uuid(), 'ملحمة',       'STORE')
ON CONFLICT ("name", "type") DO NOTHING;
