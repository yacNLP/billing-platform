-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "billingEmail" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "taxId" TEXT,
    "vatNumber" TEXT,
    "defaultCurrency" VARCHAR(3) NOT NULL,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "invoiceFooter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
