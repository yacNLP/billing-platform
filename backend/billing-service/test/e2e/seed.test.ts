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

  for (const productData of [
    {
      tenantId: tenant1.id,
      name: 'Standard Workspace',
      description: 'Core SaaS workspace for e2e tests',
      isActive: true,
    },
    {
      tenantId: tenant1.id,
      name: 'Premium Workspace',
      description: 'Expanded SaaS workspace for e2e tests',
      isActive: true,
    },
  ]) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        tenantId: productData.tenantId,
        name: productData.name,
      },
    });

    if (!existingProduct) {
      await prisma.product.create({ data: productData });
    }
  }

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
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
