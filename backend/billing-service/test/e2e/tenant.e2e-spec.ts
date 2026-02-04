// test/e2e/tenant.e2e-spec.ts

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { createE2eApp, TestApp } from '../utils/e2e-app';

describe('Tenant middleware e2e', () => {
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

  it('should reject request without X-Tenant-Id header', async () => {
    await request(server).get('/customers').expect(400);
  });

  it('should reject request with invalid X-Tenant-Id header', async () => {
    await request(server)
      .get('/customers')
      .set('X-Tenant-Id', 'invalid')
      .expect(400);
  });
});
