import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';

import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

type OnboardingStepKey =
  | 'settings'
  | 'customers'
  | 'products'
  | 'plans'
  | 'subscriptions'
  | 'invoices';

type OnboardingStatusResponse = {
  steps: Array<{
    key: OnboardingStepKey;
    label: string;
    completed: boolean;
    href: string;
  }>;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
};

type SignupResponse = {
  accessToken: string;
};

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

function getStep(
  status: OnboardingStatusResponse,
  key: OnboardingStepKey,
): OnboardingStatusResponse['steps'][number] {
  const step = status.steps.find((item) => item.key === key);

  if (!step) {
    throw new Error(`Missing onboarding step ${key}`);
  }

  return step;
}

async function signupEmptyTenant(server: Server): Promise<string> {
  const suffix = uniqueSuffix();
  const res = await request(server)
    .post('/auth/signup')
    .send({
      companyName: `Onboarding Empty ${suffix}`,
      email: `onboarding_empty_${suffix}@example.com`,
      password: 'password123',
      defaultCurrency: 'EUR',
    })
    .expect(201);

  return (res.body as SignupResponse).accessToken;
}

describe('Onboarding e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let userClient: E2EClient;
  let tenantBAdminClient: E2EClient;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    userClient = new E2EClient(server);
    tenantBAdminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await loginAsUser(userClient);
    await tenantBAdminClient.login({
      email: 'admin2@test.com',
      password: 'password123',
    });

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('empty tenant returns incomplete onboarding steps', async () => {
    const accessToken = await signupEmptyTenant(server);

    const res = await request(server)
      .get('/onboarding/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const status = res.body as OnboardingStatusResponse;

    expect(status.totalCount).toBe(6);
    expect(status.isComplete).toBe(false);
    expect(getStep(status, 'settings').completed).toBe(false);
    expect(getStep(status, 'customers').completed).toBe(false);
    expect(getStep(status, 'products').completed).toBe(false);
    expect(getStep(status, 'plans').completed).toBe(false);
    expect(getStep(status, 'subscriptions').completed).toBe(false);
    expect(getStep(status, 'invoices').completed).toBe(false);
  });

  it('tenant with data returns completed steps', async () => {
    const status = (await adminClient.get('/onboarding/status').expect(200))
      .body as OnboardingStatusResponse;

    expect(getStep(status, 'settings').completed).toBe(true);
    expect(getStep(status, 'customers').completed).toBe(true);
    expect(getStep(status, 'products').completed).toBe(true);
    expect(getStep(status, 'plans').completed).toBe(true);
    expect(getStep(status, 'subscriptions').completed).toBe(true);
    expect(getStep(status, 'invoices').completed).toBe(true);
    expect(status.completedCount).toBe(6);
    expect(status.isComplete).toBe(true);
  });

  it('is tenant isolated', async () => {
    const tenantB = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin2@test.com' },
      select: { tenantId: true },
    });

    await prisma.payment.deleteMany({ where: { tenantId: tenantB.tenantId } });
    await prisma.invoice.deleteMany({ where: { tenantId: tenantB.tenantId } });
    await prisma.subscription.deleteMany({
      where: { tenantId: tenantB.tenantId },
    });
    await prisma.plan.deleteMany({ where: { tenantId: tenantB.tenantId } });
    await prisma.product.deleteMany({ where: { tenantId: tenantB.tenantId } });
    await prisma.customer.deleteMany({ where: { tenantId: tenantB.tenantId } });

    const tenantAStatus = (
      await adminClient.get('/onboarding/status').expect(200)
    ).body as OnboardingStatusResponse;
    const tenantBStatus = (
      await tenantBAdminClient.get('/onboarding/status').expect(200)
    ).body as OnboardingStatusResponse;

    expect(getStep(tenantAStatus, 'customers').completed).toBe(true);
    expect(getStep(tenantBStatus, 'customers').completed).toBe(false);
    expect(getStep(tenantBStatus, 'products').completed).toBe(false);
    expect(getStep(tenantBStatus, 'plans').completed).toBe(false);
    expect(getStep(tenantBStatus, 'subscriptions').completed).toBe(false);
    expect(getStep(tenantBStatus, 'invoices').completed).toBe(false);
  });

  it('USER can read onboarding status', async () => {
    const status = (await userClient.get('/onboarding/status').expect(200))
      .body as OnboardingStatusResponse;

    expect(status.totalCount).toBe(6);
    expect(Array.isArray(status.steps)).toBe(true);
  });
});
