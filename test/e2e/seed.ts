import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Minimal, idempotent fixtures for e2e tests.
 * Can be safely executed multiple times.
 */
export async function seedTestData() {
  // 1) Customer (idempotent)
  await prisma.customer.upsert({
    where: { email: 'billing@acme.com' },
    update: {},
    create: {
      name: 'ACME Corp',
      email: 'billing@acme.com',
    },
  });

  // 2) Products (idempotent via unique sku)
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

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
