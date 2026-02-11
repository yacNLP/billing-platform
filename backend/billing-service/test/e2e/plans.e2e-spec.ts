/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { INestApplication } from '@nestjs/common';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { Server } from 'http';
import { E2EClient } from '../utils/e2e-client';
import { loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

type BillingInterval = 'MONTH' | 'YEAR' | 'WEEK' | 'DAY';
type CurrencyCode = 'EUR' | 'USD' | 'DZD';

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
  description: string | null;
  amount: number;
  currency: CurrencyCode;
  interval: BillingInterval;
  intervalCount: number | null;
  trialDays: number | null;
  active: boolean;
  productId: number;
}

interface PaginatedPlans {
  data: PlanResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// helper to create product
async function createTestProduct(client: E2EClient): Promise<ProductResponse> {
  const uid = Date.now();

  const res = await client
    .post('/products', {
      name: 'Plan Product',
      sku: `PLAN_PROD_${uid}`,
      priceCents: 1000,
      stock: 100,
      isActive: true,
    })
    .expect(201);

  return res.body as ProductResponse;
}

// helper to create plan
async function createTestPlan(
  client: E2EClient,
  productId: number,
): Promise<PlanResponse> {
  const uid = Date.now();

  const res = await client
    .post('/plans', {
      code: `PLAN_${uid}`,
      name: 'Basic Monthly',
      description: 'Basic monthly plan',
      amount: 990,
      currency: 'EUR' as CurrencyCode,
      interval: 'MONTH' as BillingInterval,
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId,
    })
    .expect(201);

  return res.body as PlanResponse;
}

describe('Plans e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let userClient: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    userClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await loginAsUser(userClient);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('rbac', () => {
    it('USER cannot create plan', async () => {
      const product = await createTestProduct(adminClient);

      await userClient
        .post('/plans', {
          code: `FORBIDDEN_${Date.now()}`,
          name: 'Forbidden',
          description: null,
          amount: 1000,
          currency: 'EUR',
          interval: 'MONTH',
          intervalCount: 1,
          trialDays: 0,
          active: true,
          productId: product.id,
        })
        .expect(403);
    });

    it('USER cannot update plan', async () => {
      const product = await createTestProduct(adminClient);
      const created = await createTestPlan(adminClient, product.id);

      await userClient
        .patch(`/plans/${created.id}`, { name: 'Nope' })
        .expect(403);
    });

    it('USER cannot delete plan', async () => {
      const product = await createTestProduct(adminClient);
      const created = await createTestPlan(adminClient, product.id);

      await userClient.delete(`/plans/${created.id}`).expect(403);
    });

    it('USER can read plans', async () => {
      const res = await userClient.get('/plans').expect(200);
      const payload = res.body as PaginatedPlans;
      expect(Array.isArray(payload.data)).toBe(true);
    });
  });

  describe('plans crud', () => {
    it('POST /plans should create plan', async () => {
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);

      expect(plan.id).toBeDefined();
      expect(plan.productId).toBe(product.id);
      expect(plan.active).toBe(true);
    });

    it('POST /plans should fail when productId invalid', async () => {
      await adminClient
        .post('/plans', {
          code: `INVALID_${Date.now()}`,
          name: 'Invalid',
          description: null,
          amount: 1000,
          currency: 'EUR',
          interval: 'MONTH',
          intervalCount: 1,
          trialDays: 0,
          active: true,
          productId: 999999,
        })
        .expect(400);
    });

    it('GET /plans should return paginated list', async () => {
      const res = await adminClient.get('/plans').expect(200);
      const payload = res.body as PaginatedPlans;
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('GET /plans/:id should return plan', async () => {
      const product = await createTestProduct(adminClient);
      const created = await createTestPlan(adminClient, product.id);

      const res = await adminClient.get(`/plans/${created.id}`).expect(200);

      const payload = res.body as PlanResponse;
      expect(payload.id).toBe(created.id);
    });

    it('PATCH /plans/:id should update plan', async () => {
      const product = await createTestProduct(adminClient);
      const created = await createTestPlan(adminClient, product.id);

      const res = await adminClient
        .patch(`/plans/${created.id}`, { name: 'Updated Name' })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
    });

    it('DELETE /plans/:id should soft delete', async () => {
      const product = await createTestProduct(adminClient);
      const created = await createTestPlan(adminClient, product.id);

      await adminClient.delete(`/plans/${created.id}`).expect(204);
      await adminClient.get(`/plans/${created.id}`).expect(404);
    });
  });
});
