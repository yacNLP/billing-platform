/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';

interface CustomerResponse {
  id: number;
  name: string;
  email: string;
}

describe('Multi-tenant isolation e2e', () => {
  let app: INestApplication;
  let server: Server;

  let tenantA: E2EClient;
  let tenantB: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    // two different tenants
    tenantA = new E2EClient(server, 1);
    tenantB = new E2EClient(server, 2);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should isolate data between tenants', async () => {
    // tenant A creates a customer
    const payload = {
      name: 'Tenant A Customer',
      email: `tenantA_${Date.now()}@example.com`,
    };

    const createRes = await tenantA
      .post('/customers')
      .send(payload)
      .expect(201);

    const created = createRes.body as CustomerResponse;

    // tenant A can access it
    await tenantA.get(`/customers/${created.id}`).expect(200);

    // tenant B must NOT see tenant A data
    await tenantB.get(`/customers/${created.id}`).expect(404);
  });
});
