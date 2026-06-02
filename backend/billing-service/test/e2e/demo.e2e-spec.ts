import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';

import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { loginAsUser } from '../utils/e2e-auth';

type LoadSampleDataResponse = {
  customers: number;
  products: number;
  plans: number;
  subscriptions: number;
  invoices: number;
  payments: number;
};

type SignupResponse = {
  accessToken: string;
};

type RevenueActionsResponse = {
  data: Array<{ type: string }>;
};

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

async function signupTenantAdmin(server: Server): Promise<{
  client: E2EClient;
  tenantId: number;
}> {
  const suffix = uniqueSuffix();
  const email = `demo_admin_${suffix}@example.com`;

  const signupRes = await request(server)
    .post('/auth/signup')
    .send({
      companyName: `Demo Tenant ${suffix}`,
      email,
      password: 'password123',
      defaultCurrency: 'EUR',
    })
    .expect(201);

  const token = (signupRes.body as SignupResponse).accessToken;
  expect(token).toBeDefined();

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const client = new E2EClient(server);
  await client.login({ email, password: 'password123' });

  return { client, tenantId: user.tenantId };
}

let prisma: PrismaService;

describe('Demo e2e', () => {
  let app: INestApplication;
  let server: Server;
  let userClient: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;
    prisma = app.get(PrismaService);

    userClient = new E2EClient(server);
    await loginAsUser(userClient);
  });

  afterAll(async () => {
    await app.close();
  });

  it('ADMIN can load sample data', async () => {
    const { client } = await signupTenantAdmin(server);

    const res = await client.post('/demo/load-sample-data', {}).expect(201);
    const summary = res.body as LoadSampleDataResponse;

    expect(summary).toEqual({
      customers: 3,
      products: 2,
      plans: 3,
      subscriptions: 3,
      invoices: 3,
      payments: 2,
    });
  });

  it('USER cannot load sample data', async () => {
    await userClient.post('/demo/load-sample-data', {}).expect(403);
  });

  it('data belongs to current tenant', async () => {
    const { client, tenantId } = await signupTenantAdmin(server);

    await client.post('/demo/load-sample-data', {}).expect(201);

    await expectTenantCounts(tenantId, {
      customers: 3,
      products: 2,
      plans: 3,
      subscriptions: 3,
      invoices: 3,
      payments: 2,
    });
  });

  it('returns summary counts', async () => {
    const { client } = await signupTenantAdmin(server);

    const res = await client.post('/demo/load-sample-data', {}).expect(201);
    const summary = res.body as LoadSampleDataResponse;

    expect(summary.customers).toBe(3);
    expect(summary.products).toBe(2);
    expect(summary.plans).toBe(3);
    expect(summary.subscriptions).toBe(3);
    expect(summary.invoices).toBe(3);
    expect(summary.payments).toBe(2);
  });

  it('creates data that triggers revenue actions', async () => {
    const { client } = await signupTenantAdmin(server);

    await client.post('/demo/load-sample-data', {}).expect(201);

    const actionsRes = await client
      .get('/revenue-actions?page=1&pageSize=20')
      .expect(200);
    const actions = actionsRes.body as RevenueActionsResponse;
    const actionTypes = actions.data.map((action) => action.type);

    expect(actionTypes).toContain('OVERDUE_INVOICE');
    expect(actionTypes).toContain('PAST_DUE_SUBSCRIPTION');
    expect(actionTypes).toContain('FAILED_PAYMENT');
  });

  it('returns 409 if workspace already has business data', async () => {
    const { client } = await signupTenantAdmin(server);

    await client.post('/demo/load-sample-data', {}).expect(201);
    await client.post('/demo/load-sample-data', {}).expect(409);
  });

  it('keeps sample data isolated between tenants', async () => {
    const tenantA = await signupTenantAdmin(server);
    const tenantB = await signupTenantAdmin(server);

    await tenantA.client.post('/demo/load-sample-data', {}).expect(201);

    await expectTenantCounts(tenantA.tenantId, {
      customers: 3,
      products: 2,
      plans: 3,
      subscriptions: 3,
      invoices: 3,
      payments: 2,
    });
    await expectTenantCounts(tenantB.tenantId, {
      customers: 0,
      products: 0,
      plans: 0,
      subscriptions: 0,
      invoices: 0,
      payments: 0,
    });
  });

  it('creates an audit log', async () => {
    const { client, tenantId } = await signupTenantAdmin(server);

    await client.post('/demo/load-sample-data', {}).expect(201);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: 'demo.sample_data_loaded',
        entityType: 'demo',
      },
    });

    expect(auditLog).not.toBeNull();
    expect(auditLog?.metadata).toEqual({
      customers: 3,
      products: 2,
      plans: 3,
      subscriptions: 3,
      invoices: 3,
      payments: 2,
    });
  });
});

async function expectTenantCounts(
  tenantId: number,
  expected: LoadSampleDataResponse,
): Promise<void> {
  const [customers, products, plans, subscriptions, invoices, payments] =
    await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.plan.count({ where: { tenantId } }),
      prisma.subscription.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.payment.count({ where: { tenantId } }),
    ]);

  expect({
    customers,
    products,
    plans,
    subscriptions,
    invoices,
    payments,
  }).toEqual(expected);
}
