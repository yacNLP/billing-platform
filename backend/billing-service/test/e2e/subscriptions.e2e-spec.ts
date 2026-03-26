import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import type { BillingInterval, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../src/prisma.service';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';
import { TenantContext } from '../../src/common/tenant/tenant.context';
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
  tenantId: number;
  customerId: number;
  planId: number;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  amountSnapshot: number;
  currencySnapshot: string;
  intervalSnapshot: BillingInterval;
  intervalCountSnapshot: number;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedSubscriptions {
  data: SubscriptionResponse[];
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
  prefix = 'subscription_customer',
): Promise<CustomerResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/customers', {
      name: `Customer ${suffix}`,
      email: `${prefix}_${suffix}@example.com`,
    })
    .expect(201);

  return res.body as CustomerResponse;
}

async function createTestProduct(
  client: E2EClient,
  prefix = 'subscription_product',
): Promise<ProductResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/products', {
      name: `Product ${suffix}`,
      sku: `${prefix.toUpperCase()}_${suffix}`,
      priceCents: 1990,
      stock: 25,
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
      code: `SUB_PLAN_${suffix}`,
      name: `Subscription Plan ${suffix}`,
      description: 'Subscription test plan',
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

describe('Subscriptions e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let tenantBAdminClient: E2EClient;
  let subscriptionsService: SubscriptionsService;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    tenantBAdminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await login(tenantBAdminClient, 'admin2@test.com');

    const prisma = app.get(PrismaService);
    subscriptionsService = new SubscriptionsService(prisma, {
      getTenantId: (): number => 1,
    } as TenantContext);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create subscription', () => {
    it('creates a subscription successfully with expected snapshots', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        amount: 9900,
        currency: 'EUR',
        interval: 'MONTH',
        intervalCount: 1,
      });

      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      expect(created.id).toBeDefined();
      expect(created.tenantId).toBe(1);
      expect(created.customerId).toBe(customer.id);
      expect(created.planId).toBe(plan.id);
      expect(created.status).toBe('ACTIVE');
      expect(created.cancelAtPeriodEnd).toBe(false);
      expect(created.amountSnapshot).toBe(plan.amount);
      expect(created.currencySnapshot).toBe(plan.currency);
      expect(created.intervalSnapshot).toBe(plan.interval);
      expect(created.intervalCountSnapshot).toBe(plan.intervalCount);
      expect(created.currentPeriodStart).toBe(created.startDate);
      expect(new Date(created.currentPeriodEnd).getTime()).toBeGreaterThan(
        new Date(created.currentPeriodStart).getTime(),
      );
    });

    it('rejects creation when customer does not exist', async () => {
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);

      await adminClient
        .post('/subscriptions', {
          customerId: 999999,
          planId: plan.id,
        })
        .expect(400);
    });

    it('rejects creation when plan does not exist', async () => {
      const customer = await createTestCustomer(adminClient);

      await adminClient
        .post('/subscriptions', {
          customerId: customer.id,
          planId: 999999,
        })
        .expect(400);
    });

    it('rejects creation when plan is inactive', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const inactivePlan = await createTestPlan(adminClient, product.id, {
        active: false,
      });

      await adminClient
        .post('/subscriptions', {
          customerId: customer.id,
          planId: inactivePlan.id,
        })
        .expect(400);
    });

    it('rejects creation when customer already has an ACTIVE subscription', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const firstPlan = await createTestPlan(adminClient, product.id);
      const secondPlan = await createTestPlan(adminClient, product.id);

      await createTestSubscription(adminClient, customer.id, firstPlan.id);

      await adminClient
        .post('/subscriptions', {
          customerId: customer.id,
          planId: secondPlan.id,
        })
        .expect(409);
    });
  });

  describe('read subscriptions', () => {
    it('lists subscriptions for current tenant only', async () => {
      const customerA = await createTestCustomer(adminClient, 'tenant_a_sub');
      const productA = await createTestProduct(adminClient, 'tenant_a_sub');
      const planA = await createTestPlan(adminClient, productA.id);
      const subscriptionA = await createTestSubscription(
        adminClient,
        customerA.id,
        planA.id,
      );

      const customerB = await createTestCustomer(
        tenantBAdminClient,
        'tenant_b_sub',
      );
      const productB = await createTestProduct(
        tenantBAdminClient,
        'tenant_b_sub',
      );
      const planB = await createTestPlan(tenantBAdminClient, productB.id);
      const subscriptionB = await createTestSubscription(
        tenantBAdminClient,
        customerB.id,
        planB.id,
      );

      const tenantAList = await adminClient.get('/subscriptions').expect(200);
      const tenantAPayload = tenantAList.body as PaginatedSubscriptions;

      expect(
        tenantAPayload.data.some((item) => item.id === subscriptionA.id),
      ).toBe(true);
      expect(
        tenantAPayload.data.some((item) => item.id === subscriptionB.id),
      ).toBe(false);

      const tenantBList = await tenantBAdminClient
        .get('/subscriptions')
        .expect(200);
      const tenantBPayload = tenantBList.body as PaginatedSubscriptions;

      expect(
        tenantBPayload.data.some((item) => item.id === subscriptionB.id),
      ).toBe(true);
      expect(
        tenantBPayload.data.some((item) => item.id === subscriptionA.id),
      ).toBe(false);
    });

    it('gets one subscription by id for the same tenant', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      const res = await adminClient
        .get(`/subscriptions/${created.id}`)
        .expect(200);
      const payload = res.body as SubscriptionResponse;

      expect(payload.id).toBe(created.id);
      expect(payload.customerId).toBe(customer.id);
      expect(payload.planId).toBe(plan.id);
    });

    it('returns 404 for missing subscription', async () => {
      await adminClient.get('/subscriptions/999999').expect(404);
    });

    it('returns 404 for another tenant subscription', async () => {
      const customer = await createTestCustomer(
        tenantBAdminClient,
        'cross_tenant',
      );
      const product = await createTestProduct(
        tenantBAdminClient,
        'cross_tenant',
      );
      const plan = await createTestPlan(tenantBAdminClient, product.id);
      const created = await createTestSubscription(
        tenantBAdminClient,
        customer.id,
        plan.id,
      );

      await adminClient.get(`/subscriptions/${created.id}`).expect(404);
    });
  });

  describe('cancel subscription', () => {
    it('cancels subscription at period end', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      const res = await adminClient
        .patch(`/subscriptions/${created.id}/cancel`, {
          cancelAtPeriodEnd: true,
        })
        .expect(200);

      const payload = res.body as SubscriptionResponse;

      expect(payload.id).toBe(created.id);
      expect(payload.status).toBe('ACTIVE');
      expect(payload.cancelAtPeriodEnd).toBe(true);
      expect(payload.canceledAt).not.toBeNull();
      expect(payload.endedAt).toBeNull();
      expect(payload.currentPeriodEnd).toBe(created.currentPeriodEnd);
    });

    it('cancels subscription immediately', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      const res = await adminClient
        .patch(`/subscriptions/${created.id}/cancel`, {
          cancelAtPeriodEnd: false,
        })
        .expect(200);

      const payload = res.body as SubscriptionResponse;

      expect(payload.id).toBe(created.id);
      expect(payload.status).toBe('CANCELED');
      expect(payload.cancelAtPeriodEnd).toBe(false);
      expect(payload.canceledAt).not.toBeNull();
      expect(payload.endedAt).not.toBeNull();
      expect(payload.currentPeriodEnd).toBe(payload.endedAt);
    });
  });

  describe('subscription lifecycle', () => {
    it('expires active subscriptions when currentPeriodEnd is in the past and cancelAtPeriodEnd is true', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        interval: 'DAY',
        intervalCount: 1,
      });
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
        {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: true,
        },
      );

      await subscriptionsService.evaluateSubscriptionsLifecycle();

      const res = await adminClient
        .get(`/subscriptions/${created.id}`)
        .expect(200);
      const payload = res.body as SubscriptionResponse;

      expect(payload.status).toBe('EXPIRED');
    });

    it('keeps subscription ACTIVE when currentPeriodEnd is in the past but cancelAtPeriodEnd is false', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        interval: 'DAY',
        intervalCount: 1,
      });
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
        {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: false,
        },
      );

      await subscriptionsService.evaluateSubscriptionsLifecycle();

      const res = await adminClient
        .get(`/subscriptions/${created.id}`)
        .expect(200);
      const payload = res.body as SubscriptionResponse;

      expect(payload.status).toBe('ACTIVE');
    });
  });
});
