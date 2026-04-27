import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import type { BillingInterval } from '@prisma/client';

import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { login, loginAsAdmin } from '../utils/e2e-auth';

interface AnalyticsSummaryResponse {
  totalCustomers: number;
  activeSubscriptions: number;
  overdueInvoicesCount: number;
  overdueAmount: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  mrr: number;
  paidInvoicesThisMonth: number;
}

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
  status: string;
  amountSnapshot: number;
  currencySnapshot: string;
  intervalSnapshot: BillingInterval;
  intervalCountSnapshot: number;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
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
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaymentResponse {
  id: number;
  tenantId: number;
  invoiceId: number;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
  paidAt: string | null;
  failureReason: string | null;
  provider: string | null;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreatePaymentOverrides {
  paidAt?: string;
  failureReason?: string;
}

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

function expectSummaryShape(summary: AnalyticsSummaryResponse): void {
  expect(typeof summary.totalCustomers).toBe('number');
  expect(typeof summary.activeSubscriptions).toBe('number');
  expect(typeof summary.overdueInvoicesCount).toBe('number');
  expect(typeof summary.overdueAmount).toBe('number');
  expect(typeof summary.successfulPaymentsCount).toBe('number');
  expect(typeof summary.failedPaymentsCount).toBe('number');
  expect(typeof summary.mrr).toBe('number');
  expect(typeof summary.paidInvoicesThisMonth).toBe('number');
}

function expectSummaryDelta(
  before: AnalyticsSummaryResponse,
  after: AnalyticsSummaryResponse,
  expected: Partial<AnalyticsSummaryResponse>,
): void {
  const metrics = Object.keys(expected) as Array<
    keyof AnalyticsSummaryResponse
  >;

  for (const metric of metrics) {
    const value = expected[metric];

    expect(value).toBeDefined();
    expect(after[metric] - before[metric]).toBe(value);
  }
}

async function getSummary(
  client: E2EClient,
): Promise<AnalyticsSummaryResponse> {
  const res = await client.get('/analytics/summary').expect(200);
  return res.body as AnalyticsSummaryResponse;
}

async function createTestCustomer(
  client: E2EClient,
  prefix = 'analytics_customer',
): Promise<CustomerResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/customers', {
      name: `Analytics Customer ${suffix}`,
      email: `${prefix}_${suffix}@example.com`,
    })
    .expect(201);

  return res.body as CustomerResponse;
}

async function createTestProduct(
  client: E2EClient,
  prefix = 'analytics_product',
): Promise<ProductResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/products', {
      name: `Analytics Product ${suffix}`,
      description: `${prefix} description ${suffix}`,
      isActive: true,
    })
    .expect(201);

  return res.body as ProductResponse;
}

async function createTestPlan(
  client: E2EClient,
  productId: number,
  overrides: Partial<PlanResponse> = {},
): Promise<PlanResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/plans', {
      code: `ANALYTICS_PLAN_${suffix}`,
      name: `Analytics Plan ${suffix}`,
      description: 'Analytics test plan',
      amount: 4900,
      currency: 'EUR',
      interval: 'MONTH',
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId,
      ...overrides,
    })
    .expect(201);

  return res.body as PlanResponse;
}

async function createTestSubscription(
  client: E2EClient,
  customerId: number,
  planId: number,
  overrides: Partial<{
    startDate: string;
    cancelAtPeriodEnd: boolean;
  }> = {},
): Promise<SubscriptionResponse> {
  const res = await client
    .post('/subscriptions', {
      customerId,
      planId,
      ...overrides,
    })
    .expect(201);

  return res.body as SubscriptionResponse;
}

async function createTestInvoice(
  client: E2EClient,
  customerId: number,
  subscriptionId: number,
  overrides: Partial<{
    amountDue: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
    issuedAt: string;
    dueAt: string;
  }> = {},
): Promise<InvoiceResponse> {
  const periodStart = new Date('2026-03-01T00:00:00.000Z');
  const periodEnd = new Date('2026-04-01T00:00:00.000Z');
  const issuedAt = new Date('2026-03-01T00:00:00.000Z');
  const dueAt = new Date('2026-03-08T00:00:00.000Z');

  const res = await client
    .post('/invoices', {
      customerId,
      subscriptionId,
      amountDue: 4900,
      currency: 'EUR',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      ...overrides,
    })
    .expect(201);

  return res.body as InvoiceResponse;
}

async function createTestPayment(
  client: E2EClient,
  invoice: InvoiceResponse,
  status: 'SUCCESS' | 'FAILED',
  overrides: CreatePaymentOverrides = {},
): Promise<PaymentResponse> {
  const res = await client
    .post('/payments', {
      invoiceId: invoice.id,
      amount: invoice.amountDue,
      currency: invoice.currency,
      status,
      ...(status === 'SUCCESS'
        ? { paidAt: overrides.paidAt ?? new Date().toISOString() }
        : { failureReason: overrides.failureReason ?? 'card_declined' }),
      provider: 'stripe',
      providerReference: `analytics_${status}_${uniqueSuffix()}`,
    })
    .expect(201);

  return res.body as PaymentResponse;
}

describe('Analytics e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let tenantBAdminClient: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    tenantBAdminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await login(tenantBAdminClient, 'admin2@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /analytics/summary returns the expected shape', async () => {
    const summary = await getSummary(adminClient);

    expectSummaryShape(summary);
  });

  it('GET /analytics/summary is tenant-scoped', async () => {
    const beforeA = await getSummary(adminClient);
    const beforeB = await getSummary(tenantBAdminClient);
    const pastDueAt = new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const futureDueAt = new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const customerA = await createTestCustomer(
      adminClient,
      'analytics_tenant_a',
    );
    const productA = await createTestProduct(adminClient, 'analytics_tenant_a');
    const planA = await createTestPlan(adminClient, productA.id, {
      amount: 3000,
      interval: 'MONTH',
      intervalCount: 1,
    });
    const subscriptionA = await createTestSubscription(
      adminClient,
      customerA.id,
      planA.id,
    );
    const overdueInvoiceA = await createTestInvoice(
      adminClient,
      customerA.id,
      subscriptionA.id,
      {
        amountDue: 700,
        dueAt: pastDueAt,
      },
    );
    await adminClient
      .patch(`/invoices/${overdueInvoiceA.id}/overdue`)
      .expect(200);

    const customerB = await createTestCustomer(
      tenantBAdminClient,
      'analytics_tenant_b',
    );
    const productB = await createTestProduct(
      tenantBAdminClient,
      'analytics_tenant_b',
    );
    const planB = await createTestPlan(tenantBAdminClient, productB.id, {
      amount: 24000,
      interval: 'YEAR',
      intervalCount: 1,
    });
    const subscriptionB = await createTestSubscription(
      tenantBAdminClient,
      customerB.id,
      planB.id,
    );
    const failedInvoiceB = await createTestInvoice(
      tenantBAdminClient,
      customerB.id,
      subscriptionB.id,
      {
        amountDue: 900,
        dueAt: futureDueAt,
      },
    );
    await createTestPayment(tenantBAdminClient, failedInvoiceB, 'FAILED');

    const afterA = await getSummary(adminClient);
    const afterB = await getSummary(tenantBAdminClient);

    expectSummaryDelta(beforeA, afterA, {
      totalCustomers: 1,
      activeSubscriptions: 1,
      overdueInvoicesCount: 1,
      overdueAmount: 700,
      failedPaymentsCount: 0,
      successfulPaymentsCount: 0,
      mrr: 3000,
      paidInvoicesThisMonth: 0,
    });

    expectSummaryDelta(beforeB, afterB, {
      totalCustomers: 1,
      activeSubscriptions: 1,
      overdueInvoicesCount: 0,
      overdueAmount: 0,
      failedPaymentsCount: 1,
      successfulPaymentsCount: 0,
      mrr: 2000,
      paidInvoicesThisMonth: 0,
    });
  });

  it('GET /analytics/summary returns controlled tenant metrics correctly', async () => {
    const before = await getSummary(adminClient);
    const pastDueAt = new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const futureDueAt = new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const paidAt = new Date().toISOString();

    const monthlyCustomer = await createTestCustomer(
      adminClient,
      'analytics_controlled_monthly',
    );
    const yearlyCustomer = await createTestCustomer(
      adminClient,
      'analytics_controlled_yearly',
    );
    const product = await createTestProduct(
      adminClient,
      'analytics_controlled',
    );

    const monthlyPlan = await createTestPlan(adminClient, product.id, {
      amount: 3000,
      interval: 'MONTH',
      intervalCount: 1,
    });
    const yearlyPlan = await createTestPlan(adminClient, product.id, {
      amount: 24000,
      interval: 'YEAR',
      intervalCount: 1,
      currency: 'EUR',
    });

    const monthlySubscription = await createTestSubscription(
      adminClient,
      monthlyCustomer.id,
      monthlyPlan.id,
    );
    const yearlySubscription = await createTestSubscription(
      adminClient,
      yearlyCustomer.id,
      yearlyPlan.id,
    );

    const overdueInvoice = await createTestInvoice(
      adminClient,
      monthlyCustomer.id,
      monthlySubscription.id,
      {
        amountDue: 700,
        dueAt: pastDueAt,
      },
    );
    await adminClient
      .patch(`/invoices/${overdueInvoice.id}/overdue`)
      .expect(200);

    const successInvoice = await createTestInvoice(
      adminClient,
      yearlyCustomer.id,
      yearlySubscription.id,
      {
        amountDue: 800,
        dueAt: futureDueAt,
      },
    );
    await createTestPayment(adminClient, successInvoice, 'SUCCESS', {
      paidAt,
    });

    const failedInvoice = await createTestInvoice(
      adminClient,
      monthlyCustomer.id,
      monthlySubscription.id,
      {
        amountDue: 900,
        periodStart: new Date('2026-06-01T00:00:00.000Z').toISOString(),
        periodEnd: new Date('2026-07-01T00:00:00.000Z').toISOString(),
        issuedAt: new Date('2026-06-01T00:00:00.000Z').toISOString(),
        dueAt: new Date('2026-06-08T00:00:00.000Z').toISOString(),
      },
    );
    await createTestPayment(adminClient, failedInvoice, 'FAILED');

    const after = await getSummary(adminClient);

    expectSummaryShape(after);
    expectSummaryDelta(before, after, {
      totalCustomers: 2,
      activeSubscriptions: 2,
      overdueInvoicesCount: 1,
      overdueAmount: 700,
      successfulPaymentsCount: 1,
      failedPaymentsCount: 1,
      mrr: 5000,
      paidInvoicesThisMonth: 1,
    });
  });
});
