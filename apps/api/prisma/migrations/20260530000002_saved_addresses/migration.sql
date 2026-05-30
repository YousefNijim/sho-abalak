CREATE TABLE "saved_addresses" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "detail"    TEXT NOT NULL,
    "areaId"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_addresses_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "saved_addresses"
    ADD CONSTRAINT "saved_addresses_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_addresses"
    ADD CONSTRAINT "saved_addresses_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
