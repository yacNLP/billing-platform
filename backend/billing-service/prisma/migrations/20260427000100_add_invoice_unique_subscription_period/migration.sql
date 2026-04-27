-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_subscriptionId_periodStart_periodEnd_key" ON "Invoice"("tenantId", "subscriptionId", "periodStart", "periodEnd");
