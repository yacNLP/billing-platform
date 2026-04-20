import { INestApplication } from '@nestjs/common';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { Server } from 'http';
import { E2EClient } from '../utils/e2e-client';
import { loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

interface ProductResponse {
  id: number;
  name: string;
  description: string | null;
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

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

async function createTestProduct(
  client: E2EClient,
  overrides: Partial<ProductResponse> = {},
): Promise<ProductResponse> {
  const uid = uniqueSuffix();

  const payload = {
    name: `Test Product ${uid}`,
    description: `Test SaaS product ${uid}`,
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
          description: 'forbidden',
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
        .query({ q: created.name })
        .expect(200);

      const payload = res.body as PaginatedProducts;

      expect(payload.data.some((p) => p.name === created.name)).toBe(true);
    });

    it('get /products should filter by active flag', async () => {
      await createTestProduct(adminClient, { isActive: false });
      await createTestProduct(adminClient, { isActive: true });

      const res = await userClient
        .get('/products')
        .query({ isActive: 'false' })
        .expect(200);

      const payload = res.body as PaginatedProducts;

      for (const p of payload.data) {
        expect(p.isActive).toBe(false);
      }
    });

    it('get /products should support sorting', async () => {
      const res = await userClient
        .get('/products')
        .query({ sortBy: 'name', order: 'asc' })
        .expect(200);

      const payload = res.body as PaginatedProducts;
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('post /products should create product', async () => {
      const created = await createTestProduct(adminClient);

      expect(created.id).toBeDefined();
      expect(created.name).toContain('Test Product');
      expect(created.isActive).toBe(true);
    });

    it('get /products/:id should return one product', async () => {
      const created = await createTestProduct(adminClient);

      const res = await userClient.get(`/products/${created.id}`).expect(200);

      const payload = res.body as ProductResponse;

      expect(payload.id).toBe(created.id);
      expect(payload.name).toBe(created.name);
    });

    it('get /products/:id should return 404 on unknown id', async () => {
      await userClient.get('/products/999999').expect(404);
    });

    it('patch /products/:id should update product', async () => {
      const created = await createTestProduct(adminClient);
      const suffix = uniqueSuffix();

      const res = await adminClient
        .patch(`/products/${created.id}`, { name: `Updated Name ${suffix}` })
        .expect(200);

      const updated = res.body as ProductResponse;

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe(`Updated Name ${suffix}`);
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
