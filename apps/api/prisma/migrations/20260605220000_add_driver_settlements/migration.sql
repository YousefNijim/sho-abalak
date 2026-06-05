-- AlterTable
ALTER TABLE "drivers" ADD COLUMN "platformBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "vehicleType" TEXT DEFAULT 'MOTORCYCLE';

-- CreateTable
CREATE TABLE "driver_settlements" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_settlements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "driver_settlements" ADD CONSTRAINT "driver_settlements_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
