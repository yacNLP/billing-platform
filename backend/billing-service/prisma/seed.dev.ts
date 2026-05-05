import bcrypt from 'bcrypt';
import {
  BillingInterval,
  Invoice,
  InvoiceStatus,
  PaymentStatus,
  PrismaClient,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
const prisma = new PrismaClient();

const INITIAL_INVOICE_DUE_IN_DAYS = 7;

async function syncSequence(tableName: string) {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'id'),
      COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1,
      false
    );
  `);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date);
  const dayOfMonth = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return result;
}

function addYearsClamped(date: Date, years: number): Date {
  const result = new Date(date);
  const month = result.getUTCMonth();
  const dayOfMonth = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  result.setUTCMonth(month);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), month + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return result;
}

function computeCurrentPeriodEnd(
  startDate: Date,
  interval: BillingInterval,
  intervalCount: number,
): Date {
  switch (interval) {
    case BillingInterval.DAY:
      return addDays(startDate, intervalCount);
    case BillingInterval.WEEK:
      return addDays(startDate, intervalCount * 7);
    case BillingInterval.MONTH:
      return addMonthsClamped(startDate, intervalCount);
    case BillingInterval.YEAR:
      return addYearsClamped(startDate, intervalCount);
    default:
      throw new Error('Unsupported billing interval');
  }
}

async function generateInvoiceNumber(tenantId: number): Promise<string> {
  const total = await prisma.invoice.count({
    where: {
      tenantId,
    },
  });

  return `INV-${tenantId}-${String(total + 1).padStart(6, '0')}`;
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
      name: 'RevenueOps Platform',
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
      name: 'RevenueOps Platform',
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

  // 5. seed subscriptions with their initial invoices
  const customers = await prisma.customer.findMany({
    where: { tenantId: tenant.id },
    orderBy: { id: 'asc' },
  });

  const starterPlan = await prisma.plan.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'STARTER_MONTHLY',
      },
    },
  });

  const growthPlan = await prisma.plan.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'GROWTH_MONTHLY',
      },
    },
  });

  const proAnnualPlan = await prisma.plan.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'PRO_ANNUAL',
      },
    },
  });

  if (!starterPlan || !growthPlan || !proAnnualPlan) {
    console.warn(
      'Missing plans for subscriptions seed. Skipping subscriptions.',
    );
    return;
  }

  if (customers.length < 3) {
    console.warn(
      'Not enough customers for subscriptions seed. Skipping subscriptions.',
    );
    return;
  }

  await syncSequence('Subscription');
  await syncSequence('Invoice');

  const seededInvoices: Invoice[] = [];

  const subscriptionSeeds = [
    {
      customerId: customers[0].id,
      plan: starterPlan,
      startDate: new Date(Date.UTC(2026, 3, 17, 9, 0, 0)),
      cancelAtPeriodEnd: false,
    },
    {
      customerId: customers[1].id,
      plan: growthPlan,
      startDate: new Date(Date.UTC(2026, 3, 10, 9, 0, 0)),
      cancelAtPeriodEnd: true,
    },
    {
      customerId: customers[2].id,
      plan: proAnnualPlan,
      startDate: new Date(Date.UTC(2026, 2, 16, 9, 0, 0)),
      cancelAtPeriodEnd: false,
    },
  ];

  for (const seed of subscriptionSeeds) {
    const startDate = new Date(seed.startDate);
    const currentPeriodStart = new Date(startDate);
    const currentPeriodEnd = computeCurrentPeriodEnd(
      currentPeriodStart,
      seed.plan.interval,
      seed.plan.intervalCount,
    );

    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        tenantId: tenant.id,
        customerId: seed.customerId,
        planId: seed.plan.id,
        startDate,
      },
    });

    const subscription =
      existingSubscription ??
      (await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          customerId: seed.customerId,
          planId: seed.plan.id,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: seed.cancelAtPeriodEnd,
          canceledAt: null,
          amountSnapshot: seed.plan.amount,
          currencySnapshot: seed.plan.currency,
          intervalSnapshot: seed.plan.interval,
          intervalCountSnapshot: seed.plan.intervalCount,
          startDate,
          currentPeriodStart,
          currentPeriodEnd,
          endedAt: null,
        },
      }));

    const existingInitialInvoice = await prisma.invoice.findFirst({
      where: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        customerId: seed.customerId,
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd,
      },
    });

    if (!existingInitialInvoice) {
      const issuedAt = new Date(startDate);
      const dueAt = addDays(issuedAt, INITIAL_INVOICE_DUE_IN_DAYS);
      const invoiceNumber = await generateInvoiceNumber(tenant.id);

      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          subscriptionId: subscription.id,
          customerId: seed.customerId,
          invoiceNumber,
          status: InvoiceStatus.ISSUED,
          currency: subscription.currencySnapshot,
          amountDue: subscription.amountSnapshot,
          amountPaid: 0,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          issuedAt,
          dueAt,
          paidAt: null,
          voidedAt: null,
        },
      });

      seededInvoices.push(invoice);
    } else {
      seededInvoices.push(existingInitialInvoice);
    }
  }

  console.log('Seeded subscriptions and initial invoices');

  // 6. seed payments
  await syncSequence('Payment');

  const paymentSeeds = [
    {
      invoice: seededInvoices[0],
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(Date.UTC(2026, 3, 21, 10, 30, 0)),
      provider: 'stripe',
      providerReference: `seed-success-invoice-${seededInvoices[0]?.id}`,
    },
    {
      invoice: seededInvoices[1],
      status: PaymentStatus.FAILED,
      failureReason: 'Card declined',
      provider: 'stripe',
      providerReference: `seed-failed-invoice-${seededInvoices[1]?.id}`,
    },
  ];

  for (const seed of paymentSeeds) {
    if (!seed.invoice) {
      continue;
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        tenantId: tenant.id,
        invoiceId: seed.invoice.id,
        providerReference: seed.providerReference,
      },
    });

    if (existingPayment) {
      if (existingPayment.status === PaymentStatus.SUCCESS) {
        await prisma.invoice.update({
          where: { id: seed.invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            amountPaid: seed.invoice.amountDue,
            paidAt: existingPayment.paidAt,
          },
        });
      }

      continue;
    }

    if (seed.status === PaymentStatus.SUCCESS) {
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            tenantId: tenant.id,
            invoiceId: seed.invoice.id,
            status: seed.status,
            amount: seed.invoice.amountDue,
            currency: seed.invoice.currency,
            paidAt: seed.paidAt,
            provider: seed.provider,
            providerReference: seed.providerReference,
          },
        }),
        prisma.invoice.update({
          where: { id: seed.invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            amountPaid: seed.invoice.amountDue,
            paidAt: seed.paidAt,
          },
        }),
      ]);

      continue;
    }

    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        invoiceId: seed.invoice.id,
        status: seed.status,
        amount: seed.invoice.amountDue,
        currency: seed.invoice.currency,
        failureReason: seed.failureReason,
        provider: seed.provider,
        providerReference: seed.providerReference,
      },
    });
  }

  console.log('Seeded payments');
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
