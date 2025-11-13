// test/e2e/customers.e2e-spec.ts

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { Server } from 'http';

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

describe('Customers e2e', () => {
  let app: INestApplication;
  let server: Server; // Express instance — OK pour supertest

  beforeAll(async () => {
    // Boot Nest App via our shared helper
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /customers should return paginated list with seeded customer', async () => {
    const res = await request(server).get('/customers').expect(200);

    // Our service returns { data, total, ... }
    const payload: PaginatedCustomers = res.body;

    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.total).toBeDefined();

    const acme = payload.data.find(
      (c: CustomerResponse) => c.email === 'billing@acme.com',
    );

    expect(acme).toBeTruthy();
    expect(acme?.name).toBe('ACME Corp');
  });

  it('GET /customers/:id should return a single customer', async () => {
    const res = await request(server).get('/customers/1').expect(200);

    const customer: CustomerResponse = res.body;

    expect(customer.id).toBe(1);
    expect(customer.email).toBe('billing@acme.com');
  });

  it('GET /customers/:id should return 404 for unknown id', async () => {
    await request(server).get('/customers/9999').expect(404);
  });

  it('POST /customers should create a new customer', async () => {
    const payload = {
      name: 'Bob',
      email: 'bob@example.com',
    };

    const res = await request(server)
      .post('/customers')
      .send(payload)
      .expect(201);

    const created: CustomerResponse = res.body;

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Bob');
    expect(created.email).toBe('bob@example.com');
  });

  it('POST /customers should fail on duplicate email', async () => {
    const payload = {
      name: 'Another ACME',
      email: 'billing@acme.com', // already exists
    };

    const res = await request(server)
      .post('/customers')
      .send(payload)
      .expect(409);

    expect(res.body.message).toBeDefined();
  });

  it('PATCH /customers/:id should update customer', async () => {
    const payload = { name: 'ACME Updated' };

    const res = await request(server)
      .patch('/customers/1')
      .send(payload)
      .expect(200);

    const updated: CustomerResponse = res.body;

    expect(updated.id).toBe(1);
    expect(updated.name).toBe('ACME Updated');
  });

  it('PATCH /customers/:id should return 404 on unknown id', async () => {
    await request(server)
      .patch('/customers/9999')
      .send({ name: 'Ghost' })
      .expect(404);
  });

  it('DELETE /customers/:id should delete customer', async () => {
    // Create dedicated customer
    const createdRes = await request(server)
      .post('/customers')
      .send({ name: 'Temp', email: 'temp@example.com' })
      .expect(201);

    const created: CustomerResponse = createdRes.body;

    await request(server).delete(`/customers/${created.id}`).expect(204);
  });

  it('DELETE /customers/:id should return 404 on unknown id', async () => {
    await request(server).delete('/customers/9999').expect(404);
  });
});
