import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';

import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { login, loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

type TeamMemberResponse = {
  id: number;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  password?: string;
  tenantId?: number;
};

type SignupResponse = {
  accessToken: string;
};

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

function createMemberPayload(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();

  return {
    email: `team_member_${suffix}@example.com`,
    password: 'password123',
    role: 'USER',
    ...overrides,
  };
}

async function signupTenantAdmin(server: Server): Promise<E2EClient> {
  const suffix = uniqueSuffix();
  const res = await request(server)
    .post('/auth/signup')
    .send({
      companyName: `Team Tenant ${suffix}`,
      email: `team_admin_${suffix}@example.com`,
      password: 'password123',
      defaultCurrency: 'EUR',
    })
    .expect(201);

  const client = new E2EClient(server);
  const token = (res.body as SignupResponse).accessToken;

  // E2EClient does not expose a token setter, so authenticate via login.
  const user = await prisma.user.findFirstOrThrow({
    where: { email: `team_admin_${suffix}@example.com` },
  });
  await client.login({ email: user.email, password: 'password123' });

  expect(token).toBeDefined();
  return client;
}

let prisma: PrismaService;

describe('Team e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let userClient: E2EClient;
  let tenantBAdminClient: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;
    prisma = app.get(PrismaService);

    adminClient = new E2EClient(server);
    userClient = new E2EClient(server);
    tenantBAdminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await loginAsUser(userClient);
    await login(tenantBAdminClient, 'admin2@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('ADMIN can list tenant members', async () => {
    const res = await adminClient.get('/team/members').expect(200);
    const members = res.body as TeamMemberResponse[];

    expect(members.length).toBeGreaterThanOrEqual(2);
    expect(members.some((member) => member.email === 'admin@test.com')).toBe(
      true,
    );
    expect(members.some((member) => member.email === 'user@test.com')).toBe(
      true,
    );
  });

  it('USER cannot list tenant members', async () => {
    await userClient.get('/team/members').expect(403);
  });

  it('ADMIN can create member', async () => {
    const payload = createMemberPayload({
      email: `TEAM_NEW_${uniqueSuffix()}@EXAMPLE.COM`,
    });

    const res = await adminClient.post('/team/members', payload).expect(201);
    const member = res.body as TeamMemberResponse;

    expect(member.email).toBe(String(payload.email).toLowerCase());
    expect(member.role).toBe('USER');
    expect(member.password).toBeUndefined();
    expect(member.tenantId).toBeUndefined();
  });

  it('USER cannot create member', async () => {
    await userClient.post('/team/members', createMemberPayload()).expect(403);
  });

  it('created member belongs to same tenant', async () => {
    const payload = createMemberPayload();
    const res = await adminClient.post('/team/members', payload).expect(201);
    const member = res.body as TeamMemberResponse;

    const persisted = await prisma.user.findUniqueOrThrow({
      where: { id: member.id },
    });
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@test.com' },
    });

    expect(persisted.tenantId).toBe(admin.tenantId);
  });

  it('email already used returns 409', async () => {
    const payload = createMemberPayload();

    await adminClient.post('/team/members', payload).expect(201);
    await adminClient.post('/team/members', payload).expect(409);
  });

  it('password too short returns 400', async () => {
    await adminClient
      .post('/team/members', createMemberPayload({ password: 'short' }))
      .expect(400);
  });

  it('tenantId in body returns 400', async () => {
    await adminClient
      .post('/team/members', createMemberPayload({ tenantId: 999 }))
      .expect(400);
  });

  it('password is not returned', async () => {
    const createRes = await adminClient
      .post('/team/members', createMemberPayload())
      .expect(201);
    const created = createRes.body as TeamMemberResponse;

    expect(created.password).toBeUndefined();

    const listRes = await adminClient.get('/team/members').expect(200);
    const listed = (listRes.body as TeamMemberResponse[]).find(
      (member) => member.id === created.id,
    );

    expect(listed?.password).toBeUndefined();
  });

  it('ADMIN can update member role', async () => {
    const createRes = await adminClient
      .post('/team/members', createMemberPayload({ role: 'USER' }))
      .expect(201);
    const created = createRes.body as TeamMemberResponse;

    const updateRes = await adminClient
      .patch(`/team/members/${created.id}/role`, { role: 'ADMIN' })
      .expect(200);
    const updated = updateRes.body as TeamMemberResponse;

    expect(updated.role).toBe('ADMIN');
    expect(updated.password).toBeUndefined();
  });

  it('cannot demote last ADMIN', async () => {
    const client = await signupTenantAdmin(server);
    const members = (await client.get('/team/members').expect(200))
      .body as TeamMemberResponse[];
    const onlyAdmin = members.find((member) => member.role === 'ADMIN');

    expect(onlyAdmin).toBeDefined();

    await client
      .patch(`/team/members/${onlyAdmin?.id}/role`, { role: 'USER' })
      .expect(403);
  });

  it('ADMIN can delete member', async () => {
    const createRes = await adminClient
      .post('/team/members', createMemberPayload())
      .expect(201);
    const created = createRes.body as TeamMemberResponse;

    await adminClient.delete(`/team/members/${created.id}`).expect(204);

    const deleted = await prisma.user.findUnique({ where: { id: created.id } });
    expect(deleted).toBeNull();
  });

  it('cannot delete last ADMIN', async () => {
    const client = await signupTenantAdmin(server);
    const members = (await client.get('/team/members').expect(200))
      .body as TeamMemberResponse[];
    const onlyAdmin = members.find((member) => member.role === 'ADMIN');

    expect(onlyAdmin).toBeDefined();

    await client.delete(`/team/members/${onlyAdmin?.id}`).expect(400);
  });

  it('ADMIN cannot delete himself', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@test.com' },
    });

    await adminClient.delete(`/team/members/${admin.id}`).expect(400);
  });

  it('tenant A cannot update/delete tenant B member', async () => {
    const tenantBMember = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin2@test.com' },
    });

    await adminClient
      .patch(`/team/members/${tenantBMember.id}/role`, { role: 'USER' })
      .expect(404);
    await adminClient.delete(`/team/members/${tenantBMember.id}`).expect(404);
  });

  it('audit logs are created', async () => {
    const createRes = await adminClient
      .post('/team/members', createMemberPayload())
      .expect(201);
    const created = createRes.body as TeamMemberResponse;

    await adminClient
      .patch(`/team/members/${created.id}/role`, { role: 'ADMIN' })
      .expect(200);
    await adminClient.delete(`/team/members/${created.id}`).expect(204);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'team_member',
        entityId: created.id,
        action: {
          in: [
            'team.member_created',
            'team.member_role_updated',
            'team.member_deleted',
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs.map((log) => log.action)).toEqual([
      'team.member_created',
      'team.member_role_updated',
      'team.member_deleted',
    ]);
    expect(logs.every((log) => log.actorUserId != null)).toBe(true);
  });
});
