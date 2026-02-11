import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_1_ID = 1;
const TENANT_2_ID = 2;

async function hashPassword() {
  return bcrypt.hash('password123', 10);
}

/**
 * Minimal, idempotent fixtures for e2e tests.
 * Multi-tenant aware.
 */
export async function seedTestData() {
  console.log('seed db url:', process.env.DATABASE_URL);

  // =============================
  // TENANTS
  // =============================

  const tenant1 = await prisma.tenant.upsert({
    where: { id: TENANT_1_ID },
    update: {},
    create: {
      id: TENANT_1_ID,
      name: 'Test Tenant 1',
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { id: TENANT_2_ID },
    update: {},
    create: {
      id: TENANT_2_ID,
      name: 'Test Tenant 2',
    },
  });

  // =============================
  // TENANT 1 DATA
  // =============================

  await prisma.customer.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant1.id,
        email: 'billing@acme.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      name: 'ACME Corp',
      email: 'billing@acme.com',
    },
  });

  await prisma.product.createMany({
    data: [
      {
        tenantId: tenant1.id,
        name: 'Standard Plan',
        sku: 'STD-001',
        priceCents: 990,
        stock: 100,
        isActive: true,
      },
      {
        tenantId: tenant1.id,
        name: 'Premium Plan',
        sku: 'PRM-001',
        priceCents: 1990,
        stock: 50,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  // =============================
  // USERS
  // =============================

  const passwordHash = await hashPassword();

  // Tenant 1
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: passwordHash,
      role: Role.ADMIN,
      tenantId: tenant1.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      password: passwordHash,
      role: Role.USER,
      tenantId: tenant1.id,
    },
  });

  // Tenant 2 (needed for isolation test)
  await prisma.user.upsert({
    where: { email: 'admin2@test.com' },
    update: {},
    create: {
      email: 'admin2@test.com',
      password: passwordHash,
      role: Role.ADMIN,
      tenantId: tenant2.id,
    },
  });

  console.log('seeded users:', await prisma.user.findMany());
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
