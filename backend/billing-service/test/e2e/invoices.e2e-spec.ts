import { INestApplication } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { IncomingMessage, Server } from 'http';
import type { BillingInterval } from '@prisma/client';

import { InvoicePdfService } from '../../src/invoices/invoice-pdf.service';
import { InvoicesService } from '../../src/invoices/invoices.service';
import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { login, loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

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

function isoDaysFromNow(daysOffset: number): string {
  return new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString();
}

function parsePdfResponse(
  response: IncomingMessage,
  callback: (error: Error | null, body?: Buffer) => void,
) {
  const chunks: Buffer[] = [];

  response.on('data', (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', (error: Error) => callback(error));
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
      description: `Invoice product ${suffix}`,
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
  overrides: Partial<{
    amountDue: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
    issuedAt: string;
    dueAt: string;
  }> = {},
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
      ...overrides,
    })
    .expect(201);

  return res.body as InvoiceResponse;
}

describe('Invoices e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let userClient: E2EClient;
  let tenantBAdminClient: E2EClient;
  let invoicePdfService: InvoicePdfService;
  let invoicesService: InvoicesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    userClient = new E2EClient(server);
    tenantBAdminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await loginAsUser(userClient);
    await login(tenantBAdminClient, 'admin2@test.com');

    const moduleRef = app.get(ModuleRef);
    const contextId = ContextIdFactory.create();
    moduleRef.registerRequestByContextId({ tenantId: 1 }, contextId);
    invoicePdfService = await moduleRef.resolve(InvoicePdfService, contextId, {
      strict: false,
    });
    invoicesService = await moduleRef.resolve(InvoicesService, contextId, {
      strict: false,
    });
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('rbac', () => {
    it('USER can read invoices', async () => {
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

      await userClient.get('/invoices').expect(200);
      await userClient.get(`/invoices/${invoice.id}`).expect(200);
    });

    it('USER cannot create invoice', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);
      const subscription = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      await userClient
        .post('/invoices', {
          customerId: customer.id,
          subscriptionId: subscription.id,
          amountDue: 4900,
          currency: 'EUR',
          periodStart: '2026-01-01T00:00:00.000Z',
          periodEnd: '2026-02-01T00:00:00.000Z',
          issuedAt: '2026-01-01T00:00:00.000Z',
          dueAt: '2026-01-10T00:00:00.000Z',
        })
        .expect(403);
    });

    it('USER cannot run invoice status actions', async () => {
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

      await userClient.patch(`/invoices/${invoice.id}/paid`).expect(403);
      await userClient.patch(`/invoices/${invoice.id}/void`).expect(403);
      await userClient.patch(`/invoices/${invoice.id}/overdue`).expect(403);
    });
  });

  describe('tenant isolation mutations', () => {
    const createTenantBInvoice = async (): Promise<InvoiceResponse> => {
      const customer = await createTestCustomer(tenantBAdminClient);
      const product = await createTestProduct(tenantBAdminClient);
      const plan = await createTestPlan(tenantBAdminClient, product.id);
      const subscription = await createTestSubscription(
        tenantBAdminClient,
        customer.id,
        plan.id,
      );

      return createTestInvoice(
        tenantBAdminClient,
        customer.id,
        subscription.id,
      );
    };

    it('rejects creating an invoice with another tenant customerId', async () => {
      const tenantBCustomer = await createTestCustomer(tenantBAdminClient);
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);
      const subscription = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      await adminClient
        .post('/invoices', {
          customerId: tenantBCustomer.id,
          subscriptionId: subscription.id,
          amountDue: 4900,
          currency: 'EUR',
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-04-01T00:00:00.000Z',
          issuedAt: '2026-03-01T00:00:00.000Z',
          dueAt: '2026-03-10T00:00:00.000Z',
        })
        .expect(400);
    });

    it('rejects creating an invoice with another tenant subscriptionId', async () => {
      const customer = await createTestCustomer(adminClient);
      const tenantBCustomer = await createTestCustomer(tenantBAdminClient);
      const tenantBProduct = await createTestProduct(tenantBAdminClient);
      const tenantBPlan = await createTestPlan(
        tenantBAdminClient,
        tenantBProduct.id,
      );
      const tenantBSubscription = await createTestSubscription(
        tenantBAdminClient,
        tenantBCustomer.id,
        tenantBPlan.id,
      );

      await adminClient
        .post('/invoices', {
          customerId: customer.id,
          subscriptionId: tenantBSubscription.id,
          amountDue: 4900,
          currency: 'EUR',
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-04-01T00:00:00.000Z',
          issuedAt: '2026-03-01T00:00:00.000Z',
          dueAt: '2026-03-10T00:00:00.000Z',
        })
        .expect(400);
    });

    it('rejects marking another tenant invoice as paid', async () => {
      const tenantBInvoice = await createTenantBInvoice();

      await adminClient
        .patch(`/invoices/${tenantBInvoice.id}/paid`)
        .expect(404);
    });

    it('rejects marking another tenant invoice as void', async () => {
      const tenantBInvoice = await createTenantBInvoice();

      await adminClient
        .patch(`/invoices/${tenantBInvoice.id}/void`)
        .expect(404);
    });

    it('rejects marking another tenant invoice as overdue', async () => {
      const tenantBInvoice = await createTenantBInvoice();

      await adminClient
        .patch(`/invoices/${tenantBInvoice.id}/overdue`)
        .expect(404);
    });
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

  it('POST /invoices should reject duplicate subscription period invoices', async () => {
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

    await adminClient
      .post('/invoices', {
        customerId: customer.id,
        subscriptionId: subscription.id,
        amountDue: 4900,
        currency: 'EUR',
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
      })
      .expect(409);
  });

  it('POST /invoices should reject overlapping subscription period invoices', async () => {
    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );

    await createTestInvoice(adminClient, customer.id, subscription.id, {
      periodStart: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      periodEnd: new Date('2026-02-01T00:00:00.000Z').toISOString(),
      issuedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      dueAt: new Date('2026-01-10T00:00:00.000Z').toISOString(),
    });

    await adminClient
      .post('/invoices', {
        customerId: customer.id,
        subscriptionId: subscription.id,
        amountDue: 4999,
        currency: 'EUR',
        periodStart: new Date('2026-01-15T00:00:00.000Z').toISOString(),
        periodEnd: new Date('2026-02-15T00:00:00.000Z').toISOString(),
        issuedAt: new Date('2026-01-15T00:00:00.000Z').toISOString(),
        dueAt: new Date('2026-01-24T00:00:00.000Z').toISOString(),
      })
      .expect(409);
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

  it('GET /invoices should support status, customerId, subscriptionId, page, and pageSize filters', async () => {
    const firstCustomer = await createTestCustomer(adminClient);
    const secondCustomer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const firstSubscription = await createTestSubscription(
      adminClient,
      firstCustomer.id,
      plan.id,
    );
    const secondSubscription = await createTestSubscription(
      adminClient,
      secondCustomer.id,
      plan.id,
    );

    const firstInvoice = await createTestInvoice(
      adminClient,
      firstCustomer.id,
      firstSubscription.id,
    );
    const secondInvoice = await createTestInvoice(
      adminClient,
      secondCustomer.id,
      secondSubscription.id,
    );

    await adminClient.patch(`/invoices/${secondInvoice.id}/paid`).expect(200);

    const filteredByStatus = await adminClient
      .get('/invoices')
      .query({ status: 'PAID' })
      .expect(200);

    const statusPayload = filteredByStatus.body as PaginatedInvoices;
    expect(
      statusPayload.data.every((invoice) => invoice.status === 'PAID'),
    ).toBe(true);
    expect(
      statusPayload.data.some((invoice) => invoice.id === secondInvoice.id),
    ).toBe(true);
    expect(
      statusPayload.data.some((invoice) => invoice.id === firstInvoice.id),
    ).toBe(false);

    const filteredByCustomer = await adminClient
      .get('/invoices')
      .query({ customerId: firstCustomer.id })
      .expect(200);

    const customerPayload = filteredByCustomer.body as PaginatedInvoices;
    expect(
      customerPayload.data.every(
        (invoice) => invoice.customerId === firstCustomer.id,
      ),
    ).toBe(true);
    expect(
      customerPayload.data.some((invoice) => invoice.id === firstInvoice.id),
    ).toBe(true);
    expect(
      customerPayload.data.some((invoice) => invoice.id === secondInvoice.id),
    ).toBe(false);

    const filteredBySubscription = await adminClient
      .get('/invoices')
      .query({ subscriptionId: secondSubscription.id })
      .expect(200);

    const subscriptionPayload =
      filteredBySubscription.body as PaginatedInvoices;
    expect(
      subscriptionPayload.data.every(
        (invoice) => invoice.subscriptionId === secondSubscription.id,
      ),
    ).toBe(true);
    expect(
      subscriptionPayload.data.some(
        (invoice) => invoice.id === secondInvoice.id,
      ),
    ).toBe(true);
    expect(
      subscriptionPayload.data.some(
        (invoice) => invoice.id === firstInvoice.id,
      ),
    ).toBe(false);

    const paginated = await adminClient
      .get('/invoices')
      .query({ page: 1, pageSize: 1 })
      .expect(200);

    const paginatedPayload = paginated.body as PaginatedInvoices;
    expect(paginatedPayload.page).toBe(1);
    expect(paginatedPayload.pageSize).toBe(1);
    expect(paginatedPayload.data).toHaveLength(1);
    expect(paginatedPayload.total).toBeGreaterThanOrEqual(2);
    expect(paginatedPayload.totalPages).toBeGreaterThanOrEqual(2);
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

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: invoice.tenantId,
        action: 'invoice.marked_paid',
        entityType: 'invoice',
        entityId: invoice.id,
      },
    });
    const metadata = auditLog?.metadata as Record<string, unknown> | undefined;

    expect(auditLog).toBeDefined();
    expect(auditLog?.tenantId).toBe(invoice.tenantId);
    expect(auditLog?.actorUserId).toBeDefined();
    expect(metadata).toMatchObject({
      statusBefore: 'ISSUED',
      statusAfter: 'PAID',
      amountDue: invoice.amountDue,
      amountPaid: invoice.amountPaid,
      currency: invoice.currency,
    });
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

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: invoice.tenantId,
        action: 'invoice.voided',
        entityType: 'invoice',
        entityId: invoice.id,
      },
    });

    expect(auditLog).toBeDefined();
    expect(auditLog?.actorUserId).toBeDefined();
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

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: invoice.tenantId,
        action: 'invoice.marked_overdue',
        entityType: 'invoice',
        entityId: invoice.id,
      },
    });
    const metadata = auditLog?.metadata as Record<string, unknown> | undefined;

    expect(auditLog).toBeDefined();
    expect(auditLog?.actorUserId).toBeDefined();
    expect(metadata).toMatchObject({
      statusBefore: 'ISSUED',
      statusAfter: 'OVERDUE',
      dueAt: invoice.dueAt,
    });
  });

  it('PATCH /invoices/:id/overdue should return 400 when invoice dueAt is in the future', async () => {
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
      {
        issuedAt: isoDaysFromNow(-1),
        dueAt: isoDaysFromNow(5),
      },
    );

    await adminClient.patch(`/invoices/${created.id}/overdue`).expect(400);
  });

  it('PATCH /invoices/:id/overdue should return 400 when invoice is already PAID', async () => {
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
    await adminClient.patch(`/invoices/${created.id}/overdue`).expect(400);
  });

  it('PATCH /invoices/:id/overdue should return 400 when invoice is already VOID', async () => {
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
    await adminClient.patch(`/invoices/${created.id}/overdue`).expect(400);
  });

  it('markOverdueInvoices should update only past-due ISSUED invoices for the current tenant', async () => {
    await invoicesService.markOverdueInvoices();

    const customer = await createTestCustomer(adminClient);
    const product = await createTestProduct(adminClient);
    const plan = await createTestPlan(adminClient, product.id);
    const subscription = await createTestSubscription(
      adminClient,
      customer.id,
      plan.id,
    );

    const pastDueIssued = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
    );
    const futureIssued = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
      {
        periodStart: new Date('2026-02-01T00:00:00.000Z').toISOString(),
        periodEnd: new Date('2026-03-01T00:00:00.000Z').toISOString(),
        issuedAt: isoDaysFromNow(-1),
        dueAt: isoDaysFromNow(5),
      },
    );
    const paidInvoice = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
      {
        periodStart: new Date('2026-03-01T00:00:00.000Z').toISOString(),
        periodEnd: new Date('2026-04-01T00:00:00.000Z').toISOString(),
      },
    );
    const voidInvoice = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
      {
        periodStart: new Date('2025-04-01T00:00:00.000Z').toISOString(),
        periodEnd: new Date('2025-05-01T00:00:00.000Z').toISOString(),
      },
    );
    const alreadyOverdue = await createTestInvoice(
      adminClient,
      customer.id,
      subscription.id,
      {
        periodStart: new Date('2025-05-01T00:00:00.000Z').toISOString(),
        periodEnd: new Date('2025-06-01T00:00:00.000Z').toISOString(),
      },
    );

    await adminClient.patch(`/invoices/${paidInvoice.id}/paid`).expect(200);
    await adminClient.patch(`/invoices/${voidInvoice.id}/void`).expect(200);
    await adminClient
      .patch(`/invoices/${alreadyOverdue.id}/overdue`)
      .expect(200);

    const tenantBCustomer = await createTestCustomer(tenantBAdminClient);
    const tenantBProduct = await createTestProduct(tenantBAdminClient);
    const tenantBPlan = await createTestPlan(
      tenantBAdminClient,
      tenantBProduct.id,
    );
    const tenantBSubscription = await createTestSubscription(
      tenantBAdminClient,
      tenantBCustomer.id,
      tenantBPlan.id,
    );
    const tenantBPastDueIssued = await createTestInvoice(
      tenantBAdminClient,
      tenantBCustomer.id,
      tenantBSubscription.id,
    );

    const updatedCount = await invoicesService.markOverdueInvoices();

    expect(updatedCount).toBe(1);

    const refreshedPastDueIssued = (
      await adminClient.get(`/invoices/${pastDueIssued.id}`).expect(200)
    ).body as InvoiceResponse;
    const refreshedFutureIssued = (
      await adminClient.get(`/invoices/${futureIssued.id}`).expect(200)
    ).body as InvoiceResponse;
    const refreshedPaidInvoice = (
      await adminClient.get(`/invoices/${paidInvoice.id}`).expect(200)
    ).body as InvoiceResponse;
    const refreshedVoidInvoice = (
      await adminClient.get(`/invoices/${voidInvoice.id}`).expect(200)
    ).body as InvoiceResponse;
    const refreshedAlreadyOverdue = (
      await adminClient.get(`/invoices/${alreadyOverdue.id}`).expect(200)
    ).body as InvoiceResponse;
    const refreshedTenantBPastDueIssued = (
      await tenantBAdminClient
        .get(`/invoices/${tenantBPastDueIssued.id}`)
        .expect(200)
    ).body as InvoiceResponse;

    expect(refreshedPastDueIssued.status).toBe('OVERDUE');
    expect(refreshedFutureIssued.status).toBe('ISSUED');
    expect(refreshedPaidInvoice.status).toBe('PAID');
    expect(refreshedVoidInvoice.status).toBe('VOID');
    expect(refreshedAlreadyOverdue.status).toBe('OVERDUE');
    expect(refreshedTenantBPastDueIssued.status).toBe('ISSUED');
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

  describe('invoice pdf', () => {
    it('formats invoice PDF amounts from minor units', () => {
      const service = invoicePdfService as unknown as {
        formatMoney(cents: number, currency: string): string;
      };

      expect(service.formatMoney(4900, 'EUR')).toBe('49.00 EUR');
    });

    it('ADMIN can download invoice PDF', async () => {
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

      const response = await adminClient
        .get(`/invoices/${invoice.id}/pdf`)
        .buffer(true)
        .parse(parsePdfResponse)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain(
        `${invoice.invoiceNumber}.pdf`,
      );
      expect((response.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('USER can download invoice PDF', async () => {
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

      const response = await userClient
        .get(`/invoices/${invoice.id}/pdf`)
        .buffer(true)
        .parse(parsePdfResponse)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect((response.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('tenant B cannot download tenant A invoice PDF', async () => {
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

      await tenantBAdminClient.get(`/invoices/${invoice.id}/pdf`).expect(404);
    });

    it('returns 404 for a non-existing invoice PDF', async () => {
      await adminClient.get('/invoices/999999999/pdf').expect(404);
    });
  });
});
