WITH ranked_products AS (
  SELECT
    id,
    "tenantId",
    name,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", name
      ORDER BY id
    ) AS duplicate_rank
  FROM "Product"
)
UPDATE "Product" AS product
SET name = product.name || ' (' || product.id || ')'
FROM ranked_products
WHERE product.id = ranked_products.id
  AND ranked_products.duplicate_rank > 1;

CREATE UNIQUE INDEX "Product_tenantId_name_key" ON "Product"("tenantId", "name");
