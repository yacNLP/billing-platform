import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';
const prisma = new PrismaClient();

async function syncSequence(tableName: string) {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'id'),
      COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1,
      false
    );
  `);
}

async function main() {
  await syncSequence('Tenant');

  // 1. seed tenant (entreprise)
  let tenant = await prisma.tenant.findFirst({
    where: { name: 'ACME' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'ACME' },
    });
  }

  console.log('Seeded tenant');

  // seed admin user
  await syncSequence('User');

  const adminEmail = 'admin@acme.com';

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        tenantId: tenant.id,
      },
    });

    console.log('Seeded admin user');
  }

  // seed normal user
  const userEmail = 'user@acme.com';

  let normalUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!normalUser) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    normalUser = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        role: Role.USER,
        tenantId: tenant.id,
      },
    });

    console.log('Seeded normal user');
  }

  // 2. seed customers
  await syncSequence('Customer');
  await prisma.customer.createMany({
    data: [
      { name: 'ACME Corp', email: 'billing@acme.com', tenantId: tenant.id },
      { name: 'Alice', email: 'alice@example.com', tenantId: tenant.id },
      { name: 'Bob', email: 'bob@example.com', tenantId: tenant.id },
      { name: 'Charlie', email: 'charlie@example.com', tenantId: tenant.id },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded customers');

  // 3. seed products
  await syncSequence('Product');
  for (const productData of [
    {
      name: 'Billing Platform',
      description:
        'Core billing engine for subscriptions, invoices and payments',
      isActive: true,
    },
    {
      name: 'Revenue Analytics',
      description: 'Track MRR, churn, and revenue performance',
      isActive: true,
    },
    {
      name: 'Invoice Automation',
      description: 'Automate invoice generation and lifecycle',
      isActive: true,
    },
    {
      name: 'Subscription Management',
      description: 'Manage customer subscriptions and lifecycle',
      isActive: true,
    },
  ]) {
    const existingProduct = await prisma.product.findUnique({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: productData.name,
        },
      },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          ...productData,
          tenantId: tenant.id,
        },
      });
    }
  }
  console.log('Seeded products');

  // 4. seed plans
  const product = await prisma.product.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Billing Platform',
    },
  });

  if (!product) {
    console.warn('No product found to attach plans. Skipping plans seed.');
    return;
  }

  await syncSequence('Plan');
  await prisma.plan.createMany({
    data: [
      {
        code: 'STARTER_MONTHLY',
        name: 'Starter Monthly',
        description: 'Starter plan billed monthly for early-stage teams',
        productId: product.id,
        amount: 4900,
        currency: 'EUR',
        interval: 'MONTH',
        intervalCount: 1,
        trialDays: 0,
        active: true,
        tenantId: tenant.id,
      },
      {
        code: 'GROWTH_MONTHLY',
        name: 'Growth Monthly',
        description: 'Growth plan billed monthly for scaling teams',
        productId: product.id,
        amount: 9900,
        currency: 'EUR',
        interval: 'MONTH',
        intervalCount: 1,
        trialDays: 14,
        active: true,
        tenantId: tenant.id,
      },
      {
        code: 'PRO_ANNUAL',
        name: 'Pro Annual',
        description: 'Annual pro plan for established revenue teams',
        productId: product.id,
        amount: 99000,
        currency: 'EUR',
        interval: 'YEAR',
        intervalCount: 1,
        trialDays: 30,
        active: true,
        tenantId: tenant.id,
      },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded plans');
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
