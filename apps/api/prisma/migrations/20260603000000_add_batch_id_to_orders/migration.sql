-- AlterTable: add optional batchId to group orders dispatched together to one driver
ALTER TABLE "orders" ADD COLUMN "batchId" TEXT;
