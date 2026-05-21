import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Server } from 'http';

import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { login, loginAsAdmin, loginAsUser } from '../utils/e2e-auth';

interface AuditLogResponse {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: Prisma.JsonValue;
  actorUserId: number | null;
  createdAt: string;
  tenantId?: number;
}

interface PaginatedAuditLogs {
  data: AuditLogResponse[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

describe('Audit logs e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let userClient: E2EClient;
  let tenantBAdminClient: E2EClient;
  let prisma: PrismaService;
  let tenantAAdminUserId: number;
  let tenantBAdminUserId: number;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    userClient = new E2EClient(server);
    tenantBAdminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await loginAsUser(userClient);
    await login(tenantBAdminClient, 'admin2@test.com');

    prisma = app.get(PrismaService);

    const [tenantAAdmin, tenantBAdmin] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'admin2@test.com' } }),
    ]);

    tenantAAdminUserId = tenantAAdmin.id;
    tenantBAdminUserId = tenantBAdmin.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAuditLog(overrides?: {
    tenantId?: number;
    actorUserId?: number;
    action?: string;
    entityType?: string;
    entityId?: number;
    metadata?: Prisma.InputJsonValue;
    createdAt?: Date;
  }) {
    const suffix = uniqueSuffix();

    return prisma.auditLog.create({
      data: {
        tenantId: overrides?.tenantId ?? 1,
        actorUserId: overrides?.actorUserId ?? tenantAAdminUserId,
        action: overrides?.action ?? `audit_test.action_${suffix}`,
        entityType: overrides?.entityType ?? 'audit_test',
        entityId: overrides?.entityId ?? Number(uniqueCounter),
        metadata: overrides?.metadata ?? { source: 'audit-logs-e2e', suffix },
        ...(overrides?.createdAt ? { createdAt: overrides.createdAt } : {}),
      },
    });
  }

  it('ADMIN can list audit logs', async () => {
    const action = `audit_test.list_${uniqueSuffix()}`;
    const created = await createAuditLog({ action });

    const res = await adminClient
      .get('/audit-logs')
      .query({ action })
      .expect(200);

    const payload = res.body as PaginatedAuditLogs;

    expect(payload.data).toHaveLength(1);
    expect(payload.total).toBe(1);
    expect(payload.page).toBe(1);
    expect(payload.pageSize).toBe(20);
    expect(payload.totalPages).toBe(1);
    expect(payload.data[0]).toMatchObject({
      id: created.id,
      action,
      entityType: created.entityType,
      entityId: created.entityId,
      actorUserId: tenantAAdminUserId,
    });
    expect(payload.data[0].createdAt).toBeDefined();
    expect(payload.data[0].tenantId).toBeUndefined();
  });

  it('USER cannot list audit logs', async () => {
    await userClient.get('/audit-logs').expect(403);
  });

  it('pagination works', async () => {
    const action = `audit_test.pagination_${uniqueSuffix()}`;
    const oldest = await createAuditLog({
      action,
      entityId: 1,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const middle = await createAuditLog({
      action,
      entityId: 2,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const newest = await createAuditLog({
      action,
      entityId: 3,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
    });

    const firstPage = await adminClient
      .get('/audit-logs')
      .query({ action, page: 1, pageSize: 2 })
      .expect(200);
    const firstPayload = firstPage.body as PaginatedAuditLogs;

    expect(firstPayload.total).toBe(3);
    expect(firstPayload.totalPages).toBe(2);
    expect(firstPayload.page).toBe(1);
    expect(firstPayload.pageSize).toBe(2);
    expect(firstPayload.data.map((log) => log.id)).toEqual([
      newest.id,
      middle.id,
    ]);

    const secondPage = await adminClient
      .get('/audit-logs')
      .query({ action, page: 2, pageSize: 2 })
      .expect(200);
    const secondPayload = secondPage.body as PaginatedAuditLogs;

    expect(secondPayload.data.map((log) => log.id)).toEqual([oldest.id]);
  });

  it('filter by action works', async () => {
    const targetAction = `audit_test.filter_action_${uniqueSuffix()}`;
    const otherAction = `audit_test.filter_action_other_${uniqueSuffix()}`;
    const target = await createAuditLog({ action: targetAction });
    await createAuditLog({ action: otherAction });

    const res = await adminClient
      .get('/audit-logs')
      .query({ action: targetAction })
      .expect(200);
    const payload = res.body as PaginatedAuditLogs;

    expect(payload.data.map((log) => log.id)).toEqual([target.id]);
    expect(payload.data.every((log) => log.action === targetAction)).toBe(true);
  });

  it('filter by entityType works', async () => {
    const entityType = `audit_test_entity_${uniqueSuffix()}`;
    const otherEntityType = `audit_test_entity_other_${uniqueSuffix()}`;
    const target = await createAuditLog({ entityType });
    await createAuditLog({ entityType: otherEntityType });

    const res = await adminClient
      .get('/audit-logs')
      .query({ entityType })
      .expect(200);
    const payload = res.body as PaginatedAuditLogs;

    expect(payload.data.map((log) => log.id)).toContain(target.id);
    expect(payload.data.every((log) => log.entityType === entityType)).toBe(
      true,
    );
  });

  it('filter by entityId works', async () => {
    const action = `audit_test.filter_entity_id_${uniqueSuffix()}`;
    const target = await createAuditLog({ action, entityId: 9001 });
    await createAuditLog({ action, entityId: 9002 });

    const res = await adminClient
      .get('/audit-logs')
      .query({ action, entityId: 9001 })
      .expect(200);
    const payload = res.body as PaginatedAuditLogs;

    expect(payload.data.map((log) => log.id)).toEqual([target.id]);
    expect(payload.data.every((log) => log.entityId === 9001)).toBe(true);
  });

  it('tenant isolation works', async () => {
    const action = `audit_test.tenant_isolation_${uniqueSuffix()}`;
    const tenantALog = await createAuditLog({
      tenantId: 1,
      actorUserId: tenantAAdminUserId,
      action,
    });
    const tenantBLog = await createAuditLog({
      tenantId: 2,
      actorUserId: tenantBAdminUserId,
      action,
    });

    const tenantARes = await adminClient
      .get('/audit-logs')
      .query({ action })
      .expect(200);
    const tenantAPayload = tenantARes.body as PaginatedAuditLogs;

    expect(tenantAPayload.data.map((log) => log.id)).toEqual([tenantALog.id]);
    expect(tenantAPayload.data.some((log) => log.id === tenantBLog.id)).toBe(
      false,
    );

    const tenantBRes = await tenantBAdminClient
      .get('/audit-logs')
      .query({ action })
      .expect(200);
    const tenantBPayload = tenantBRes.body as PaginatedAuditLogs;

    expect(tenantBPayload.data.map((log) => log.id)).toEqual([tenantBLog.id]);
    expect(tenantBPayload.data.some((log) => log.id === tenantALog.id)).toBe(
      false,
    );
  });
});
