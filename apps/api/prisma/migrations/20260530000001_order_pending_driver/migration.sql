-- Add pendingDriverId to orders for the driver-request-before-acceptance flow
ALTER TABLE "orders" ADD COLUMN "pendingDriverId" TEXT;
