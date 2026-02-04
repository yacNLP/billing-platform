import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// fixed tenant id for e2e tests
const TEST_TENANT_ID = 1;

/**
 * minimal, idempotent fixtures for e2e tests.
 * fully multi-tenant aware.
 */
export async function seedTestData() {
  // 1) tenant (idempotent)
  const tenant = await prisma.tenant.upsert({
    where: { id: TEST_TENANT_ID },
    update: {},
    create: {
      id: TEST_TENANT_ID,
      name: 'Test Tenant',
    },
  });

  const tenantId = tenant.id;

  // 2) customer (idempotent, scoped by tenant)
  await prisma.customer.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email: 'billing@acme.com',
      },
    },
    update: {},
    create: {
      tenantId,
      name: 'ACME Corp',
      email: 'billing@acme.com',
    },
  });

  // 3) products (idempotent, scoped by tenant)
  await prisma.product.createMany({
    data: [
      {
        tenantId,
        name: 'Standard Plan',
        sku: 'STD-001',
        priceCents: 990,
        stock: 100,
        isActive: true,
      },
      {
        tenantId,
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
