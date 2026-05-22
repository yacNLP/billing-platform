import { INestApplication } from '@nestjs/common';
import type { BillingInterval, Invoice } from '@prisma/client';
import { Server } from 'http';

import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { login, loginAsAdmin } from '../utils/e2e-auth';

jest.setTimeout(20_000);

interface CustomerResponse {
  id: number;
}

interface ProductResponse {
  id: number;
}

interface PlanResponse {
  id: number;
}

interface SubscriptionResponse {
  id: number;
}

interface RevenueActionResponse {
  key: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  type: 'OVERDUE_INVOICE' | 'PAST_DUE_SUBSCRIPTION' | 'FAILED_PAYMENT';
  entityType: string;
  entityId: number;
  amount?: number;
  currency?: string;
  suggestedAction: string;
  createdFromRule: string;
  metadata?: {
    invoiceId?: number;
    invoiceNumber?: string;
    latestFailedPaymentId?: number;
    failedAt?: string;
    customerId?: number;
    dueAt?: string;
  };
}

interface PaymentResponse {
  id: number;
  createdAt: string;
}

interface PaginatedRevenueActions {
  data: RevenueActionResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

describe('Revenue actions e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let tenantBAdminClient: E2EClient;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    tenantBAdminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await login(tenantBAdminClient, 'admin2@test.com');

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createCustomer(client: E2EClient): Promise<CustomerResponse> {
    const suffix = uniqueSuffix();
    const res = await client
      .post('/customers', {
        name: `Revenue Action Customer ${suffix}`,
        email: `revenue_action_customer_${suffix}@example.com`,
      })
      .expect(201);

    return res.body as CustomerResponse;
  }

  async function createProduct(client: E2EClient): Promise<ProductResponse> {
    const suffix = uniqueSuffix();
    const res = await client
      .post('/products', {
        name: `Revenue Action Product ${suffix}`,
        description: `Revenue action product ${suffix}`,
        isActive: true,
      })
      .expect(201);

    return res.body as ProductResponse;
  }

  async function createPlan(
    client: E2EClient,
    productId: number,
  ): Promise<PlanResponse> {
    const suffix = uniqueSuffix();
    const interval: BillingInterval = 'MONTH';
    const res = await client
      .post('/plans', {
        code: `REVENUE_ACTION_PLAN_${suffix}`,
        name: `Revenue Action Plan ${suffix}`,
        description: 'Revenue action test plan',
        amount: 4900,
        currency: 'EUR',
        interval,
        intervalCount: 1,
        trialDays: 0,
        active: true,
        productId,
      })
      .expect(201);

    return res.body as PlanResponse;
  }

  async function createSubscription(
    client: E2EClient,
    customerId: number,
    planId: number,
  ): Promise<SubscriptionResponse> {
    const res = await client
      .post('/subscriptions', { customerId, planId })
      .expect(201);

    return res.body as SubscriptionResponse;
  }

  async function createInitialInvoice(client: E2EClient): Promise<Invoice> {
    const customer = await createCustomer(client);
    const product = await createProduct(client);
    const plan = await createPlan(client, product.id);
    const subscription = await createSubscription(client, customer.id, plan.id);

    return prisma.invoice.findFirstOrThrow({
      where: { subscriptionId: subscription.id },
    });
  }

  async function createFailedPayment(
    client: E2EClient,
    invoice: Invoice,
  ): Promise<PaymentResponse> {
    const res = await client
      .post('/payments', {
        invoiceId: invoice.id,
        amount: invoice.amountDue,
        currency: invoice.currency,
        status: 'FAILED',
        failureReason: 'card_declined',
        provider: 'stripe',
        providerReference: `revenue_action_failed_${uniqueSuffix()}`,
      })
      .expect(201);

    return res.body as PaymentResponse;
  }

  it('creates one action for an overdue invoice with a remaining amount', async () => {
    const invoice = await createInitialInvoice(adminClient);
    const overdueInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'OVERDUE',
        amountPaid: 900,
        dueAt: new Date('1900-01-01T00:00:00.000Z'),
      },
    });

    const res = await adminClient
      .get('/revenue-actions')
      .query({ type: 'OVERDUE_INVOICE', pageSize: 100 })
      .expect(200);
    const payload = res.body as PaginatedRevenueActions;
    const action = payload.data.find(
      (item) => item.entityId === overdueInvoice.id,
    );

    expect(action).toMatchObject({
      key: `overdue-invoice:invoice:${overdueInvoice.id}`,
      severity: 'HIGH',
      type: 'OVERDUE_INVOICE',
      entityType: 'invoice',
      entityId: overdueInvoice.id,
      amount: overdueInvoice.amountDue - overdueInvoice.amountPaid,
      currency: overdueInvoice.currency,
      suggestedAction: 'Review invoice and collect payment',
      createdFromRule: 'overdue-invoice',
    });
    expect(
      payload.data.filter((item) => item.entityId === overdueInvoice.id),
    ).toHaveLength(1);
  });

  it('does not create an overdue invoice action for a paid invoice', async () => {
    const invoice = await createInitialInvoice(adminClient);
    const paidInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        amountPaid: invoice.amountDue,
        paidAt: new Date(),
      },
    });

    const res = await adminClient
      .get('/revenue-actions')
      .query({ type: 'OVERDUE_INVOICE', pageSize: 100 })
      .expect(200);
    const payload = res.body as PaginatedRevenueActions;

    expect(payload.data.some((item) => item.entityId === paidInvoice.id)).toBe(
      false,
    );
  });

  it('keeps overdue invoice actions tenant-scoped', async () => {
    const tenantAInvoice = await createInitialInvoice(adminClient);
    const tenantBInvoice = await createInitialInvoice(tenantBAdminClient);

    await prisma.invoice.updateMany({
      where: { id: { in: [tenantAInvoice.id, tenantBInvoice.id] } },
      data: {
        status: 'OVERDUE',
        dueAt: new Date('1900-01-02T00:00:00.000Z'),
      },
    });

    const tenantARes = await adminClient
      .get('/revenue-actions')
      .query({ type: 'OVERDUE_INVOICE', pageSize: 100 })
      .expect(200);
    const tenantAPayload = tenantARes.body as PaginatedRevenueActions;

    expect(
      tenantAPayload.data.some((item) => item.entityId === tenantAInvoice.id),
    ).toBe(true);
    expect(
      tenantAPayload.data.some((item) => item.entityId === tenantBInvoice.id),
    ).toBe(false);

    const tenantBRes = await tenantBAdminClient
      .get('/revenue-actions')
      .query({ type: 'OVERDUE_INVOICE', pageSize: 100 })
      .expect(200);
    const tenantBPayload = tenantBRes.body as PaginatedRevenueActions;

    expect(
      tenantBPayload.data.some((item) => item.entityId === tenantBInvoice.id),
    ).toBe(true);
    expect(
      tenantBPayload.data.some((item) => item.entityId === tenantAInvoice.id),
    ).toBe(false);
  });

  it('creates one action for a past due subscription', async () => {
    const customer = await createCustomer(adminClient);
    const product = await createProduct(adminClient);
    const plan = await createPlan(adminClient, product.id);
    const subscription = await createSubscription(
      adminClient,
      customer.id,
      plan.id,
    );

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'PAST_DUE',
        currentPeriodEnd: new Date('1900-01-01T00:00:00.000Z'),
      },
    });

    const res = await adminClient
      .get('/revenue-actions')
      .query({ type: 'PAST_DUE_SUBSCRIPTION', pageSize: 100 })
      .expect(200);
    const payload = res.body as PaginatedRevenueActions;
    const action = payload.data.find(
      (item) => item.entityId === subscription.id,
    );

    expect(action).toMatchObject({
      key: `past-due-subscription:subscription:${subscription.id}`,
      severity: 'HIGH',
      type: 'PAST_DUE_SUBSCRIPTION',
      entityType: 'subscription',
      entityId: subscription.id,
      suggestedAction: 'Review subscription billing status',
      createdFromRule: 'past-due-subscription',
    });
    expect(
      payload.data.filter((item) => item.entityId === subscription.id),
    ).toHaveLength(1);
  });

  it('keeps past due subscription actions tenant-scoped', async () => {
    const tenantACustomer = await createCustomer(adminClient);
    const tenantAProduct = await createProduct(adminClient);
    const tenantAPlan = await createPlan(adminClient, tenantAProduct.id);
    const tenantASubscription = await createSubscription(
      adminClient,
      tenantACustomer.id,
      tenantAPlan.id,
    );

    const tenantBCustomer = await createCustomer(tenantBAdminClient);
    const tenantBProduct = await createProduct(tenantBAdminClient);
    const tenantBPlan = await createPlan(tenantBAdminClient, tenantBProduct.id);
    const tenantBSubscription = await createSubscription(
      tenantBAdminClient,
      tenantBCustomer.id,
      tenantBPlan.id,
    );

    await prisma.subscription.updateMany({
      where: {
        id: { in: [tenantASubscription.id, tenantBSubscription.id] },
      },
      data: {
        status: 'PAST_DUE',
        currentPeriodEnd: new Date('1900-01-02T00:00:00.000Z'),
      },
    });

    const tenantARes = await adminClient
      .get('/revenue-actions')
      .query({ type: 'PAST_DUE_SUBSCRIPTION', pageSize: 100 })
      .expect(200);
    const tenantAPayload = tenantARes.body as PaginatedRevenueActions;

    expect(
      tenantAPayload.data.some(
        (item) => item.entityId === tenantASubscription.id,
      ),
    ).toBe(true);
    expect(
      tenantAPayload.data.some(
        (item) => item.entityId === tenantBSubscription.id,
      ),
    ).toBe(false);

    const tenantBRes = await tenantBAdminClient
      .get('/revenue-actions')
      .query({ type: 'PAST_DUE_SUBSCRIPTION', pageSize: 100 })
      .expect(200);
    const tenantBPayload = tenantBRes.body as PaginatedRevenueActions;

    expect(
      tenantBPayload.data.some(
        (item) => item.entityId === tenantBSubscription.id,
      ),
    ).toBe(true);
    expect(
      tenantBPayload.data.some(
        (item) => item.entityId === tenantASubscription.id,
      ),
    ).toBe(false);
  });

  it('creates one action for an unresolved failed payment on an issued invoice', async () => {
    const invoice = await createInitialInvoice(adminClient);
    const failedPayment = await createFailedPayment(adminClient, invoice);

    const res = await adminClient
      .get('/revenue-actions')
      .query({ type: 'FAILED_PAYMENT', pageSize: 100 })
      .expect(200);
    const payload = res.body as PaginatedRevenueActions;
    const action = payload.data.find((item) => item.entityId === invoice.id);

    expect(action).toMatchObject({
      key: `failed-payment:invoice:${invoice.id}`,
      severity: 'MEDIUM',
      type: 'FAILED_PAYMENT',
      entityType: 'invoice',
      entityId: invoice.id,
      amount: invoice.amountDue - invoice.amountPaid,
      currency: invoice.currency,
      suggestedAction: 'Review failed payment and follow up with customer',
      createdFromRule: 'failed-payment',
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        latestFailedPaymentId: failedPayment.id,
        customerId: invoice.customerId,
        dueAt: invoice.dueAt.toISOString(),
      },
    });
    expect(action?.metadata?.failedAt).toBeDefined();
  });

  it('does not create a failed payment action for a paid invoice', async () => {
    const invoice = await createInitialInvoice(adminClient);
    await createFailedPayment(adminClient, invoice);

    const paidInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        amountPaid: invoice.amountDue,
        paidAt: new Date(),
      },
    });

    const res = await adminClient
      .get('/revenue-actions')
      .query({ type: 'FAILED_PAYMENT', pageSize: 100 })
      .expect(200);
    const payload = res.body as PaginatedRevenueActions;

    expect(payload.data.some((item) => item.entityId === paidInvoice.id)).toBe(
      false,
    );
  });

  it('does not create a failed payment action for a void invoice', async () => {
    const invoice = await createInitialInvoice(adminClient);
    await createFailedPayment(adminClient, invoice);

    const voidInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
      },
    });

    const res = await adminClient
      .get('/revenue-actions')
      .query({ type: 'FAILED_PAYMENT', pageSize: 100 })
      .expect(200);
    const payload = res.body as PaginatedRevenueActions;

    expect(payload.data.some((item) => item.entityId === voidInvoice.id)).toBe(
      false,
    );
  });

  it('does not create a failed payment action for an overdue invoice', async () => {
    const invoice = await createInitialInvoice(adminClient);
    await createFailedPayment(adminClient, invoice);

    const overdueInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'OVERDUE' },
    });

    const res = await adminClient
      .get('/revenue-actions')
      .query({ type: 'FAILED_PAYMENT', pageSize: 100 })
      .expect(200);
    const payload = res.body as PaginatedRevenueActions;

    expect(
      payload.data.some((item) => item.entityId === overdueInvoice.id),
    ).toBe(false);
  });

  it('deduplicates failed payment actions by invoice and keeps the latest payment', async () => {
    const invoice = await createInitialInvoice(adminClient);
    const olderPayment = await createFailedPayment(adminClient, invoice);
    const latestPayment = await createFailedPayment(adminClient, invoice);

    await prisma.payment.update({
      where: { id: olderPayment.id },
      data: { createdAt: new Date('1900-01-01T00:00:00.000Z') },
    });
    await prisma.payment.update({
      where: { id: latestPayment.id },
      data: { createdAt: new Date('2100-01-01T00:00:00.000Z') },
    });

    const res = await adminClient
      .get('/revenue-actions')
      .query({ type: 'FAILED_PAYMENT', pageSize: 100 })
      .expect(200);
    const payload = res.body as PaginatedRevenueActions;
    const actions = payload.data.filter((item) => item.entityId === invoice.id);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.metadata?.latestFailedPaymentId).toBe(latestPayment.id);
  });

  it('keeps failed payment actions tenant-scoped', async () => {
    const tenantAInvoice = await createInitialInvoice(adminClient);
    const tenantBInvoice = await createInitialInvoice(tenantBAdminClient);

    await createFailedPayment(adminClient, tenantAInvoice);
    await createFailedPayment(tenantBAdminClient, tenantBInvoice);

    const tenantARes = await adminClient
      .get('/revenue-actions')
      .query({ type: 'FAILED_PAYMENT', pageSize: 100 })
      .expect(200);
    const tenantAPayload = tenantARes.body as PaginatedRevenueActions;

    expect(
      tenantAPayload.data.some((item) => item.entityId === tenantAInvoice.id),
    ).toBe(true);
    expect(
      tenantAPayload.data.some((item) => item.entityId === tenantBInvoice.id),
    ).toBe(false);

    const tenantBRes = await tenantBAdminClient
      .get('/revenue-actions')
      .query({ type: 'FAILED_PAYMENT', pageSize: 100 })
      .expect(200);
    const tenantBPayload = tenantBRes.body as PaginatedRevenueActions;

    expect(
      tenantBPayload.data.some((item) => item.entityId === tenantBInvoice.id),
    ).toBe(true);
    expect(
      tenantBPayload.data.some((item) => item.entityId === tenantAInvoice.id),
    ).toBe(false);
  });
});
