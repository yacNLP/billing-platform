/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { INestApplication } from '@nestjs/common';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { Server } from 'http';
import { E2EClient } from '../utils/e2e-client';

interface CustomerResponse {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedCustomers {
  data: CustomerResponse[];
  page?: number;
  pageSize?: number;
  total?: number;
  hasNext?: boolean;
}

/**
 * Helper: create a unique customer for a test.
 * Ensures no email collision between tests.
 */
async function createTestCustomer(
  client: E2EClient,
  overrides: Partial<CustomerResponse> = {},
): Promise<CustomerResponse> {
  const uid = Date.now();

  const payload = {
    name: 'Test Customer',
    email: `customer_${uid}@example.com`,
    ...overrides,
  };

  const res = await client.post('/customers').send(payload).expect(201);

  return res.body as CustomerResponse;
}

describe('Customers e2e', () => {
  let app: INestApplication;
  let server: Server;
  let e2eClient: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;
    e2eClient = new E2EClient(server);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /customers should return paginated list', async () => {
    await createTestCustomer(e2eClient);

    const res = await e2eClient.get('/customers').expect(200);
    const payload = res.body as PaginatedCustomers;

    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.total).toBeDefined();
    expect(payload.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /customers/:id should return a single customer', async () => {
    const created = await createTestCustomer(e2eClient);

    const res = await e2eClient.get(`/customers/${created.id}`).expect(200);
    const customer = res.body as CustomerResponse;
    expect(customer.id).toBe(created.id);
    expect(customer.email).toBe(created.email);
  });

  it('GET /customers/:id should return 404 for unknown id', async () => {
    await e2eClient.get('/customers/999999').expect(404);
  });

  it('POST /customers should create a new customer', async () => {
    const created = await createTestCustomer(e2eClient);

    expect(created.id).toBeDefined();
    expect(created.email).toContain('@example.com');
  });

  it('POST /customers should fail on duplicate email', async () => {
    const created = await createTestCustomer(e2eClient);

    const payload = {
      name: 'Duplicate',
      email: created.email,
    };

    const res = await e2eClient.post('/customers').send(payload).expect(409);
    const error = res.body as { message?: string };
    expect(error.message).toBeDefined();
  });

  it('PATCH /customers/:id should update customer', async () => {
    const created = await createTestCustomer(e2eClient);

    const res = await e2eClient
      .patch(`/customers/${created.id}`)
      .send({ name: 'Updated Name' })
      .expect(200);
    const updated = res.body as CustomerResponse;
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Updated Name');
  });

  it('PATCH /customers/:id should return 404 on unknown id', async () => {
    await e2eClient
      .patch('/customers/999999')
      .send({ name: 'Ghost' })
      .expect(404);
  });

  it('DELETE /customers/:id should delete customer', async () => {
    const created = await createTestCustomer(e2eClient);

    await e2eClient.delete(`/customers/${created.id}`).expect(204);

    await e2eClient.get(`/customers/${created.id}`).expect(404);
  });

  it('DELETE /customers/:id should return 404 on unknown id', async () => {
    await e2eClient.delete('/customers/999999').expect(404);
  });
});
