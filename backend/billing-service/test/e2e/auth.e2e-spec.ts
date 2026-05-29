import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';

import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { loginAsAdmin } from '../utils/e2e-auth';

type SignupResponse = {
  accessToken: string;
};

type PaginatedResponse = {
  data: unknown[];
  total: number;
};

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

function signupPayload(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();

  return {
    companyName: `Signup Tenant ${suffix}`,
    email: `signup_${suffix}@example.com`,
    password: 'password123',
    billingEmail: `billing_${suffix}@example.com`,
    defaultCurrency: 'EUR',
    ...overrides,
  };
}

describe('Auth signup e2e', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  let adminClient: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;
    prisma = app.get(PrismaService);

    adminClient = new E2EClient(server);
    await loginAsAdmin(adminClient);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a tenant', async () => {
    const payload = signupPayload();

    await request(server).post('/auth/signup').send(payload).expect(201);

    const tenant = await prisma.tenant.findFirst({
      where: { name: payload.companyName },
    });

    expect(tenant).toBeDefined();
  });

  it('creates the first user as ADMIN with normalized email', async () => {
    const payload = signupPayload({
      email: `SIGNUP_${uniqueSuffix()}@EXAMPLE.COM`,
    });

    await request(server).post('/auth/signup').send(payload).expect(201);

    const user = await prisma.user.findUnique({
      where: { email: String(payload.email).toLowerCase() },
    });

    expect(user).toBeDefined();
    expect(user?.role).toBe('ADMIN');
    expect(user?.password).not.toBe(payload.password);
  });

  it('creates tenant settings', async () => {
    const payload = signupPayload({ defaultCurrency: 'usd' });

    await request(server).post('/auth/signup').send(payload).expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email },
    });
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });

    expect(settings).toBeDefined();
    expect(settings?.companyName).toBe(payload.companyName);
    expect(settings?.billingEmail).toBe(payload.billingEmail);
    expect(settings?.defaultCurrency).toBe('USD');
    expect(settings?.paymentTerms).toBe(30);
  });

  it('returns an accessToken', async () => {
    const payload = signupPayload();

    const res = await request(server)
      .post('/auth/signup')
      .send(payload)
      .expect(201);

    const body = res.body as SignupResponse;
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(20);
  });

  it('returned token can call a protected tenant-scoped route', async () => {
    const payload = signupPayload();

    const res = await request(server)
      .post('/auth/signup')
      .send(payload)
      .expect(201);

    const body = res.body as SignupResponse;

    await request(server)
      .get('/tenant-settings')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
  });

  it('returns 409 when email is already used', async () => {
    const payload = signupPayload();

    await request(server).post('/auth/signup').send(payload).expect(201);
    await request(server).post('/auth/signup').send(payload).expect(409);
  });

  it('returns 400 when password is too short', async () => {
    await request(server)
      .post('/auth/signup')
      .send(signupPayload({ password: 'short' }))
      .expect(400);
  });

  it('returns 400 when email is invalid', async () => {
    await request(server)
      .post('/auth/signup')
      .send(signupPayload({ email: 'not-an-email' }))
      .expect(400);
  });

  it('returns 400 when tenantId is sent in body', async () => {
    await request(server)
      .post('/auth/signup')
      .send(signupPayload({ tenantId: 999 }))
      .expect(400);
  });

  it('returns 400 when defaultCurrency is not a 3-letter code', async () => {
    await request(server)
      .post('/auth/signup')
      .send(signupPayload({ defaultCurrency: '123' }))
      .expect(400);
  });

  it('new tenant is isolated from existing tenant data', async () => {
    const suffix = uniqueSuffix();
    await adminClient
      .post('/customers', {
        name: `Existing Tenant Customer ${suffix}`,
        email: `existing_${suffix}@example.com`,
      })
      .expect(201);

    const signupRes = await request(server)
      .post('/auth/signup')
      .send(signupPayload())
      .expect(201);

    const body = signupRes.body as SignupResponse;

    const customersRes = await request(server)
      .get('/customers?page=1&pageSize=20')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);

    const customersBody = customersRes.body as PaginatedResponse;

    expect(customersBody.total).toBe(0);
    expect(customersBody.data).toEqual([]);
  });
});
