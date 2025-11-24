// test/e2e/plans.e2e-spec.ts

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { Server } from 'http';

type BillingInterval = 'MONTH' | 'YEAR' | 'WEEK' | 'DAY';
type CurrencyCode = 'EUR' | 'USD' | 'DZD';

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
 * Helper to create a valid plan for tests.
 * Assumes product with id=1 exists in DB test seed.
 */
async function createTestPlan(
  server: Server,
  overrides: Partial<Record<keyof PlanResponse, any>> = {},
): Promise<PlanResponse> {
  const payload = {
    code: 'BASIC_MONTH',
    name: 'Basic Monthly',
    description: 'Basic monthly plan',
    amount: 990,
    currency: 'EUR' as CurrencyCode,
    interval: 'MONTH' as BillingInterval,
    intervalCount: 1,
    trialDays: 0,
    active: true,
    productId: 1,
    ...overrides,
  };

  const res = await request(server).post('/plans').send(payload).expect(201);
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
    const plan = await createTestPlan(server);

    expect(plan.id).toBeDefined();
    expect(plan.code).toBe('BASIC_MONTH');
    expect(plan.productId).toBe(1);
    expect(plan.active).toBe(true);
  });

  it('POST /plans should fail when productId is invalid', async () => {
    const payload = {
      code: 'INVALID_PRODUCT',
      name: 'Invalid Plan',
      description: 'Should fail',
      amount: 1000,
      currency: 'EUR' as CurrencyCode,
      interval: 'MONTH' as BillingInterval,
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId: 9999,
    };

    const res = await request(server).post('/plans').send(payload).expect(400);

    expect(res.body.message).toContain('Invalid productId');
  });

  it('POST /plans should fail when code is not unique', async () => {
    await createTestPlan(server, { code: 'UNIQ_CODE' });

    const payload = {
      code: 'UNIQ_CODE',
      name: 'Duplicate Code',
      description: 'Duplicate code should fail',
      amount: 1000,
      currency: 'EUR' as CurrencyCode,
      interval: 'MONTH' as BillingInterval,
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId: 1,
    };

    const res = await request(server).post('/plans').send(payload).expect(409);

    expect(res.body.message).toContain('Code already exists');
  });

  it('GET /plans should return paginated list including created plan', async () => {
    const created = await createTestPlan(server, { code: 'LIST_TEST' });

    const res = await request(server).get('/plans').expect(200);

    const payload: PaginatedPlans = res.body;

    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.total).toBeGreaterThanOrEqual(1);

    const found = payload.data.find((p) => p.code === 'LIST_TEST');
    expect(found).toBeTruthy();
    expect(found?.id).toBe(created.id);
  });

  it('GET /plans should support search filter', async () => {
    await createTestPlan(server, {
      code: 'SEARCH_ME',
      name: 'Searchable Plan',
    });

    const res = await request(server)
      .get('/plans')
      .query({ search: 'SEARCH_ME' })
      .expect(200);

    const payload: PaginatedPlans = res.body;

    expect(payload.data.length).toBeGreaterThanOrEqual(1);
    expect(payload.data.some((p) => p.code === 'SEARCH_ME')).toBe(true);
  });

  it('GET /plans/:id should return a single plan', async () => {
    const created = await createTestPlan(server, { code: 'GET_ONE' });

    const res = await request(server).get(`/plans/${created.id}`).expect(200);

    const plan: PlanResponse = res.body;
    expect(plan.id).toBe(created.id);
    expect(plan.code).toBe('GET_ONE');
  });

  it('GET /plans/:id should return 404 for unknown id', async () => {
    const res = await request(server).get('/plans/9999').expect(404);

    expect(res.body.message).toContain('Plan with id=9999 not found');
  });

  it('PATCH /plans/:id should update basic fields', async () => {
    const created = await createTestPlan(server, { code: 'UPDATE_ME' });

    const res = await request(server)
      .patch(`/plans/${created.id}`)
      .send({
        name: 'Updated Name',
        amount: 2000,
      })
      .expect(200);

    const updated: PlanResponse = res.body;

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Updated Name');
    expect(updated.amount).toBe(2000);
  });

  it('PATCH /plans/:id should fail when trying to change productId', async () => {
    const created = await createTestPlan(server, { code: 'UPDATE_PRODUCT' });

    const res = await request(server)
      .patch(`/plans/${created.id}`)
      .send({ productId: 9999 })
      .expect(400);

    expect(res.body.message).toContain('productId cannot be changed');
  });

  it('PATCH /plans/:id should return 404 when plan does not exist', async () => {
    const res = await request(server)
      .patch('/plans/9999')
      .send({ name: 'Ghost' })
      .expect(404);

    expect(res.body.message).toContain('Plan with id=9999 not found');
  });

  it('DELETE /plans/:id should soft-delete plan', async () => {
    const created = await createTestPlan(server, { code: 'DELETE_ME' });

    const deleteRes = await request(server)
      .delete(`/plans/${created.id}`)
      .expect(204);

    // 204 → pas de contenu, Nest renvoie généralement {}
    expect(deleteRes.body).toEqual({});

    // Should not be retrievable anymore
    await request(server).get(`/plans/${created.id}`).expect(404);

    // List should not contain deleted plan (because deletedAt != null)
    const listRes = await request(server).get('/plans').expect(200);
    const payload: PaginatedPlans = listRes.body;

    expect(payload.data.some((p) => p.id === created.id)).toBe(false);
  });

  it('DELETE /plans/:id should return 404 when plan does not exist', async () => {
    const res = await request(server).delete('/plans/9999').expect(404);

    expect(res.body.message).toContain('Plan with id=9999 not found');
  });
});
