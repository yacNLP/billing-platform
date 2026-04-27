import { INestApplication } from '@nestjs/common';
import { Server } from 'http';

import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

interface CustomerResponse {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedCustomers {
  data: CustomerResponse[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

// create a unique customer for tests
async function createTestCustomer(
  client: E2EClient,
  overrides: Partial<CustomerResponse> = {},
): Promise<CustomerResponse> {
  const uid = uniqueSuffix();

  const payload = {
    name: 'Test Customer',
    email: `customer_${uid}@example.com`,
    ...overrides,
  };

  const res = await client.post('/customers', payload).expect(201);
  return res.body as CustomerResponse;
}

describe('Customers e2e', () => {
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
    it('USER cannot create customer', async () => {
      const suffix = uniqueSuffix();
      await userClient
        .post('/customers', {
          name: 'x',
          email: `x_${suffix}@ex.com`,
        })
        .expect(403);
    });

    it('USER cannot update customer', async () => {
      const created = await createTestCustomer(adminClient);

      await userClient
        .patch(`/customers/${created.id}`, { name: 'nope' })
        .expect(403);
    });

    it('USER cannot delete customer', async () => {
      const created = await createTestCustomer(adminClient);

      await userClient.delete(`/customers/${created.id}`).expect(403);
    });

    it('USER can read customers', async () => {
      await createTestCustomer(adminClient);

      const res = await userClient.get('/customers').expect(200);
      const payload = res.body as PaginatedCustomers;

      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.total).toBeDefined();
      expect(payload.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('customers crud', () => {
    it('GET /customers should return paginated list', async () => {
      await createTestCustomer(adminClient);

      const res = await userClient.get('/customers').expect(200);
      const payload = res.body as PaginatedCustomers;

      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.total).toBeDefined();
      expect(payload.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /customers should support search, sorting, and pagination', async () => {
      const suffix = uniqueSuffix();

      const alpha = await createTestCustomer(adminClient, {
        name: `Alpha Customer ${suffix}`,
        email: `alpha_${suffix}@example.com`,
      });
      const beta = await createTestCustomer(adminClient, {
        name: `Beta Customer ${suffix}`,
        email: `beta_${suffix}@example.com`,
      });

      const searchRes = await userClient
        .get('/customers')
        .query({ search: `alpha_${suffix}` })
        .expect(200);
      const searchPayload = searchRes.body as PaginatedCustomers;

      expect(searchPayload.data.some((item) => item.id === alpha.id)).toBe(
        true,
      );
      expect(searchPayload.data.some((item) => item.id === beta.id)).toBe(
        false,
      );

      const sortedRes = await userClient
        .get('/customers')
        .query({ search: suffix, sortBy: 'name', order: 'desc' })
        .expect(200);
      const sortedPayload = sortedRes.body as PaginatedCustomers;
      const sortedIds = sortedPayload.data.map((item) => item.id);

      expect(sortedIds.indexOf(beta.id)).toBeLessThan(
        sortedIds.indexOf(alpha.id),
      );

      const paginatedRes = await userClient
        .get('/customers')
        .query({ search: suffix, page: 1, pageSize: 1 })
        .expect(200);
      const paginatedPayload = paginatedRes.body as PaginatedCustomers;

      expect(paginatedPayload.page).toBe(1);
      expect(paginatedPayload.pageSize).toBe(1);
      expect(paginatedPayload.data).toHaveLength(1);
      expect(paginatedPayload.total).toBe(2);
      expect(paginatedPayload.totalPages).toBe(2);
    });

    it('GET /customers/:id should return a single customer', async () => {
      const created = await createTestCustomer(adminClient);

      const res = await userClient.get(`/customers/${created.id}`).expect(200);
      const customer = res.body as CustomerResponse;

      expect(customer.id).toBe(created.id);
      expect(customer.email).toBe(created.email);
    });

    it('GET /customers/:id should return 404 for unknown id', async () => {
      await userClient.get('/customers/999999').expect(404);
    });

    it('POST /customers should create a new customer', async () => {
      const created = await createTestCustomer(adminClient);

      expect(created.id).toBeDefined();
      expect(created.email).toContain('@example.com');
    });

    it('POST /customers should fail on duplicate email', async () => {
      const created = await createTestCustomer(adminClient);

      const res = await adminClient
        .post('/customers', { name: 'Duplicate', email: created.email })
        .expect(409);

      const error = res.body as { message?: string };
      expect(error.message).toBeDefined();
    });

    it('PATCH /customers/:id should update customer', async () => {
      const created = await createTestCustomer(adminClient);

      const res = await adminClient
        .patch(`/customers/${created.id}`, { name: 'Updated Name' })
        .expect(200);

      const updated = res.body as CustomerResponse;
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Updated Name');
    });

    it('PATCH /customers/:id should return 404 on unknown id', async () => {
      await adminClient
        .patch('/customers/999999', { name: 'Ghost' })
        .expect(404);
    });

    it('DELETE /customers/:id should delete customer', async () => {
      const created = await createTestCustomer(adminClient);

      await adminClient.delete(`/customers/${created.id}`).expect(204);
      await adminClient.get(`/customers/${created.id}`).expect(404);
    });

    it('DELETE /customers/:id should return 404 on unknown id', async () => {
      await adminClient.delete('/customers/999999').expect(404);
    });
  });
});
