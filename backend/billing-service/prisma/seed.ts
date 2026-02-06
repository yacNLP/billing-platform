/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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

  // 1.5 seed admin user
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
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    });

    console.log('Seeded admin user');
  }

  // 2. seed customers
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
  await prisma.product.createMany({
    data: [
      {
        name: 'Thé Vert Menthe',
        sku: 'TEA-GREEN-MINT',
        priceCents: 590,
        stock: 120,
        lowStockThreshold: 10,
        tenantId: tenant.id,
      },
      {
        name: 'Thé Noir Earl Grey',
        sku: 'TEA-BLACK-EG',
        priceCents: 690,
        stock: 80,
        lowStockThreshold: 8,
        tenantId: tenant.id,
      },
      {
        name: 'Infusion Verveine',
        sku: 'INF-VERVEINE',
        priceCents: 550,
        stock: 50,
        lowStockThreshold: 5,
        tenantId: tenant.id,
      },
      {
        name: 'Oolong Nature',
        sku: 'TEA-OOLONG',
        priceCents: 890,
        stock: 30,
        lowStockThreshold: 5,
        tenantId: tenant.id,
      },
      {
        name: 'Matcha Cérémonial',
        sku: 'TEA-MATCHA-CER',
        priceCents: 1590,
        stock: 12,
        lowStockThreshold: 3,
        tenantId: tenant.id,
      },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded products');

  // 4. seed plans
  const product = await prisma.product.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!product) {
    console.warn('No product found to attach plans. Skipping plans seed.');
    return;
  }

  await prisma.plan.createMany({
    data: [
      {
        code: 'BASIC_MONTHLY',
        name: 'Basic Monthly',
        description: 'Basic plan billed monthly',
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
        code: 'PRO_MONTHLY',
        name: 'Pro Monthly',
        description: 'Pro plan billed monthly',
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
        code: 'PRO_YEARLY',
        name: 'Pro Yearly',
        description: 'Pro plan billed yearly',
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
