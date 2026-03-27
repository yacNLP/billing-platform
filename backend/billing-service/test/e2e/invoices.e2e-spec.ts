import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import type { BillingInterval } from '@prisma/client';

import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { login, loginAsAdmin } from '../utils/e2e-auth';

interface CustomerResponse {
  id: number;
  name: string;
  email: string;
}

interface ProductResponse {
  id: number;
  name: string;
  sku: string;
  priceCents: number;
  stock: number;
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
  customerId: number;
  planId: number;
  status: string;
  amountSnapshot: number;
  currencySnapshot: string;
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

interface PaginatedInvoices {
  data: InvoiceResponse[];
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

async function createTestCustomer(
  client: E2EClient,
): Promise<CustomerResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/customers', {
      name: `Invoice Customer ${suffix}`,
      email: `invoice_customer_${suffix}@example.com`,
    })
    .expect(201);

  return res.body as CustomerResponse;
}

async function createTestProduct(client: E2EClient): Promise<ProductResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/products', {
      name: `Invoice Product ${suffix}`,
      sku: `INVOICE_PRODUCT_${suffix}`,
      priceCents: 2500,
      stock: 50,
      isActive: true,
    })
    .expect(201);

  return res.body as ProductResponse;
}

async function createTestPlan(
  client: E2EClient,
  productId: number,
): Promise<PlanResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/plans', {
      code: `INVOICE_PLAN_${suffix}`,
      name: `Invoice Plan ${suffix}`,
      description: 'Invoice test plan',
      amount: 4900,
      currency: 'EUR',
      interval: 'MONTH',
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId,
    })
    .expect(201);

  return res.body as PlanResponse;
}

async function createTestSubscription(
  client: E2EClient,
  customerId: number,
  planId: number,
): Promise<SubscriptionResponse> {
  const res = await client
    .post('/subscriptions', {
      customerId,
      planId,
    })
    .expect(201);

  return res.body as SubscriptionResponse;
}

async function createTestInvoice(
  client: E2EClient,
  customerId: number,
  subscriptionId: number,
): Promise<InvoiceResponse> {
  const periodStart = new Date('2026-01-01T00:00:00.000Z');
  const periodEnd = new Date('2026-02-01T00:00:00.000Z');
  const issuedAt = new Date('2026-01-01T00:00:00.000Z');
  const dueAt = new Date('2026-01-10T00:00:00.000Z');

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
    })
    .expect(201);

  return res.body as InvoiceResponse;
}

describe('Invoices e2e', () => {
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

  it('POST /invoices should create an invoice', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );

    const invoice = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    expect(invoice.id).toBeDefined();
    expect(invoice.customerId).toBe(customer.id);
    expect(invoice.subscriptionId).toBe(subscription.id);
    expect(invoice.status).toBe('ISSUED');
    expect(invoice.amountDue).toBe(4900);
    expect(invoice.amountPaid).toBe(0);
    expect(invoice.invoiceNumber).toContain(`INV-${invoice.tenantId}-`);
  });

  it('GET /invoices should return paginated invoices', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );
    const created = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    const res = await adminClient.get('/invoices').expect(200);
    const payload = res.body as PaginatedInvoices;

    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.page).toBeDefined();
    expect(payload.pageSize).toBeDefined();
    expect(payload.total).toBeDefined();
    expect(payload.totalPages).toBeDefined();
    expect(payload.data.length).toBeGreaterThanOrEqual(1);
    expect(payload.data.some((item) => item.id === created.id)).toBe(true);
  });

  it('GET /invoices/:id should return one invoice', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );
    const created = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    const res = await adminClient.get(`/invoices/${created.id}`).expect(200);
    const invoice = res.body as InvoiceResponse;

    expect(invoice.id).toBe(created.id);
    expect(invoice.invoiceNumber).toBe(created.invoiceNumber);
  });

  it('GET /invoices/:id should return 404 for unknown id', async () => {
    await adminClient.get('/invoices/999999').expect(404);
  });

  it('PATCH /invoices/:id/paid should mark invoice as PAID', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );
    const created = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    const res = await adminClient
      .patch(`/invoices/${created.id}/paid`)
      .expect(200);

    const invoice = res.body as InvoiceResponse;
    expect(invoice.status).toBe('PAID');
    expect(invoice.amountPaid).toBe(invoice.amountDue);
    expect(invoice.paidAt).toBeDefined();
  });

  it('PATCH /invoices/:id/paid should return 400 when invoice is already VOID', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );
    const created = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    await adminClient.patch(`/invoices/${created.id}/void`).expect(200);
    await adminClient.patch(`/invoices/${created.id}/paid`).expect(400);
  });

  it('PATCH /invoices/:id/void should mark invoice as VOID', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );
    const created = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    const res = await adminClient
      .patch(`/invoices/${created.id}/void`)
      .expect(200);

    const invoice = res.body as InvoiceResponse;
    expect(invoice.status).toBe('VOID');
    expect(invoice.amountPaid).toBe(0);
    expect(invoice.paidAt).toBeNull();
    expect(invoice.voidedAt).toBeDefined();
  });

  it('PATCH /invoices/:id/void should return 400 when invoice is already PAID', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );
    const created = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    await adminClient.patch(`/invoices/${created.id}/paid`).expect(200);
    await adminClient.patch(`/invoices/${created.id}/void`).expect(400);
  });

  it('PATCH /invoices/:id/overdue should mark invoice as OVERDUE', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );
    const created = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    const res = await adminClient
      .patch(`/invoices/${created.id}/overdue`)
      .expect(200);

    const invoice = res.body as InvoiceResponse;
    expect(invoice.status).toBe('OVERDUE');
  });

  it('should isolate invoices between tenants', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );
    const invoice = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );

    await adminClient.get(`/invoices/${invoice.id}`).expect(200);
    await tenantBAdminClient.get(`/invoices/${invoice.id}`).expect(404);
  });
});
