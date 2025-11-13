import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

//Minimal fixtures for e2e tests
export async function seedTestData() {
  // 1) One customer
  await prisma.customer.create({
    data: {
      name: 'ACME Corp',
      email: 'billing@acme.com',
    },
  });

  // 2) Two products with unique sku
  await prisma.product.createMany({
    data: [
      {
        name: 'Standard Plan',
        sku: 'STD-001',
        priceCents: 990,
        stock: 100,
        isActive: true,
      },
      {
        name: 'Premium Plan',
        sku: 'PRM-001',
        priceCents: 1990,
        stock: 50,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
}

//Clean all business tables between tests.
export async function truncateAll() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Plan",
      "Product",
      "Customer"
    RESTART IDENTITY CASCADE;
  `);
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
