import { INestApplication } from '@nestjs/common';
import { Server } from 'http';

import { PrismaService } from '../../src/prisma.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { login, loginAsAdmin, loginAsUser } from '../utils/e2e-auth';
import { E2EClient } from '../utils/e2e-client';

type TenantSettingsResponse = {
  id: number;
  companyName: string;
  logoUrl: string | null;
  billingEmail: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  taxId: string | null;
  vatNumber: string | null;
  defaultCurrency: string;
  paymentTerms: number;
  invoiceFooter: string | null;
  createdAt: string;
  updatedAt: string;
};

const validSettingsPayload = {
  companyName: 'Tenant Settings Corp',
  logoUrl: 'https://example.com/logo.png',
  billingEmail: 'billing@tenant-settings.test',
  phone: '+33 1 23 45 67 89',
  addressLine1: '12 Billing Street',
  addressLine2: 'Floor 3',
  city: 'Paris',
  postalCode: '75001',
  country: 'France',
  taxId: 'SIRET 123 456 789 00010',
  vatNumber: 'FR12345678901',
  defaultCurrency: 'eur',
  paymentTerms: 45,
  invoiceFooter: 'Payment due according to agreed terms.',
};

describe('Tenant settings e2e', () => {
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
    await login(tenantBAdminClient, 'admin2@test.com');

    prisma = app.get(PrismaService);
    await prisma.tenantSettings.deleteMany({
      where: {
        tenantId: {
          in: [1, 2],
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('ADMIN can read tenant settings and auto-create defaults', async () => {
    const res = await adminClient.get('/tenant-settings').expect(200);
    const settings = res.body as TenantSettingsResponse;

    expect(settings.companyName).toBe('Test Tenant 1');
    expect(settings.billingEmail).toBe('billing@example.com');
    expect(settings.defaultCurrency).toBe('EUR');
    expect(settings.paymentTerms).toBe(30);

    const persisted = await prisma.tenantSettings.findUnique({
      where: { tenantId: 1 },
    });
    expect(persisted).not.toBeNull();
  });

  it('USER can read tenant settings', async () => {
    const res = await userClient.get('/tenant-settings').expect(200);
    const settings = res.body as TenantSettingsResponse;

    expect(settings.companyName).toBeDefined();
    expect(settings.defaultCurrency).toBe('EUR');
  });

  it('ADMIN can update tenant settings', async () => {
    const res = await adminClient
      .put('/tenant-settings', validSettingsPayload)
      .expect(200);
    const settings = res.body as TenantSettingsResponse;

    expect(settings.companyName).toBe(validSettingsPayload.companyName);
    expect(settings.billingEmail).toBe(validSettingsPayload.billingEmail);
    expect(settings.defaultCurrency).toBe('EUR');
    expect(settings.paymentTerms).toBe(validSettingsPayload.paymentTerms);
  });

  it('writes an audit log when tenant settings are updated', async () => {
    const res = await adminClient
      .put('/tenant-settings', {
        ...validSettingsPayload,
        companyName: 'Audited Tenant Settings Corp',
      })
      .expect(200);
    const settings = res.body as TenantSettingsResponse;

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: 1,
        action: 'tenant_settings.updated',
        entityType: 'tenant_settings',
        entityId: settings.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditLog).not.toBeNull();
    expect(auditLog?.actorUserId).not.toBeNull();
  });

  it('USER cannot update tenant settings', async () => {
    await userClient.put('/tenant-settings', validSettingsPayload).expect(403);
  });

  it('tenant A cannot read or update tenant B settings', async () => {
    const tenantBRes = await tenantBAdminClient
      .put('/tenant-settings', {
        ...validSettingsPayload,
        companyName: 'Tenant B Billing',
        billingEmail: 'billing@tenant-b.test',
      })
      .expect(200);
    const tenantBSettings = tenantBRes.body as TenantSettingsResponse;

    const tenantARes = await adminClient.get('/tenant-settings').expect(200);
    const tenantASettings = tenantARes.body as TenantSettingsResponse;

    expect(tenantASettings.companyName).not.toBe(tenantBSettings.companyName);
    expect(tenantASettings.billingEmail).not.toBe(tenantBSettings.billingEmail);

    await adminClient
      .put('/tenant-settings', {
        ...validSettingsPayload,
        companyName: 'Tenant A Still Isolated',
      })
      .expect(200);

    const persistedTenantBSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: 2 },
    });
    expect(persistedTenantBSettings?.companyName).toBe('Tenant B Billing');
  });

  it('rejects tenantId in the request body', async () => {
    await adminClient
      .put('/tenant-settings', {
        ...validSettingsPayload,
        tenantId: 2,
      })
      .expect(400);
  });

  it('rejects invalid billingEmail', async () => {
    await adminClient
      .put('/tenant-settings', {
        ...validSettingsPayload,
        billingEmail: 'not-an-email',
      })
      .expect(400);
  });

  it('rejects invalid paymentTerms', async () => {
    await adminClient
      .put('/tenant-settings', {
        ...validSettingsPayload,
        paymentTerms: 121,
      })
      .expect(400);
  });
});
