import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import type { BillingInterval } from '@prisma/client';

import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

jest.setTimeout(20_000);

interface CustomerResponse {
  id: number;
  name: string;
  email: string;
}

interface ProductResponse {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface PlanResponse {
  id: number;
  code: string;
  name: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  active: boolean;
  productId: number;
}

interface SubscriptionResponse {
  id: number;
  tenantId: number;
  customerId: number;
  planId: number;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';
}

interface InvoiceResponse {
  id: number;
  tenantId: number;
  subscriptionId: number;
  customerId: number;
  invoiceNumber: string;
  status: 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';
  currency: string;
  amountDue: number;
  amountPaid: number;
  dueAt: string;
  paidAt: string | null;
  voidedAt: string | null;
}

interface JobSummaryResponse {
  scanned: number;
  updated: number;
  skipped: number;
}

interface SubscriptionFixture {
  customer: CustomerResponse;
  product: ProductResponse;
  plan: PlanResponse;
  subscription: SubscriptionResponse;
  invoice: InvoiceResponse;
}

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

async function createTestCustomer(
  client: E2EClient,
): Promise<CustomerResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/customers', {
      name: `Admin Jobs Customer ${suffix}`,
      email: `admin_jobs_customer_${suffix}@example.com`,
    })
    .expect(201);

  return res.body as CustomerResponse;
}

async function createTestProduct(client: E2EClient): Promise<ProductResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/products', {
      name: `Admin Jobs Product ${suffix}`,
      description: `Admin jobs product ${suffix}`,
      isActive: true,
    })
    .expect(201);

  return res.body as ProductResponse;
}

async function createTestPlan(
  client: E2EClient,
  productId: number,
  overrides?: Partial<{
    amount: number;
    currency: string;
    interval: BillingInterval;
    intervalCount: number;
    active: boolean;
  }>,
): Promise<PlanResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/plans', {
      code: `ADMIN_JOBS_PLAN_${suffix}`,
      name: `Admin Jobs Plan ${suffix}`,
      description: 'Admin jobs test plan',
      amount: overrides?.amount ?? 4900,
      currency: overrides?.currency ?? 'EUR',
      interval: overrides?.interval ?? 'MONTH',
      intervalCount: overrides?.intervalCount ?? 1,
      trialDays: 0,
      active: overrides?.active ?? true,
      productId,
    })
    .expect(201);

  return res.body as PlanResponse;
}

async function createTestSubscription(
  client: E2EClient,
  customerId: number,
  planId: number,
  overrides?: Partial<{
    startDate: string;
    cancelAtPeriodEnd: boolean;
  }>,
): Promise<SubscriptionResponse> {
  const res = await client
    .post('/subscriptions', {
      customerId,
      planId,
      ...(overrides?.startDate ? { startDate: overrides.startDate } : {}),
      ...(overrides?.cancelAtPeriodEnd !== undefined
        ? { cancelAtPeriodEnd: overrides.cancelAtPeriodEnd }
        : {}),
    })
    .expect(201);

  return res.body as SubscriptionResponse;
}

async function createSubscriptionFixture(
  client: E2EClient,
  prisma: PrismaService,
  options?: {
    plan?: Partial<{
      amount: number;
      currency: string;
      interval: BillingInterval;
      intervalCount: number;
      active: boolean;
    }>;
    subscription?: Partial<{
      startDate: string;
      cancelAtPeriodEnd: boolean;
    }>;
  },
): Promise<SubscriptionFixture> {
  const customer = await createTestCustomer(client);
  const product = await createTestProduct(client);
  const plan = await createTestPlan(client, product.id, options?.plan);
  const subscription = await createTestSubscription(
    client,
    customer.id,
    plan.id,
    options?.subscription,
  );

  const invoice = await prisma.invoice.findFirstOrThrow({
    where: {
      tenantId: 1,
      subscriptionId: subscription.id,
    },
    orderBy: {
      id: 'desc',
    },
  });

  return {
    customer,
    product,
    plan,
    subscription,
    invoice: {
      id: invoice.id,
      tenantId: invoice.tenantId,
      subscriptionId: invoice.subscriptionId,
      customerId: invoice.customerId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      amountDue: invoice.amountDue,
      amountPaid: invoice.amountPaid,
      dueAt: invoice.dueAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() ?? null,
      voidedAt: invoice.voidedAt?.toISOString() ?? null,
    },
  };
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

function computePeriodEnd(
  startDate: Date,
  interval: BillingInterval,
  intervalCount: number,
): Date {
  switch (interval) {
    case 'DAY':
      return addDays(startDate, intervalCount);
    case 'WEEK':
      return addDays(startDate, intervalCount * 7);
    case 'MONTH':
      return addMonthsClamped(startDate, intervalCount);
    case 'YEAR':
      return addYearsClamped(startDate, intervalCount);
    default:
      throw new Error('Unsupported billing interval');
  }
}

describe('Admin Jobs e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let userClient: E2EClient;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    userClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await loginAsUser(userClient);

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows ADMIN only to run admin jobs', async () => {
    await userClient.post('/admin/jobs/mark-overdue-invoices').expect(403);

    await userClient
      .post('/admin/jobs/update-past-due-subscriptions')
      .expect(403);

    await userClient.post('/admin/jobs/renew-due-subscriptions').expect(403);
    await userClient.post('/admin/jobs/generate-due-invoices').expect(403);
  });

  it('POST /admin/jobs/mark-overdue-invoices updates only past-due issued invoices', async () => {
    const overdueIssued = await createSubscriptionFixture(adminClient, prisma);
    const futureIssued = await createSubscriptionFixture(adminClient, prisma);
    const paidInvoice = await createSubscriptionFixture(adminClient, prisma);
    const voidInvoice = await createSubscriptionFixture(adminClient, prisma);

    const now = new Date();
    const pastDue = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const futureDue = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    await prisma.invoice.update({
      where: { id: overdueIssued.invoice.id },
      data: {
        status: 'ISSUED',
        dueAt: pastDue,
        amountPaid: 0,
        paidAt: null,
        voidedAt: null,
      },
    });

    await prisma.invoice.update({
      where: { id: futureIssued.invoice.id },
      data: {
        status: 'ISSUED',
        dueAt: futureDue,
        amountPaid: 0,
        paidAt: null,
        voidedAt: null,
      },
    });

    await prisma.invoice.update({
      where: { id: paidInvoice.invoice.id },
      data: {
        status: 'PAID',
        dueAt: pastDue,
        amountPaid: paidInvoice.invoice.amountDue,
        paidAt: now,
      },
    });

    await prisma.invoice.update({
      where: { id: voidInvoice.invoice.id },
      data: {
        status: 'VOID',
        dueAt: pastDue,
        voidedAt: now,
      },
    });

    const expectedScanned = await prisma.invoice.count({
      where: {
        tenantId: 1,
        status: 'ISSUED',
      },
    });
    const expectedUpdated = await prisma.invoice.count({
      where: {
        tenantId: 1,
        status: 'ISSUED',
        dueAt: {
          lt: new Date(),
        },
      },
    });

    const res = await adminClient
      .post('/admin/jobs/mark-overdue-invoices')
      .expect(201);

    const payload = res.body as JobSummaryResponse;
    expect(payload).toEqual({
      scanned: expectedScanned,
      updated: expectedUpdated,
      skipped: expectedScanned - expectedUpdated,
    });

    const refreshedOverdue = await prisma.invoice.findUniqueOrThrow({
      where: { id: overdueIssued.invoice.id },
    });
    const refreshedFuture = await prisma.invoice.findUniqueOrThrow({
      where: { id: futureIssued.invoice.id },
    });
    const refreshedPaid = await prisma.invoice.findUniqueOrThrow({
      where: { id: paidInvoice.invoice.id },
    });
    const refreshedVoid = await prisma.invoice.findUniqueOrThrow({
      where: { id: voidInvoice.invoice.id },
    });

    expect(refreshedOverdue.status).toBe('OVERDUE');
    expect(refreshedFuture.status).toBe('ISSUED');
    expect(refreshedPaid.status).toBe('PAID');
    expect(refreshedVoid.status).toBe('VOID');
  });

  it('POST /admin/jobs/update-past-due-subscriptions updates only active subscriptions with unpaid overdue invoices', async () => {
    const activePastDue = await createSubscriptionFixture(adminClient, prisma);
    const activeHealthy = await createSubscriptionFixture(adminClient, prisma);
    const canceledPastDue = await createSubscriptionFixture(
      adminClient,
      prisma,
    );
    const expiredPastDue = await createSubscriptionFixture(adminClient, prisma);

    const now = new Date();

    await prisma.invoice.update({
      where: { id: activePastDue.invoice.id },
      data: {
        status: 'OVERDUE',
        amountPaid: 0,
        dueAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.invoice.update({
      where: { id: activeHealthy.invoice.id },
      data: {
        status: 'OVERDUE',
        amountPaid: activeHealthy.invoice.amountDue,
        paidAt: now,
      },
    });

    await prisma.invoice.update({
      where: { id: canceledPastDue.invoice.id },
      data: {
        status: 'OVERDUE',
        amountPaid: 0,
      },
    });

    await prisma.invoice.update({
      where: { id: expiredPastDue.invoice.id },
      data: {
        status: 'OVERDUE',
        amountPaid: 0,
      },
    });

    await prisma.subscription.update({
      where: { id: canceledPastDue.subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: now,
      },
    });

    await prisma.subscription.update({
      where: { id: expiredPastDue.subscription.id },
      data: {
        status: 'EXPIRED',
        endedAt: now,
      },
    });

    const expectedScanned = await prisma.subscription.count({
      where: {
        tenantId: 1,
        status: 'ACTIVE',
      },
    });
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        tenantId: 1,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        tenantId: 1,
        status: 'OVERDUE',
      },
      select: {
        subscriptionId: true,
        amountDue: true,
        amountPaid: true,
      },
    });
    const overdueUnpaidSubscriptionIds = new Set(
      overdueInvoices
        .filter((invoice) => invoice.amountPaid < invoice.amountDue)
        .map((invoice) => invoice.subscriptionId),
    );
    const expectedUpdated = activeSubscriptions.filter((subscription) =>
      overdueUnpaidSubscriptionIds.has(subscription.id),
    ).length;

    const res = await adminClient
      .post('/admin/jobs/update-past-due-subscriptions')
      .expect(201);

    const payload = res.body as JobSummaryResponse;
    expect(payload).toEqual({
      scanned: expectedScanned,
      updated: expectedUpdated,
      skipped: expectedScanned - expectedUpdated,
    });

    const refreshedActivePastDue = await prisma.subscription.findUniqueOrThrow({
      where: { id: activePastDue.subscription.id },
    });
    const refreshedActiveHealthy = await prisma.subscription.findUniqueOrThrow({
      where: { id: activeHealthy.subscription.id },
    });
    const refreshedCanceled = await prisma.subscription.findUniqueOrThrow({
      where: { id: canceledPastDue.subscription.id },
    });
    const refreshedExpired = await prisma.subscription.findUniqueOrThrow({
      where: { id: expiredPastDue.subscription.id },
    });

    expect(refreshedActivePastDue.status).toBe('PAST_DUE');
    expect(refreshedActiveHealthy.status).toBe('ACTIVE');
    expect(refreshedCanceled.status).toBe('CANCELED');
    expect(refreshedExpired.status).toBe('EXPIRED');
  });

  it('POST /admin/jobs/renew-due-subscriptions runs the renewal batch', async () => {
    const renewable = await createSubscriptionFixture(adminClient, prisma);
    const nonRenewable = await createSubscriptionFixture(adminClient, prisma);
    const preInvoicedRenewable = await createSubscriptionFixture(
      adminClient,
      prisma,
    );
    const now = new Date();

    await prisma.subscription.update({
      where: { id: renewable.subscription.id },
      data: {
        currentPeriodEnd: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        status: 'ACTIVE',
      },
    });

    await prisma.subscription.update({
      where: { id: nonRenewable.subscription.id },
      data: {
        currentPeriodEnd: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: true,
        status: 'ACTIVE',
      },
    });

    await prisma.subscription.update({
      where: { id: preInvoicedRenewable.subscription.id },
      data: {
        currentPeriodEnd: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        status: 'ACTIVE',
      },
    });

    const preInvoicedRenewableSubscription =
      await prisma.subscription.findUniqueOrThrow({
        where: { id: preInvoicedRenewable.subscription.id },
      });
    const preCreatedNextInvoicePeriodStart =
      preInvoicedRenewableSubscription.currentPeriodEnd;
    const preCreatedNextInvoicePeriodEnd = computePeriodEnd(
      preCreatedNextInvoicePeriodStart,
      preInvoicedRenewableSubscription.intervalSnapshot,
      preInvoicedRenewableSubscription.intervalCountSnapshot,
    );

    await prisma.invoice.create({
      data: {
        tenantId: 1,
        customerId: preInvoicedRenewableSubscription.customerId,
        subscriptionId: preInvoicedRenewableSubscription.id,
        invoiceNumber: `INV-1-RENEW-${uniqueSuffix()}`,
        status: 'ISSUED',
        currency: preInvoicedRenewableSubscription.currencySnapshot,
        amountDue: preInvoicedRenewableSubscription.amountSnapshot,
        amountPaid: 0,
        periodStart: preCreatedNextInvoicePeriodStart,
        periodEnd: preCreatedNextInvoicePeriodEnd,
        issuedAt: new Date(),
        dueAt: addDays(new Date(), 7),
      },
    });

    const preInvoicedInvoicesBefore = await prisma.invoice.findMany({
      where: {
        tenantId: 1,
        subscriptionId: preInvoicedRenewableSubscription.id,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const expectedScanned = await prisma.subscription.count({
      where: {
        tenantId: 1,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
      },
    });
    const expectedUpdated = await prisma.subscription.count({
      where: {
        tenantId: 1,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: {
          lt: new Date(),
        },
      },
    });

    const res = await adminClient
      .post('/admin/jobs/renew-due-subscriptions')
      .expect(201);

    const payload = res.body as JobSummaryResponse;
    expect(payload).toEqual({
      scanned: expectedScanned,
      updated: expectedUpdated,
      skipped: expectedScanned - expectedUpdated,
    });

    const refreshedRenewable = await prisma.subscription.findUniqueOrThrow({
      where: { id: renewable.subscription.id },
    });
    const refreshedNonRenewable = await prisma.subscription.findUniqueOrThrow({
      where: { id: nonRenewable.subscription.id },
    });
    const refreshedPreInvoicedRenewable =
      await prisma.subscription.findUniqueOrThrow({
        where: { id: preInvoicedRenewable.subscription.id },
      });
    const preInvoicedInvoicesAfter = await prisma.invoice.findMany({
      where: {
        tenantId: 1,
        subscriptionId: preInvoicedRenewableSubscription.id,
      },
      orderBy: {
        id: 'asc',
      },
    });

    expect(
      new Date(refreshedRenewable.currentPeriodEnd).getTime(),
    ).toBeGreaterThan(new Date(now).getTime());
    expect(refreshedRenewable.status).toBe('ACTIVE');
    expect(refreshedNonRenewable.status).toBe('ACTIVE');
    expect(refreshedPreInvoicedRenewable.currentPeriodStart.toISOString()).toBe(
      preCreatedNextInvoicePeriodStart.toISOString(),
    );
    expect(refreshedPreInvoicedRenewable.currentPeriodEnd.toISOString()).toBe(
      preCreatedNextInvoicePeriodEnd.toISOString(),
    );
    expect(preInvoicedInvoicesAfter).toHaveLength(
      preInvoicedInvoicesBefore.length,
    );
  });

  it('POST /admin/jobs/generate-due-invoices generates only missing due invoices and is idempotent', async () => {
    const currentMissing = await createSubscriptionFixture(
      adminClient,
      prisma,
      {
        plan: {
          interval: 'DAY',
          intervalCount: 1,
        },
        subscription: {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: false,
        },
      },
    );
    const alreadyBilledCurrent = await createSubscriptionFixture(
      adminClient,
      prisma,
      {
        plan: {
          interval: 'DAY',
          intervalCount: 1,
        },
        subscription: {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: false,
        },
      },
    );
    const canceledDue = await createSubscriptionFixture(adminClient, prisma, {
      plan: {
        interval: 'DAY',
        intervalCount: 1,
      },
      subscription: {
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      },
    });
    const expiredDue = await createSubscriptionFixture(adminClient, prisma, {
      plan: {
        interval: 'DAY',
        intervalCount: 1,
      },
      subscription: {
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      },
    });

    await prisma.subscription.update({
      where: { id: canceledDue.subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    await prisma.subscription.update({
      where: { id: expiredDue.subscription.id },
      data: {
        status: 'EXPIRED',
        endedAt: new Date(),
      },
    });

    await prisma.invoice.delete({
      where: { id: currentMissing.invoice.id },
    });

    const currentMissingSubscription =
      await prisma.subscription.findUniqueOrThrow({
        where: { id: currentMissing.subscription.id },
      });
    const alreadyBilledCurrentSubscription =
      await prisma.subscription.findUniqueOrThrow({
        where: { id: alreadyBilledCurrent.subscription.id },
      });

    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        tenantId: 1,
        status: 'ACTIVE',
      },
      orderBy: {
        id: 'asc',
      },
    });
    const invoicesBefore = await prisma.invoice.findMany({
      where: {
        tenantId: 1,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const expectedScanned = activeSubscriptions.length;

    const currentMissingInvoicesBefore = invoicesBefore.filter(
      (invoice) => invoice.subscriptionId === currentMissingSubscription.id,
    );
    const alreadyBilledCurrentInvoicesBefore = invoicesBefore.filter(
      (invoice) =>
        invoice.subscriptionId === alreadyBilledCurrentSubscription.id,
    );
    const canceledInvoicesBefore = invoicesBefore.filter(
      (invoice) => invoice.subscriptionId === canceledDue.subscription.id,
    );
    const expiredInvoicesBefore = invoicesBefore.filter(
      (invoice) => invoice.subscriptionId === expiredDue.subscription.id,
    );

    const res = await adminClient
      .post('/admin/jobs/generate-due-invoices')
      .expect(201);

    const payload = res.body as JobSummaryResponse;

    const invoicesAfterFirstRun = await prisma.invoice.findMany({
      where: {
        tenantId: 1,
      },
      orderBy: {
        id: 'asc',
      },
    });
    const createdInvoicesCount =
      invoicesAfterFirstRun.length - invoicesBefore.length;

    expect(payload).toEqual({
      scanned: expectedScanned,
      updated: createdInvoicesCount,
      skipped: expectedScanned - createdInvoicesCount,
    });

    const currentMissingInvoicesAfter = invoicesAfterFirstRun.filter(
      (invoice) => invoice.subscriptionId === currentMissingSubscription.id,
    );
    const alreadyBilledCurrentInvoicesAfter = invoicesAfterFirstRun.filter(
      (invoice) =>
        invoice.subscriptionId === alreadyBilledCurrentSubscription.id,
    );
    const canceledInvoicesAfter = invoicesAfterFirstRun.filter(
      (invoice) => invoice.subscriptionId === canceledDue.subscription.id,
    );
    const expiredInvoicesAfter = invoicesAfterFirstRun.filter(
      (invoice) => invoice.subscriptionId === expiredDue.subscription.id,
    );

    expect(currentMissingInvoicesAfter).toHaveLength(
      currentMissingInvoicesBefore.length + 1,
    );
    expect(alreadyBilledCurrentInvoicesAfter).toHaveLength(
      alreadyBilledCurrentInvoicesBefore.length,
    );
    expect(canceledInvoicesAfter).toHaveLength(canceledInvoicesBefore.length);
    expect(expiredInvoicesAfter).toHaveLength(expiredInvoicesBefore.length);

    const generatedCurrentInvoice = currentMissingInvoicesAfter.find(
      (invoice) =>
        !currentMissingInvoicesBefore.some((item) => item.id === invoice.id),
    );
    expect(generatedCurrentInvoice).toBeDefined();
    expect(generatedCurrentInvoice?.periodStart.toISOString()).toBe(
      currentMissingSubscription.currentPeriodStart.toISOString(),
    );
    expect(generatedCurrentInvoice?.periodEnd.toISOString()).toBe(
      currentMissingSubscription.currentPeriodEnd.toISOString(),
    );
    expect(
      currentMissingInvoicesAfter.some(
        (invoice) =>
          invoice.periodStart.getTime() ===
            currentMissingSubscription.currentPeriodEnd.getTime() &&
          invoice.periodEnd.getTime() ===
            computePeriodEnd(
              currentMissingSubscription.currentPeriodEnd,
              currentMissingSubscription.intervalSnapshot,
              currentMissingSubscription.intervalCountSnapshot,
            ).getTime(),
      ),
    ).toBe(false);

    const secondRes = await adminClient
      .post('/admin/jobs/generate-due-invoices')
      .expect(201);

    const secondPayload = secondRes.body as JobSummaryResponse;
    expect(secondPayload).toEqual({
      scanned: expectedScanned,
      updated: 0,
      skipped: expectedScanned,
    });
  });
});
