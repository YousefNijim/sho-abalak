-- CreateTable: popup_ads
CREATE TABLE "popup_ads" (
    "id"            TEXT NOT NULL,
    "imageUrl"      TEXT NOT NULL,
    "title"         TEXT,
    "buttonText"    TEXT,
    "buttonUrl"     TEXT,
    "targetPage"    TEXT NOT NULL DEFAULT 'home',
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "intervalHours" INTEGER NOT NULL DEFAULT 0,
    "startsAt"      TIMESTAMP(3),
    "endsAt"        TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popup_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable: promoted_businesses
CREATE TABLE "promoted_businesses" (
    "id"         TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "areaId"     TEXT,
    "isPopup"    BOOLEAN NOT NULL DEFAULT false,
    "isActive"   BOOLEAN NOT NULL DEFAULT true,
    "priority"   INTEGER NOT NULL DEFAULT 0,
    "startsAt"   TIMESTAMP(3),
    "endsAt"     TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promoted_businesses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "promoted_businesses" ADD CONSTRAINT "promoted_businesses_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoted_businesses" ADD CONSTRAINT "promoted_businesses_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
