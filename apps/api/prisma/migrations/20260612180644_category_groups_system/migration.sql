-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "subtotal" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "category_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_templates" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "category_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_category_groups" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_category_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_category_overrides" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryTemplateId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "business_category_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_templates_groupId_idx" ON "category_templates"("groupId");

-- CreateIndex
CREATE INDEX "category_templates_parentId_idx" ON "category_templates"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "business_category_groups_businessId_groupId_key" ON "business_category_groups"("businessId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "business_category_overrides_businessId_categoryTemplateId_key" ON "business_category_overrides"("businessId", "categoryTemplateId");

-- CreateIndex
CREATE INDEX "products_templateId_idx" ON "products"("templateId");

-- AddForeignKey
ALTER TABLE "category_templates" ADD CONSTRAINT "category_templates_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "category_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_templates" ADD CONSTRAINT "category_templates_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_category_groups" ADD CONSTRAINT "business_category_groups_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_category_groups" ADD CONSTRAINT "business_category_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "category_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_category_overrides" ADD CONSTRAINT "business_category_overrides_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_category_overrides" ADD CONSTRAINT "business_category_overrides_categoryTemplateId_fkey" FOREIGN KEY ("categoryTemplateId") REFERENCES "category_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "category_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
