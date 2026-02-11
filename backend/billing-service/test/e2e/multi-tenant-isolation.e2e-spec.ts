import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { login } from '../utils/e2e-auth';
interface CustomerResponse {
  id: number;
  name: string;
  email: string;
  tenantId?: number;
}

describe('multi tenant isolation e2e', () => {
  let app: INestApplication;
  let server: Server;

  let tenantAAdmin: E2EClient;
  let tenantBAdmin: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    tenantAAdmin = new E2EClient(server);
    tenantBAdmin = new E2EClient(server);

    // login with two different tenants
    await login(tenantAAdmin, 'admin@test.com');
    await login(tenantBAdmin, 'admin2@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should isolate data between tenants', async () => {
    // create in tenant a
    const payload = {
      name: 'tenant a customer',
      email: `tenant_a_${Date.now()}@example.com`,
    };

    const createRes = await tenantAAdmin
      .post('/customers', payload)
      .expect(201);
    const created = createRes.body as CustomerResponse;

    // tenant a can read
    await tenantAAdmin.get(`/customers/${created.id}`).expect(200);

    // tenant b must not read
    await tenantBAdmin.get(`/customers/${created.id}`).expect(404);
  });
});
