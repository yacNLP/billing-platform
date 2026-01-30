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

/**
 * Helper: create a unique product for a test.
 * Ensures no SKU collision between tests.
 */
async function createTestProduct(
  server: Server,
  overrides: Partial<ProductResponse> = {},
): Promise<ProductResponse> {
  const uid = Date.now();

  const payload = {
    name: 'Test Product',
    sku: `SKU_${uid}`,
    priceCents: 1000,
    stock: 10,
    isActive: true,
    ...overrides,
  };

  const res = await request(server).post('/products').send(payload).expect(201);

  return res.body as ProductResponse;
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

  it('GET /products should return paginated list', async () => {
    await createTestProduct(server);

    const res = await request(server).get('/products').expect(200);
    const payload = res.body as PaginatedProducts;

    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /products?q=SKU should filter by text search', async () => {
    const created = await createTestProduct(server);

    const res = await request(server)
      .get('/products')
      .query({ q: created.sku })
      .expect(200);

    const payload = res.body as PaginatedProducts;

    expect(payload.data.some((p) => p.sku === created.sku)).toBe(true);
  });

  it('GET /products with price range filter should respect min/max', async () => {
    await createTestProduct(server, { priceCents: 500 });
    await createTestProduct(server, { priceCents: 2000 });

    const res = await request(server)
      .get('/products')
      .query({ minPriceCents: 1000 })
      .expect(200);

    const payload = res.body as PaginatedProducts;

    for (const p of payload.data) {
      expect(p.priceCents).toBeGreaterThanOrEqual(1000);
    }
  });

  it('GET /products with sort parameters should not crash', async () => {
    const res = await request(server)
      .get('/products')
      .query({ sortBy: 'priceCents', order: 'asc' as SortOrder })
      .expect(200);
    const payload = res.body as PaginatedProducts;
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it('POST /products should create a new product', async () => {
    const created = await createTestProduct(server);

    expect(created.id).toBeDefined();
    expect(created.sku).toContain('SKU_');
    expect(created.priceCents).toBe(1000);
  });

  it('POST /products should fail on duplicate sku', async () => {
    const created = await createTestProduct(server);

    const payload = {
      name: 'Duplicate SKU',
      sku: created.sku,
      priceCents: 1234,
      stock: 5,
      isActive: true,
    };

    const res = await request(server)
      .post('/products')
      .send(payload)
      .expect(409);

    const body = res.body as { message: string };
    expect(body.message).toBeDefined();
  });

  it('GET /products/:id should return one product', async () => {
    const created = await createTestProduct(server);

    const res = await request(server)
      .get(`/products/${created.id}`)
      .expect(200);

    const payload = res.body as ProductResponse;
    expect(payload.id).toBe(created.id);
    expect(payload.sku).toBe(created.sku);
  });

  it('GET /products/:id should return 404 for unknown id', async () => {
    await request(server).get('/products/999999').expect(404);
  });

  it('PATCH /products/:id should update product', async () => {
    const created = await createTestProduct(server);

    const res = await request(server)
      .patch(`/products/${created.id}`)
      .send({ name: 'Updated Name' })
      .expect(200);
    const updated = res.body as ProductResponse;
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Updated Name');
  });

  it('DELETE /products/:id should delete product', async () => {
    const created = await createTestProduct(server);

    await request(server).delete(`/products/${created.id}`).expect(204);

    await request(server).get(`/products/${created.id}`).expect(404);
  });

  it('DELETE /products/:id should return 404 on unknown id', async () => {
    await request(server).delete('/products/999999').expect(404);
  });
});
