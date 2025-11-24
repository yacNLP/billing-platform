// test/e2e/products.e2e-spec.ts

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { Server } from 'http';

type SortOrder = 'asc' | 'desc';

interface ProductResponse {
  id: number;
  name: string;
  sku: string;
  priceCents: number;
  stock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedProducts {
  data: ProductResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

describe('Products e2e', () => {
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

  it('GET /products should return paginated list with seeded products', async () => {
    const res = await request(server).get('/products').expect(200);

    const payload: PaginatedProducts = res.body;

    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.total).toBeGreaterThanOrEqual(2);

    const std = payload.data.find((p) => p.sku === 'STD-001');
    const prm = payload.data.find((p) => p.sku === 'PRM-001');

    expect(std).toBeTruthy();
    expect(prm).toBeTruthy();
  });

  it('GET /products?q=STD should filter by text search', async () => {
    const res = await request(server)
      .get('/products')
      .query({ q: 'STD' })
      .expect(200);

    const payload: PaginatedProducts = res.body;

    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.some((p) => p.sku === 'STD-001')).toBe(true);
  });

  it('GET /products with price range filter should respect min/max', async () => {
    const res = await request(server)
      .get('/products')
      .query({ minPriceCents: 1000 })
      .expect(200);

    const payload: PaginatedProducts = res.body;

    // All returned products must be >= 1000
    for (const p of payload.data) {
      expect(p.priceCents).toBeGreaterThanOrEqual(1000);
    }
  });

  it('GET /products with sort parameters should not crash', async () => {
    const res = await request(server)
      .get('/products')
      .query({ sortBy: 'priceCents', order: 'asc' as SortOrder })
      .expect(200);

    const payload: PaginatedProducts = res.body;

    expect(Array.isArray(payload.data)).toBe(true);
    // we don't assert strict ordering here, just ensure API supports sort params
  });

  it('POST /products should create a new product', async () => {
    const payload = {
      name: 'Test Product',
      sku: 'TST-001',
      priceCents: 500,
      stock: 10,
      isActive: true,
    };

    const res = await request(server)
      .post('/products')
      .send(payload)
      .expect(201);

    const created: ProductResponse = res.body;

    expect(created.id).toBeDefined();
    expect(created.sku).toBe('TST-001');
    expect(created.name).toBe('Test Product');
    expect(created.priceCents).toBe(500);
  });

  it('POST /products should fail on duplicate sku', async () => {
    const payload = {
      name: 'Duplicate SKU',
      sku: 'STD-001', // already seeded
      priceCents: 1234,
      stock: 5,
      isActive: true,
    };

    const res = await request(server)
      .post('/products')
      .send(payload)
      .expect(409); // ConflictException from service

    expect(res.body.message).toBeDefined();
  });

  it('GET /products/:id should return one product', async () => {
    // First seeded product should be id=1 after truncate + restart identity
    const res = await request(server).get('/products/1').expect(200);

    const product: ProductResponse = res.body;

    expect(product.id).toBe(1);
    expect(product.sku).toBe('STD-001');
  });

  it('GET /products/:id should return 404 for unknown id', async () => {
    await request(server).get('/products/9999').expect(404);
  });

  it('PATCH /products/:id should update product', async () => {
    const payload = { name: 'Standard Updated' };

    const res = await request(server)
      .patch('/products/1')
      .send(payload)
      .expect(200);

    const updated: ProductResponse = res.body;

    expect(updated.id).toBe(1);
    expect(updated.name).toBe('Standard Updated');
  });

  it('DELETE /products/:id should delete product', async () => {
    const payload = {
      name: 'To Delete',
      sku: 'DEL-001',
      priceCents: 100,
      stock: 1,
      isActive: true,
    };

    const createdRes = await request(server)
      .post('/products')
      .send(payload)
      .expect(201);

    const created: ProductResponse = createdRes.body;

    const deleteRes = await request(server)
      .delete(`/products/${created.id}`)
      .expect(204);
  });

  it('DELETE /products/:id should return 404 on unknown id', async () => {
    await request(server).delete('/products/9999').expect(404);
  });
});
