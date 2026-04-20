DROP INDEX IF EXISTS "Product_tenantId_sku_key";

ALTER TABLE "Product"
  DROP COLUMN "sku",
  DROP COLUMN "priceCents",
  DROP COLUMN "currency",
  DROP COLUMN "taxRate",
  DROP COLUMN "stock",
  DROP COLUMN "lowStockThreshold";
