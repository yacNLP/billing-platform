import { INestApplication } from '@nestjs/common';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { Server } from 'http';
import { E2EClient } from '../utils/e2e-client';
import { loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

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

async function createTestProduct(
  client: E2EClient,
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

  const res = await client.post('/products', payload).expect(201);
  return res.body as ProductResponse;
}

describe('Products e2e', () => {
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
    it('user cannot create product', async () => {
      await userClient
        .post('/products', {
          name: 'x',
          sku: `x_${Date.now()}`,
          priceCents: 100,
          stock: 1,
          isActive: true,
        })
        .expect(403);
    });

    it('user cannot update product', async () => {
      const created = await createTestProduct(adminClient);

      await userClient
        .patch(`/products/${created.id}`, { name: 'nope' })
        .expect(403);
    });

    it('user cannot delete product', async () => {
      const created = await createTestProduct(adminClient);

      await userClient.delete(`/products/${created.id}`).expect(403);
    });

    it('user can read products', async () => {
      await createTestProduct(adminClient);

      await userClient.get('/products').expect(200);
    });
  });

  describe('products crud', () => {
    it('get /products should return paginated list', async () => {
      await createTestProduct(adminClient);

      const res = await userClient.get('/products').expect(200);
      const payload = res.body as PaginatedProducts;

      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.total).toBeGreaterThanOrEqual(1);
    });

    it('get /products should filter by text search', async () => {
      const created = await createTestProduct(adminClient);

      const res = await userClient
        .get('/products')
        .query({ q: created.sku })
        .expect(200);

      const payload = res.body as PaginatedProducts;

      expect(payload.data.some((p) => p.sku === created.sku)).toBe(true);
    });

    it('get /products should respect price range filter', async () => {
      await createTestProduct(adminClient, { priceCents: 500 });
      await createTestProduct(adminClient, { priceCents: 2000 });

      const res = await userClient
        .get('/products')
        .query({ minPriceCents: 1000 })
        .expect(200);

      const payload = res.body as PaginatedProducts;

      for (const p of payload.data) {
        expect(p.priceCents).toBeGreaterThanOrEqual(1000);
      }
    });

    it('get /products should support sorting', async () => {
      const res = await userClient
        .get('/products')
        .query({ sortBy: 'priceCents', order: 'asc' as SortOrder })
        .expect(200);

      const payload = res.body as PaginatedProducts;
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('post /products should create product', async () => {
      const created = await createTestProduct(adminClient);

      expect(created.id).toBeDefined();
      expect(created.sku).toContain('SKU_');
      expect(created.priceCents).toBe(1000);
    });

    it('post /products should fail on duplicate sku', async () => {
      const created = await createTestProduct(adminClient);

      await adminClient
        .post('/products', {
          name: 'duplicate',
          sku: created.sku,
          priceCents: 1234,
          stock: 5,
          isActive: true,
        })
        .expect(409);
    });

    it('get /products/:id should return one product', async () => {
      const created = await createTestProduct(adminClient);

      const res = await userClient.get(`/products/${created.id}`).expect(200);

      const payload = res.body as ProductResponse;

      expect(payload.id).toBe(created.id);
      expect(payload.sku).toBe(created.sku);
    });

    it('get /products/:id should return 404 on unknown id', async () => {
      await userClient.get('/products/999999').expect(404);
    });

    it('patch /products/:id should update product', async () => {
      const created = await createTestProduct(adminClient);

      const res = await adminClient
        .patch(`/products/${created.id}`, { name: 'Updated Name' })
        .expect(200);

      const updated = res.body as ProductResponse;

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Updated Name');
    });

    it('delete /products/:id should delete product', async () => {
      const created = await createTestProduct(adminClient);

      await adminClient.delete(`/products/${created.id}`).expect(204);
      await adminClient.get(`/products/${created.id}`).expect(404);
    });

    it('delete /products/:id should return 404 on unknown id', async () => {
      await adminClient.delete('/products/999999').expect(404);
    });
  });
});
