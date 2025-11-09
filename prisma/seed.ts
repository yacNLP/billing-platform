// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // seed customers
  await prisma.customer.createMany({
    data: [
      { name: 'ACME Corp', email: 'billing@acme.com' },
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded customers');

  // seed products
  await prisma.product.createMany({
    data: [
      {
        name: 'Thé Vert Menthe',
        sku: 'TEA-GREEN-MINT',
        priceCents: 590,
        stock: 120,
        lowStockThreshold: 10,
      },
      {
        name: 'Thé Noir Earl Grey',
        sku: 'TEA-BLACK-EG',
        priceCents: 690,
        stock: 80,
        lowStockThreshold: 8,
      },
      {
        name: 'Infusion Verveine',
        sku: 'INF-VERVEINE',
        priceCents: 550,
        stock: 50,
        lowStockThreshold: 5,
      },
      {
        name: 'Oolong Nature',
        sku: 'TEA-OOLONG',
        priceCents: 890,
        stock: 30,
        lowStockThreshold: 5,
      },
      {
        name: 'Matcha Cérémonial',
        sku: 'TEA-MATCHA-CER',
        priceCents: 1590,
        stock: 12,
        lowStockThreshold: 3,
      },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded products');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
