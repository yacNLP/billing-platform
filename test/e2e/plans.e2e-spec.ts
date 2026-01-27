import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { Server } from 'http';

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
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface PaginatedPlans {
  data: PlanResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Helper: create a product for plan tests.
 * No dependency on seed or fixed IDs.
 */
async function createTestProduct(server: Server): Promise<ProductResponse> {
  const uid = Date.now();

  const payload = {
    name: 'Plan Product',
    sku: `PLAN_PROD_${uid}`,
    priceCents: 1000,
    stock: 100,
    isActive: true,
  };

  const res = await request(server)
    .post('/products')
    .send(payload)
    .expect(201);

  return res.body as ProductResponse;
}

/**
 * Helper: create a valid plan for tests.
 * Fully isolated and unique.
 */
async function createTestPlan(
  server: Server,
  productId: number,
  overrides: Partial<Record<keyof PlanResponse, any>> = {},
): Promise<PlanResponse> {
  const uid = Date.now();

  const payload = {
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
    ...overrides,
  };

  const res = await request(server)
    .post('/plans')
    .send(payload)
    .expect(201);

  return res.body as PlanResponse;
}

describe('Plans e2e', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /plans should create a plan when productId is valid', async () => {
    const product = await createTestProduct(server);
    const plan = await createTestPlan(server, product.id);

    expect(plan.id).toBeDefined();
    expect(plan.productId).toBe(product.id);
    expect(plan.active).toBe(true);
  });

  it('POST /plans should fail when productId is invalid', async () => {
    const payload = {
      code: `INVALID_${Date.now()}`,
      name: 'Invalid Plan',
      description: 'Should fail',
      amount: 1000,
      currency: 'EUR' as CurrencyCode,
      interval: 'MONTH' as BillingInterval,
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId: 999999,
    };

    const res = await request(server)
      .post('/plans')
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('POST /plans should fail when code is not unique', async () => {
    const product = await createTestProduct(server);
    const created = await createTestPlan(server, product.id);

    const payload = {
      ...created,
      name: 'Duplicate Code',
    };

    const res = await request(server)
      .post('/plans')
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('GET /plans should return paginated list including created plan', async () => {
    const product = await createTestProduct(server);
    const created = await createTestPlan(server, product.id);

    const res = await request(server).get('/plans').expect(200);
    const payload: PaginatedPlans = res.body;

    expect(payload.data.some((p) => p.id === created.id)).toBe(true);
  });

  it('GET /plans should support search filter', async () => {
    const product = await createTestProduct(server);
    const created = await createTestPlan(server, product.id, {
      name: 'Searchable Plan',
    });

    const res = await request(server)
      .get('/plans')
      .query({ search: 'Searchable' })
      .expect(200);

    const payload: PaginatedPlans = res.body;

    expect(payload.data.some((p) => p.id === created.id)).toBe(true);
  });

  it('GET /plans/:id should return a single plan', async () => {
    const product = await createTestProduct(server);
    const created = await createTestPlan(server, product.id);

    const res = await request(server)
      .get(`/plans/${created.id}`)
      .expect(200);

    expect(res.body.id).toBe(created.id);
    expect(res.body.code).toBe(created.code);
  });

  it('GET /plans/:id should return 404 for unknown id', async () => {
    await request(server).get('/plans/999999').expect(404);
  });

  it('PATCH /plans/:id should update basic fields', async () => {
    const product = await createTestProduct(server);
    const created = await createTestPlan(server, product.id);

    const res = await request(server)
      .patch(`/plans/${created.id}`)
      .send({ name: 'Updated Name', amount: 2000 })
      .expect(200);

    expect(res.body.id).toBe(created.id);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.amount).toBe(2000);
  });

  it('PATCH /plans/:id should fail when trying to change productId', async () => {
    const product = await createTestProduct(server);
    const created = await createTestPlan(server, product.id);

    const res = await request(server)
      .patch(`/plans/${created.id}`)
      .send({ productId: 999999 })
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('PATCH /plans/:id should return 404 when plan does not exist', async () => {
    await request(server)
      .patch('/plans/999999')
      .send({ name: 'Ghost' })
      .expect(404);
  });

  it('DELETE /plans/:id should soft-delete plan', async () => {
    const product = await createTestProduct(server);
    const created = await createTestPlan(server, product.id);

    await request(server)
      .delete(`/plans/${created.id}`)
      .expect(204);

    await request(server)
      .get(`/plans/${created.id}`)
      .expect(404);

    const listRes = await request(server).get('/plans').expect(200);
    const payload: PaginatedPlans = listRes.body;

    expect(payload.data.some((p) => p.id === created.id)).toBe(false);
  });

  it('DELETE /plans/:id should return 404 when plan does not exist', async () => {
    await request(server).delete('/plans/999999').expect(404);
  });
});
