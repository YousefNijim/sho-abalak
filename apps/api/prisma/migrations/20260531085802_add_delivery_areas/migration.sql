-- CreateTable
CREATE TABLE "_BusinessDeliveryAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BusinessDeliveryAreas_AB_unique" ON "_BusinessDeliveryAreas"("A", "B");

-- CreateIndex
CREATE INDEX "_BusinessDeliveryAreas_B_index" ON "_BusinessDeliveryAreas"("B");

-- AddForeignKey
ALTER TABLE "_BusinessDeliveryAreas" ADD CONSTRAINT "_BusinessDeliveryAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessDeliveryAreas" ADD CONSTRAINT "_BusinessDeliveryAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
