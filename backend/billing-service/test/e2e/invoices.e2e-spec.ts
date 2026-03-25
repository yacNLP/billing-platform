import { INestApplication } from '@nestjs/common';
import { InvoiceStatus, PrismaClient } from '@prisma/client';
import { Server } from 'http';

import { createE2eApp, TestApp } from '../utils/e2e-app';
import { login, loginAsAdmin, loginAsUser } from '../utils/e2e-auth';
import { E2EClient } from '../utils/e2e-client';

interface CustomerResponse {
  id: number;
  tenantId: number;
}

interface InvoiceResponse {
  id: number;
  customerId: number;
  subscriptionId: number | null;
  status: InvoiceStatus;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  issuedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
}

const prisma = new PrismaClient();

function invoicePayload(customerId: number, subscriptionId?: number) {
  return {
    customerId,
    subscriptionId,
    currency: 'usd',
    subtotalCents: 1000,
    taxCents: 250,
    dueDate: new Date('2030-01-31T00:00:00.000Z').toISOString(),
    periodStart: new Date('2030-01-01T00:00:00.000Z').toISOString(),
    periodEnd: new Date('2030-01-31T00:00:00.000Z').toISOString(),
    notes: 'Invoice V1 test',
  };
}

async function createTenantCustomer(
  client: E2EClient,
  suffix: string,
): Promise<CustomerResponse> {
  const res = await client
    .post('/customers', {
      name: `Customer ${suffix}`,
      email: `invoice_${suffix}_${Date.now()}@example.com`,
    })
    .expect(201);

  return res.body as CustomerResponse;
}

describe('Invoices e2e', () => {
  let app: INestApplication;
  let server: Server;

  let adminClient: E2EClient;
  let userClient: E2EClient;
  let tenantBAdminClient: E2EClient;

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  });

  it('USER cannot create invoice', async () => {
    const customer = await createTenantCustomer(adminClient, 'rbac');
    await userClient.post('/invoices', invoicePayload(customer.id)).expect(403);
  });

  it('ADMIN can create DRAFT invoice and totalCents is computed', async () => {
    const customer = await createTenantCustomer(adminClient, 'create');

    const res = await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const invoice = res.body as InvoiceResponse;

    expect(invoice.status).toBe(InvoiceStatus.DRAFT);
    expect(invoice.totalCents).toBe(1250);
    expect(invoice.taxCents).toBe(250);
    expect(invoice.subtotalCents).toBe(1000);
    expect(invoice.issuedAt).toBeNull();
  });

  it('cross-tenant customer usage is rejected', async () => {
    const tenantBCustomer = await createTenantCustomer(
      tenantBAdminClient,
      'x-tenant',
    );

    await adminClient
      .post('/invoices', invoicePayload(tenantBCustomer.id))
      .expect(400);
  });

  it('cross-tenant subscription usage is rejected', async () => {
    const tenantACustomer = await createTenantCustomer(
      adminClient,
      'tenant-a-sub',
    );
    const tenantBCustomer = await createTenantCustomer(
      tenantBAdminClient,
      'tenant-b-sub',
    );

    const tenantBSubscription = await prisma.subscription.create({
      data: {
        tenantId: tenantBCustomer.tenantId,
        customerId: tenantBCustomer.id,
      },
    });

    await adminClient
      .post(
        '/invoices',
        invoicePayload(tenantACustomer.id, tenantBSubscription.id),
      )
      .expect(400);
  });

  it('GET /invoices works', async () => {
    const customer = await createTenantCustomer(adminClient, 'list');
    await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const res = await userClient.get('/invoices').expect(200);
    expect(Array.isArray((res.body as { data: InvoiceResponse[] }).data)).toBe(
      true,
    );
  });

  it('GET /invoices/:id respects tenant isolation', async () => {
    const customer = await createTenantCustomer(adminClient, 'detail');
    const created = await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const invoice = created.body as InvoiceResponse;

    await adminClient.get(`/invoices/${invoice.id}`).expect(200);
    await tenantBAdminClient.get(`/invoices/${invoice.id}`).expect(404);
  });

  it('finalize transitions DRAFT -> OPEN and sets issuedAt', async () => {
    const customer = await createTenantCustomer(adminClient, 'finalize');
    const created = await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const invoice = created.body as InvoiceResponse;

    const finalized = await adminClient
      .patch(`/invoices/${invoice.id}/finalize`)
      .expect(200);

    expect((finalized.body as InvoiceResponse).status).toBe(InvoiceStatus.OPEN);
    expect((finalized.body as InvoiceResponse).issuedAt).toBeTruthy();
  });

  it('mark-paid transitions OPEN -> PAID and sets paidAt', async () => {
    const customer = await createTenantCustomer(adminClient, 'paid');
    const created = await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const invoice = created.body as InvoiceResponse;
    await adminClient.patch(`/invoices/${invoice.id}/finalize`).expect(200);

    const paid = await adminClient
      .patch(`/invoices/${invoice.id}/mark-paid`)
      .expect(200);

    expect((paid.body as InvoiceResponse).status).toBe(InvoiceStatus.PAID);
    expect((paid.body as InvoiceResponse).paidAt).toBeTruthy();
  });

  it('void transitions DRAFT -> VOID', async () => {
    const customer = await createTenantCustomer(adminClient, 'void-draft');
    const created = await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const invoice = created.body as InvoiceResponse;

    const voided = await adminClient
      .patch(`/invoices/${invoice.id}/void`)
      .expect(200);

    expect((voided.body as InvoiceResponse).status).toBe(InvoiceStatus.VOID);
    expect((voided.body as InvoiceResponse).voidedAt).toBeTruthy();
  });

  it('void transitions OPEN -> VOID', async () => {
    const customer = await createTenantCustomer(adminClient, 'void-open');
    const created = await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const invoice = created.body as InvoiceResponse;

    await adminClient.patch(`/invoices/${invoice.id}/finalize`).expect(200);

    const voided = await adminClient
      .patch(`/invoices/${invoice.id}/void`)
      .expect(200);

    expect((voided.body as InvoiceResponse).status).toBe(InvoiceStatus.VOID);
  });

  it('cannot void PAID invoice', async () => {
    const customer = await createTenantCustomer(adminClient, 'cant-void-paid');
    const created = await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const invoice = created.body as InvoiceResponse;

    await adminClient.patch(`/invoices/${invoice.id}/finalize`).expect(200);
    await adminClient.patch(`/invoices/${invoice.id}/mark-paid`).expect(200);

    await adminClient.patch(`/invoices/${invoice.id}/void`).expect(400);
  });

  it('cannot mark-paid a DRAFT invoice', async () => {
    const customer = await createTenantCustomer(adminClient, 'cant-pay-draft');
    const created = await adminClient
      .post('/invoices', invoicePayload(customer.id))
      .expect(201);

    const invoice = created.body as InvoiceResponse;

    await adminClient.patch(`/invoices/${invoice.id}/mark-paid`).expect(400);
  });

  it('invalid period range rejected', async () => {
    const customer = await createTenantCustomer(adminClient, 'period-invalid');

    await adminClient
      .post('/invoices', {
        ...invoicePayload(customer.id),
        periodStart: new Date('2030-02-01T00:00:00.000Z').toISOString(),
        periodEnd: new Date('2030-01-01T00:00:00.000Z').toISOString(),
      })
      .expect(400);
  });
});
