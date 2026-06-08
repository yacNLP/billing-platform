import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';

import { createE2eApp, TestApp } from '../utils/e2e-app';

describe('Health e2e', () => {
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

  it('GET /healthz returns ok', async () => {
    const res = await request(server).get('/healthz').expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz returns ok when database is available', async () => {
    const res = await request(server).get('/readyz').expect(200);

    expect(res.body).toEqual({ status: 'ok', database: 'ok' });
  });
});
