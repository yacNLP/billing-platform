import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHash } from 'crypto';
import { Server } from 'http';

import { EmailService } from '../../src/email/email.service';
import { SendEmailInput } from '../../src/email/email.types';
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
let prisma: PrismaService;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function extractResetToken(input: SendEmailInput): string {
  const content = `${input.text ?? ''} ${input.html ?? ''}`;
  const match = content.match(/reset-password\?token=([a-f0-9]{64})/);

  if (!match) {
    throw new Error('Reset token not found in email content');
  }

  return match[1];
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

async function createResetUser(server: Server): Promise<{
  email: string;
  userId: number;
  tenantId: number;
}> {
  const payload = signupPayload();

  await request(server).post('/auth/signup').send(payload).expect(201);

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: payload.email },
  });

  return {
    email: payload.email,
    userId: user.id,
    tenantId: user.tenantId,
  };
}

describe('Auth signup e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let sentEmails: SendEmailInput[];

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;
    prisma = app.get(PrismaService);
    sentEmails = [];
    jest
      .spyOn(app.get(EmailService), 'sendEmail')
      .mockImplementation((input: SendEmailInput) => {
        sentEmails.push(input);
        return Promise.resolve({
          messageId: null,
          provider: 'noop',
          sent: true,
        });
      });

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

  it('forgot password always returns ok', async () => {
    const existingUser = await createResetUser(server);
    const missingEmail = `missing_${uniqueSuffix()}@example.com`;

    const existingRes = await request(server)
      .post('/auth/forgot-password')
      .send({ email: existingUser.email })
      .expect(201);
    const missingRes = await request(server)
      .post('/auth/forgot-password')
      .send({ email: missingEmail })
      .expect(201);

    expect(existingRes.body).toEqual({ ok: true });
    expect(missingRes.body).toEqual({ ok: true });
  });

  it('unknown forgot password email does not reveal anything or create a token', async () => {
    const missingEmail = `missing_${uniqueSuffix()}@example.com`;
    const beforeCount = await prisma.passwordResetToken.count();

    const res = await request(server)
      .post('/auth/forgot-password')
      .send({ email: missingEmail })
      .expect(201);

    const afterCount = await prisma.passwordResetToken.count();

    expect(res.body).toEqual({ ok: true });
    expect(afterCount).toBe(beforeCount);
  });

  it('existing forgot password email creates a hashed token that expires in the future', async () => {
    const user = await createResetUser(server);

    await request(server)
      .post('/auth/forgot-password')
      .send({ email: user.email.toUpperCase() })
      .expect(201);

    const token = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });
    const rawToken = extractResetToken(sentEmails.at(-1)!);

    expect(token.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(token.tokenHash).toBe(hashResetToken(rawToken));
    expect(token.tokenHash).not.toBe(rawToken);
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('reset password with a valid token changes the password and consumes the token', async () => {
    const user = await createResetUser(server);

    await request(server)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(201);

    const rawToken = extractResetToken(sentEmails.at(-1)!);
    const res = await request(server)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'newPassword123' })
      .expect(201);

    const token = await prisma.passwordResetToken.findFirstOrThrow({
      where: { tokenHash: hashResetToken(rawToken) },
    });

    expect(res.body).toEqual({ ok: true });
    expect(token.usedAt).not.toBeNull();
    await request(server)
      .post('/auth/login')
      .send({ email: user.email, password: 'password123' })
      .expect(401);
    await request(server)
      .post('/auth/login')
      .send({ email: user.email, password: 'newPassword123' })
      .expect(201);
  });

  it('reset password rejects reused tokens', async () => {
    const user = await createResetUser(server);

    await request(server)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(201);

    const rawToken = extractResetToken(sentEmails.at(-1)!);

    await request(server)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'newPassword123' })
      .expect(201);
    await request(server)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'anotherPassword123' })
      .expect(400);
  });

  it('reset password rejects expired tokens', async () => {
    const user = await createResetUser(server);
    const rawToken = uniqueSuffix().padEnd(64, 'a').slice(0, 64);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.userId,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await request(server)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'newPassword123' })
      .expect(400);
  });

  it('forgot password cleans expired and used reset tokens opportunistically', async () => {
    const user = await createResetUser(server);

    const expiredToken = await prisma.passwordResetToken.create({
      data: {
        userId: user.userId,
        tokenHash: hashResetToken(`${uniqueSuffix()}expired`),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const usedToken = await prisma.passwordResetToken.create({
      data: {
        userId: user.userId,
        tokenHash: hashResetToken(`${uniqueSuffix()}used`),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      },
    });

    await request(server)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(201);

    const staleTokens = await prisma.passwordResetToken.findMany({
      where: { id: { in: [expiredToken.id, usedToken.id] } },
    });

    expect(staleTokens).toEqual([]);
  });

  it('reset password rejects short passwords', async () => {
    await request(server)
      .post('/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: 'short' })
      .expect(400);
  });

  it('creates password reset audit logs without exposing tokens', async () => {
    const user = await createResetUser(server);

    const forgotRes = await request(server)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(201);
    const rawToken = extractResetToken(sentEmails.at(-1)!);
    const resetRes = await request(server)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'newPassword123' })
      .expect(201);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: user.tenantId,
        entityType: 'auth',
        entityId: user.userId,
      },
      orderBy: { createdAt: 'asc' },
    });
    const requested = auditLogs.find(
      (log) => log.action === 'auth.password_reset_requested',
    );
    const completed = auditLogs.find(
      (log) => log.action === 'auth.password_reset_completed',
    );
    const serializedAuditMetadata = JSON.stringify(
      auditLogs.map((log) => log.metadata),
    );

    expect(forgotRes.body).toEqual({ ok: true });
    expect(resetRes.body).toEqual({ ok: true });
    expect(JSON.stringify(forgotRes.body)).not.toContain(rawToken);
    expect(JSON.stringify(resetRes.body)).not.toContain(rawToken);
    expect(requested).toBeDefined();
    expect(completed).toBeDefined();
    expect(serializedAuditMetadata).not.toContain(rawToken);
    expect(serializedAuditMetadata).not.toContain(hashResetToken(rawToken));
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

describe('Auth rate limiting e2e', () => {
  const originalThrottleDisabled = process.env.AUTH_THROTTLE_DISABLED;
  const originalLoginLimit = process.env.AUTH_LOGIN_LIMIT;
  const originalLoginTtl = process.env.AUTH_LOGIN_TTL_SECONDS;
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    process.env.AUTH_THROTTLE_DISABLED = 'false';
    process.env.AUTH_LOGIN_LIMIT = '1';
    process.env.AUTH_LOGIN_TTL_SECONDS = '60';

    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;
  });

  afterAll(async () => {
    await app.close();

    if (originalThrottleDisabled === undefined) {
      delete process.env.AUTH_THROTTLE_DISABLED;
    } else {
      process.env.AUTH_THROTTLE_DISABLED = originalThrottleDisabled;
    }

    if (originalLoginLimit === undefined) {
      delete process.env.AUTH_LOGIN_LIMIT;
    } else {
      process.env.AUTH_LOGIN_LIMIT = originalLoginLimit;
    }

    if (originalLoginTtl === undefined) {
      delete process.env.AUTH_LOGIN_TTL_SECONDS;
    } else {
      process.env.AUTH_LOGIN_TTL_SECONDS = originalLoginTtl;
    }
  });

  it('returns 429 after too many login attempts', async () => {
    const payload = {
      email: `rate_${uniqueSuffix()}@example.com`,
      password: 'wrongPassword123',
    };

    await request(server).post('/auth/login').send(payload).expect(401);
    await request(server).post('/auth/login').send(payload).expect(429);
  });
});
