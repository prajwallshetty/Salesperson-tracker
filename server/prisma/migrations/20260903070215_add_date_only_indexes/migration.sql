-- CreateIndex
CREATE INDEX "Collection_collectedAt_idx" ON "Collection"("collectedAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Visit_createdAt_idx" ON "Visit"("createdAt");
