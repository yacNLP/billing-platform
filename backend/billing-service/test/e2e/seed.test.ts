import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const prisma = new PrismaClient();

// fixed tenant id for e2e tests
const TEST_TENANT_ID = 1;

/**
 * minimal, idempotent fixtures for e2e tests.
 * fully multi-tenant aware.
 */
export async function seedTestData() {
  console.log('seed db url:', process.env.DATABASE_URL);

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

  // 4) users for auth and rbac tests
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.ADMIN,
      tenantId,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.USER,
      tenantId,
    },
  });
  console.log('seeded users:', await prisma.user.findMany());
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
