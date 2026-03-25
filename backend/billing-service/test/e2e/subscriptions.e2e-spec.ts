/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { INestApplication } from '@nestjs/common';
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
}

interface PlanResponse {
  id: number;
}

interface SubscriptionResponse {
  id: number;
  customerId: number;
  planId: number;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  endedAt?: string | null;
  amountSnapshot: number;
  currencySnapshot: string;
  intervalSnapshot: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  intervalCountSnapshot: number;
  currentPeriodEnd: string;
}

async function createCustomer(client: E2EClient): Promise<CustomerResponse> {
  const res = await client
    .post('/customers', {
      name: 'Subscription Customer',
      email: `sub_${Date.now()}_${Math.random()}@example.com`,
    })
    .expect(201);

  return res.body as CustomerResponse;
}

async function createPlan(client: E2EClient): Promise<PlanResponse> {
  const productRes = await client
    .post('/products', {
      name: 'Subscription Product',
      sku: `SUB_PROD_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      priceCents: 1000,
      stock: 100,
      isActive: true,
    })
    .expect(201);

  const product = productRes.body as ProductResponse;

  const planRes = await client
    .post('/plans', {
      code: `SUB_PLAN_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      name: 'Subscription Plan',
      amount: 1500,
      currency: 'EUR',
      interval: 'MONTH',
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId: product.id,
    })
    .expect(201);

  return planRes.body as PlanResponse;
}

describe('Subscriptions e2e', () => {
  let app: INestApplication;
  let adminClient: E2EClient;
  let userClient: E2EClient;
  let tenantBAdmin: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;

    const server = testApp.server;
    adminClient = new E2EClient(server);
    userClient = new E2EClient(server);
    tenantBAdmin = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await loginAsUser(userClient);
    await login(tenantBAdmin, 'admin2@test.com');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('USER cannot create subscription', async () => {
    const customer = await createCustomer(adminClient);
    const plan = await createPlan(adminClient);

    await userClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: plan.id,
      })
      .expect(403);
  });

  it('ADMIN can create subscription with snapshots and ACTIVE status', async () => {
    const customer = await createCustomer(adminClient);
    const plan = await createPlan(adminClient);

    const res = await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: plan.id,
        cancelAtPeriodEnd: false,
      })
      .expect(201);

    const sub = res.body as SubscriptionResponse;
    expect(sub.status).toBe('ACTIVE');
    expect(sub.customerId).toBe(customer.id);
    expect(sub.planId).toBe(plan.id);
    expect(sub.amountSnapshot).toBe(1500);
    expect(sub.currencySnapshot).toBe('EUR');
    expect(sub.intervalSnapshot).toBe('MONTH');
    expect(sub.intervalCountSnapshot).toBe(1);
  });

  it('should clamp monthly period end for end-of-month start dates', async () => {
    const customer = await createCustomer(adminClient);
    const plan = await createPlan(adminClient);

    const res = await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: plan.id,
        startDate: '2025-01-31T00:00:00.000Z',
      })
      .expect(201);

    const created = res.body as SubscriptionResponse;

    expect(created.currentPeriodEnd.startsWith('2025-02-28')).toBe(true);
  });

  it('should enforce only one ACTIVE subscription per customer', async () => {
    const customer = await createCustomer(adminClient);
    const firstPlan = await createPlan(adminClient);
    const secondPlan = await createPlan(adminClient);

    await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: firstPlan.id,
      })
      .expect(201);

    await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: secondPlan.id,
      })
      .expect(409);
  });

  it('should reject cross-tenant customer/plan usage', async () => {
    const customer = await createCustomer(adminClient);

    // Plan in tenant B
    const tenantBProductRes = await tenantBAdmin
      .post('/products', {
        name: 'Tenant B Product',
        sku: `TENANT_B_PROD_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        priceCents: 1000,
        stock: 100,
        isActive: true,
      })
      .expect(201);

    const tenantBProduct = tenantBProductRes.body as ProductResponse;

    const tenantBPlanRes = await tenantBAdmin
      .post('/plans', {
        code: `TENANT_B_PLAN_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        name: 'Tenant B Plan',
        amount: 2000,
        currency: 'EUR',
        interval: 'MONTH',
        intervalCount: 1,
        trialDays: 0,
        active: true,
        productId: tenantBProduct.id,
      })
      .expect(201);

    const tenantBPlan = tenantBPlanRes.body as PlanResponse;

    await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: tenantBPlan.id,
      })
      .expect(400);
  });

  it('GET /subscriptions and GET /subscriptions/:id should work', async () => {
    const customer = await createCustomer(adminClient);
    const plan = await createPlan(adminClient);

    const createdRes = await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: plan.id,
      })
      .expect(201);

    const created = createdRes.body as SubscriptionResponse;

    const list = await adminClient.get('/subscriptions').expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    const details = await adminClient
      .get(`/subscriptions/${created.id}`)
      .expect(200);

    expect((details.body as SubscriptionResponse).id).toBe(created.id);
  });

  it('should return 404 when another tenant reads subscription details', async () => {
    const customer = await createCustomer(adminClient);
    const plan = await createPlan(adminClient);

    const createdRes = await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: plan.id,
      })
      .expect(201);

    const created = createdRes.body as SubscriptionResponse;

    await tenantBAdmin.get(`/subscriptions/${created.id}`).expect(404);
  });

  it('should reject immediate cancellation before subscription start date', async () => {
    const customer = await createCustomer(adminClient);
    const plan = await createPlan(adminClient);

    const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const createdRes = await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: plan.id,
        startDate: futureStart.toISOString(),
      })
      .expect(201);

    const created = createdRes.body as SubscriptionResponse;

    await adminClient
      .patch(`/subscriptions/${created.id}/cancel`, {
        cancelAtPeriodEnd: false,
      })
      .expect(400);
  });

  it('PATCH /subscriptions/:id/cancel supports cancelAtPeriodEnd', async () => {
    const customer = await createCustomer(adminClient);
    const plan = await createPlan(adminClient);

    const createdRes = await adminClient
      .post('/subscriptions', {
        customerId: customer.id,
        planId: plan.id,
      })
      .expect(201);

    const created = createdRes.body as SubscriptionResponse;

    const scheduled = await adminClient
      .patch(`/subscriptions/${created.id}/cancel`, {
        cancelAtPeriodEnd: true,
      })
      .expect(200);

    expect((scheduled.body as SubscriptionResponse).status).toBe('ACTIVE');
    expect((scheduled.body as SubscriptionResponse).cancelAtPeriodEnd).toBe(
      true,
    );
    expect((scheduled.body as SubscriptionResponse).canceledAt).toBeTruthy();
    expect((scheduled.body as SubscriptionResponse).endedAt ?? null).toBeNull();

    const immediate = await adminClient
      .patch(`/subscriptions/${created.id}/cancel`, {
        cancelAtPeriodEnd: false,
      })
      .expect(200);

    expect((immediate.body as SubscriptionResponse).status).toBe('CANCELED');
    expect((immediate.body as SubscriptionResponse).cancelAtPeriodEnd).toBe(
      false,
    );
    expect((immediate.body as SubscriptionResponse).canceledAt).toBeTruthy();
    expect((immediate.body as SubscriptionResponse).endedAt).toBeTruthy();
    expect(
      (immediate.body as SubscriptionResponse).currentPeriodEnd,
    ).toBeTruthy();
  });
});
