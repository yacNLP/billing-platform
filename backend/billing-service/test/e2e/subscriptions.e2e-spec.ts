import { INestApplication } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { Server } from 'http';
import type { BillingInterval, SubscriptionStatus } from '@prisma/client';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';
import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { login, loginAsAdmin } from '../utils/e2e-auth';

interface CustomerResponse {
  id: number;
  name: string;
  email: string;
}

interface ProductResponse {
  id: number;
  name: string;
  sku: string;
  priceCents: number;
  stock: number;
  isActive: boolean;
}

interface PlanResponse {
  id: number;
  code: string;
  name: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  active: boolean;
  productId: number;
}

interface SubscriptionResponse {
  id: number;
  tenantId: number;
  customerId: number;
  planId: number;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  amountSnapshot: number;
  currencySnapshot: string;
  intervalSnapshot: BillingInterval;
  intervalCountSnapshot: number;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceResponse {
  id: number;
  tenantId: number;
  subscriptionId: number;
  customerId: number;
  invoiceNumber: string;
  status: 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';
  currency: string;
  amountDue: number;
  amountPaid: number;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedSubscriptions {
  data: SubscriptionResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaginatedInvoices {
  data: InvoiceResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

async function listInvoices(client: E2EClient): Promise<InvoiceResponse[]> {
  const res = await client.get('/invoices?pageSize=500').expect(200);
  const payload = res.body as PaginatedInvoices;
  return payload.data;
}

async function listInvoicesForSubscription(
  client: E2EClient,
  subscriptionId: number,
): Promise<InvoiceResponse[]> {
  const invoices = await listInvoices(client);
  return invoices.filter((item) => item.subscriptionId === subscriptionId);
}

async function createTestCustomer(
  client: E2EClient,
  prefix = 'subscription_customer',
): Promise<CustomerResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/customers', {
      name: `Customer ${suffix}`,
      email: `${prefix}_${suffix}@example.com`,
    })
    .expect(201);

  return res.body as CustomerResponse;
}

async function createTestProduct(
  client: E2EClient,
  prefix = 'subscription_product',
): Promise<ProductResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/products', {
      name: `Product ${suffix}`,
      sku: `${prefix.toUpperCase()}_${suffix}`,
      priceCents: 1990,
      stock: 25,
      isActive: true,
    })
    .expect(201);

  return res.body as ProductResponse;
}

async function createTestPlan(
  client: E2EClient,
  productId: number,
  overrides: Partial<PlanResponse> = {},
): Promise<PlanResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/plans', {
      code: `SUB_PLAN_${suffix}`,
      name: `Subscription Plan ${suffix}`,
      description: 'Subscription test plan',
      amount: 4900,
      currency: 'EUR',
      interval: 'MONTH',
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId,
      ...overrides,
    })
    .expect(201);

  return res.body as PlanResponse;
}

async function createTestSubscription(
  client: E2EClient,
  customerId: number,
  planId: number,
  overrides: Partial<{
    startDate: string;
    cancelAtPeriodEnd: boolean;
  }> = {},
): Promise<SubscriptionResponse> {
  const res = await client
    .post('/subscriptions', {
      customerId,
      planId,
      ...overrides,
    })
    .expect(201);

  return res.body as SubscriptionResponse;
}

describe('Subscriptions e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;
  let tenantBAdminClient: E2EClient;
  let subscriptionsService: SubscriptionsService;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);
    tenantBAdminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
    await login(tenantBAdminClient, 'admin2@test.com');

    const moduleRef = app.get(ModuleRef);
    const contextId = ContextIdFactory.create();
    moduleRef.registerRequestByContextId({ tenantId: 1 }, contextId);
    subscriptionsService = await moduleRef.resolve(
      SubscriptionsService,
      contextId,
      {
        strict: false,
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create subscription', () => {
    it('creates a subscription successfully with expected snapshots', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        amount: 9900,
        currency: 'EUR',
        interval: 'MONTH',
        intervalCount: 1,
      });

      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      expect(created.id).toBeDefined();
      expect(created.customerId).toBe(customer.id);
      expect(created.planId).toBe(plan.id);
      expect(created.status).toBe('ACTIVE');
      expect(created.cancelAtPeriodEnd).toBe(false);
      expect(created.amountSnapshot).toBe(plan.amount);
      expect(created.currencySnapshot).toBe(plan.currency);
      expect(created.intervalSnapshot).toBe(plan.interval);
      expect(created.intervalCountSnapshot).toBe(plan.intervalCount);
      expect(created.currentPeriodStart).toBe(created.startDate);
      expect(new Date(created.currentPeriodEnd).getTime()).toBeGreaterThan(
        new Date(created.currentPeriodStart).getTime(),
      );
    });

    it('creates the initial invoice automatically with the expected snapshot values', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        amount: 9900,
        currency: 'EUR',
        interval: 'MONTH',
        intervalCount: 1,
      });

      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      const invoicesRes = await adminClient
        .get('/invoices?pageSize=100')
        .expect(200);
      const invoicesPayload = invoicesRes.body as PaginatedInvoices;
      const invoice = invoicesPayload.data.find(
        (item) => item.subscriptionId === created.id,
      );

      expect(invoice).toBeDefined();
      expect(invoice?.tenantId).toBe(created.tenantId);
      expect(invoice?.subscriptionId).toBe(created.id);
      expect(invoice?.customerId).toBe(customer.id);
      expect(invoice?.status).toBe('ISSUED');
      expect(invoice?.amountDue).toBe(created.amountSnapshot);
      expect(invoice?.amountPaid).toBe(0);
      expect(invoice?.currency).toBe(created.currencySnapshot);
      expect(invoice?.periodStart).toBe(created.currentPeriodStart);
      expect(invoice?.periodEnd).toBe(created.currentPeriodEnd);
      expect(invoice?.issuedAt).toBeDefined();
      expect(invoice?.dueAt).toBeDefined();
      expect(new Date(invoice!.dueAt).getTime()).toBeGreaterThan(
        new Date(invoice!.issuedAt).getTime(),
      );

      const expectedDueAt = new Date(
        new Date(invoice!.issuedAt).getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      expect(new Date(invoice!.dueAt).toISOString()).toBe(
        expectedDueAt.toISOString(),
      );
    });

    it('rejects creation when customer does not exist', async () => {
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);

      await adminClient
        .post('/subscriptions', {
          customerId: 999999,
          planId: plan.id,
        })
        .expect(400);
    });

    it('rejects creation when plan does not exist', async () => {
      const customer = await createTestCustomer(adminClient);

      await adminClient
        .post('/subscriptions', {
          customerId: customer.id,
          planId: 999999,
        })
        .expect(400);
    });

    it('rejects creation when plan is inactive', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const inactivePlan = await createTestPlan(adminClient, product.id, {
        active: false,
      });

      await adminClient
        .post('/subscriptions', {
          customerId: customer.id,
          planId: inactivePlan.id,
        })
        .expect(400);
    });

    it('rejects creation when customer already has an ACTIVE subscription', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const firstPlan = await createTestPlan(adminClient, product.id);
      const secondPlan = await createTestPlan(adminClient, product.id);

      await createTestSubscription(adminClient, customer.id, firstPlan.id);

      await adminClient
        .post('/subscriptions', {
          customerId: customer.id,
          planId: secondPlan.id,
        })
        .expect(409);
    });
  });

  describe('read subscriptions', () => {
    it('lists subscriptions for current tenant only', async () => {
      const customerA = await createTestCustomer(adminClient, 'tenant_a_sub');
      const productA = await createTestProduct(adminClient, 'tenant_a_sub');
      const planA = await createTestPlan(adminClient, productA.id);
      const subscriptionA = await createTestSubscription(
        adminClient,
        customerA.id,
        planA.id,
      );

      const customerB = await createTestCustomer(
        tenantBAdminClient,
        'tenant_b_sub',
      );
      const productB = await createTestProduct(
        tenantBAdminClient,
        'tenant_b_sub',
      );
      const planB = await createTestPlan(tenantBAdminClient, productB.id);
      const subscriptionB = await createTestSubscription(
        tenantBAdminClient,
        customerB.id,
        planB.id,
      );

      const tenantAList = await adminClient.get('/subscriptions').expect(200);
      const tenantAPayload = tenantAList.body as PaginatedSubscriptions;

      expect(
        tenantAPayload.data.some((item) => item.id === subscriptionA.id),
      ).toBe(true);
      expect(
        tenantAPayload.data.some((item) => item.id === subscriptionB.id),
      ).toBe(false);

      const tenantBList = await tenantBAdminClient
        .get('/subscriptions')
        .expect(200);
      const tenantBPayload = tenantBList.body as PaginatedSubscriptions;

      expect(
        tenantBPayload.data.some((item) => item.id === subscriptionB.id),
      ).toBe(true);
      expect(
        tenantBPayload.data.some((item) => item.id === subscriptionA.id),
      ).toBe(false);
    });

    it('gets one subscription by id for the same tenant', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      const res = await adminClient
        .get(`/subscriptions/${created.id}`)
        .expect(200);
      const payload = res.body as SubscriptionResponse;

      expect(payload.id).toBe(created.id);
      expect(payload.customerId).toBe(customer.id);
      expect(payload.planId).toBe(plan.id);
    });

    it('returns 404 for missing subscription', async () => {
      await adminClient.get('/subscriptions/999999').expect(404);
    });

    it('returns 404 for another tenant subscription', async () => {
      const customer = await createTestCustomer(
        tenantBAdminClient,
        'cross_tenant',
      );
      const product = await createTestProduct(
        tenantBAdminClient,
        'cross_tenant',
      );
      const plan = await createTestPlan(tenantBAdminClient, product.id);
      const created = await createTestSubscription(
        tenantBAdminClient,
        customer.id,
        plan.id,
      );

      await adminClient.get(`/subscriptions/${created.id}`).expect(404);
    });
  });

  describe('cancel subscription', () => {
    it('cancels subscription at period end', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      const res = await adminClient
        .patch(`/subscriptions/${created.id}/cancel`, {
          cancelAtPeriodEnd: true,
        })
        .expect(200);

      const payload = res.body as SubscriptionResponse;

      expect(payload.id).toBe(created.id);
      expect(payload.status).toBe('ACTIVE');
      expect(payload.cancelAtPeriodEnd).toBe(true);
      expect(payload.canceledAt).not.toBeNull();
      expect(payload.endedAt).toBeNull();
      expect(payload.currentPeriodEnd).toBe(created.currentPeriodEnd);
    });

    it('cancels subscription immediately', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id);
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
      );

      const res = await adminClient
        .patch(`/subscriptions/${created.id}/cancel`, {
          cancelAtPeriodEnd: false,
        })
        .expect(200);

      const payload = res.body as SubscriptionResponse;

      expect(payload.id).toBe(created.id);
      expect(payload.status).toBe('CANCELED');
      expect(payload.cancelAtPeriodEnd).toBe(false);
      expect(payload.canceledAt).not.toBeNull();
      expect(payload.endedAt).not.toBeNull();
      expect(payload.currentPeriodEnd).toBe(created.currentPeriodEnd);
    });
  });

  describe('subscription lifecycle', () => {
    it('expires active subscriptions when currentPeriodEnd is in the past and cancelAtPeriodEnd is true', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        interval: 'DAY',
        intervalCount: 1,
      });
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
        {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: true,
        },
      );

      await subscriptionsService.evaluateSubscriptionsLifecycle();

      const res = await adminClient
        .get(`/subscriptions/${created.id}`)
        .expect(200);
      const payload = res.body as SubscriptionResponse;

      expect(payload.status).toBe('EXPIRED');
      expect(payload.endedAt).not.toBeNull();
    });

    it('renews an active subscription when currentPeriodEnd is in the past and cancelAtPeriodEnd is false', async () => {
      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        interval: 'DAY',
        intervalCount: 1,
      });
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
        {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: false,
        },
      );

      const invoicesBefore = await listInvoicesForSubscription(
        adminClient,
        created.id,
      );

      await subscriptionsService.evaluateSubscriptionsLifecycle();

      const res = await adminClient
        .get(`/subscriptions/${created.id}`)
        .expect(200);
      const payload = res.body as SubscriptionResponse;
      const invoicesAfter = await listInvoicesForSubscription(
        adminClient,
        created.id,
      );
      const renewedInvoice = invoicesAfter.find(
        (item) => !invoicesBefore.some((existing) => existing.id === item.id),
      );

      expect(payload.status).toBe('ACTIVE');
      expect(payload.cancelAtPeriodEnd).toBe(false);
      expect(payload.currentPeriodStart).toBe(created.currentPeriodEnd);
      expect(new Date(payload.currentPeriodEnd).getTime()).toBeGreaterThan(
        new Date(payload.currentPeriodStart).getTime(),
      );
      expect(invoicesAfter).toHaveLength(invoicesBefore.length + 1);
      expect(renewedInvoice).toBeDefined();
      expect(renewedInvoice?.status).toBe('ISSUED');
      expect(renewedInvoice?.amountDue).toBe(payload.amountSnapshot);
      expect(renewedInvoice?.amountPaid).toBe(0);
      expect(renewedInvoice?.currency).toBe(payload.currencySnapshot);
      expect(renewedInvoice?.periodStart).toBe(payload.currentPeriodStart);
      expect(renewedInvoice?.periodEnd).toBe(payload.currentPeriodEnd);
      expect(new Date(renewedInvoice!.dueAt).getTime()).toBe(
        new Date(renewedInvoice!.issuedAt).getTime() + 7 * 24 * 60 * 60 * 1000,
      );
    });
  });

  describe('subscription renewal', () => {
    it('does not renew subscriptions with cancelAtPeriodEnd = true', async () => {
      await subscriptionsService.renewDueSubscriptions();

      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        interval: 'DAY',
        intervalCount: 1,
      });
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
        {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: true,
        },
      );

      const invoicesBefore = await listInvoicesForSubscription(
        adminClient,
        created.id,
      );

      await subscriptionsService.renewDueSubscriptions();

      const res = await adminClient
        .get(`/subscriptions/${created.id}`)
        .expect(200);
      const payload = res.body as SubscriptionResponse;
      const invoicesAfter = await listInvoicesForSubscription(
        adminClient,
        created.id,
      );

      expect(payload.currentPeriodStart).toBe(created.currentPeriodStart);
      expect(payload.currentPeriodEnd).toBe(created.currentPeriodEnd);
      expect(invoicesAfter).toHaveLength(invoicesBefore.length);
    });

    it('does not renew subscriptions whose currentPeriodEnd is still in the future', async () => {
      await subscriptionsService.renewDueSubscriptions();

      const customer = await createTestCustomer(adminClient);
      const product = await createTestProduct(adminClient);
      const plan = await createTestPlan(adminClient, product.id, {
        interval: 'DAY',
        intervalCount: 5,
      });
      const created = await createTestSubscription(
        adminClient,
        customer.id,
        plan.id,
        {
          startDate: new Date().toISOString(),
          cancelAtPeriodEnd: false,
        },
      );

      const invoicesBefore = await listInvoicesForSubscription(
        adminClient,
        created.id,
      );

      await subscriptionsService.renewDueSubscriptions();

      const res = await adminClient
        .get(`/subscriptions/${created.id}`)
        .expect(200);
      const payload = res.body as SubscriptionResponse;
      const invoicesAfter = await listInvoicesForSubscription(
        adminClient,
        created.id,
      );

      expect(payload.currentPeriodStart).toBe(created.currentPeriodStart);
      expect(payload.currentPeriodEnd).toBe(created.currentPeriodEnd);
      expect(invoicesAfter).toHaveLength(invoicesBefore.length);
    });

    it('renewDueSubscriptions renews only eligible subscriptions and returns the correct count', async () => {
      await subscriptionsService.renewDueSubscriptions();

      const renewableCustomer = await createTestCustomer(
        adminClient,
        'renewable_sub',
      );
      const renewableProduct = await createTestProduct(
        adminClient,
        'renewable_sub',
      );
      const renewablePlan = await createTestPlan(
        adminClient,
        renewableProduct.id,
        {
          interval: 'DAY',
          intervalCount: 1,
        },
      );

      const secondRenewableCustomer = await createTestCustomer(
        adminClient,
        'renewable_sub_2',
      );
      const secondRenewableProduct = await createTestProduct(
        adminClient,
        'renewable_sub_2',
      );
      const secondRenewablePlan = await createTestPlan(
        adminClient,
        secondRenewableProduct.id,
        {
          interval: 'DAY',
          intervalCount: 1,
        },
      );

      const cancelingCustomer = await createTestCustomer(
        adminClient,
        'non_renew_cancel',
      );
      const cancelingProduct = await createTestProduct(
        adminClient,
        'non_renew_cancel',
      );
      const cancelingPlan = await createTestPlan(
        adminClient,
        cancelingProduct.id,
        {
          interval: 'DAY',
          intervalCount: 1,
        },
      );

      const futureCustomer = await createTestCustomer(
        adminClient,
        'non_renew_future',
      );
      const futureProduct = await createTestProduct(
        adminClient,
        'non_renew_future',
      );
      const futurePlan = await createTestPlan(adminClient, futureProduct.id, {
        interval: 'DAY',
        intervalCount: 5,
      });

      const renewableOne = await createTestSubscription(
        adminClient,
        renewableCustomer.id,
        renewablePlan.id,
        {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: false,
        },
      );
      const renewableTwo = await createTestSubscription(
        adminClient,
        secondRenewableCustomer.id,
        secondRenewablePlan.id,
        {
          startDate: new Date(
            Date.now() - 4 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: false,
        },
      );
      const nonRenewCancelAtPeriodEnd = await createTestSubscription(
        adminClient,
        cancelingCustomer.id,
        cancelingPlan.id,
        {
          startDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: true,
        },
      );
      const nonRenewFuture = await createTestSubscription(
        adminClient,
        futureCustomer.id,
        futurePlan.id,
        {
          startDate: new Date().toISOString(),
          cancelAtPeriodEnd: false,
        },
      );

      const invoicesBeforeRenewableOne = await listInvoicesForSubscription(
        adminClient,
        renewableOne.id,
      );
      const invoicesBeforeRenewableTwo = await listInvoicesForSubscription(
        adminClient,
        renewableTwo.id,
      );
      const invoicesBeforeCancel = await listInvoicesForSubscription(
        adminClient,
        nonRenewCancelAtPeriodEnd.id,
      );
      const invoicesBeforeFuture = await listInvoicesForSubscription(
        adminClient,
        nonRenewFuture.id,
      );

      const renewedCount = await subscriptionsService.renewDueSubscriptions();

      const renewedOneRes = await adminClient
        .get(`/subscriptions/${renewableOne.id}`)
        .expect(200);
      const renewedTwoRes = await adminClient
        .get(`/subscriptions/${renewableTwo.id}`)
        .expect(200);
      const cancelRes = await adminClient
        .get(`/subscriptions/${nonRenewCancelAtPeriodEnd.id}`)
        .expect(200);
      const futureRes = await adminClient
        .get(`/subscriptions/${nonRenewFuture.id}`)
        .expect(200);

      const renewedOne = renewedOneRes.body as SubscriptionResponse;
      const renewedTwo = renewedTwoRes.body as SubscriptionResponse;
      const canceling = cancelRes.body as SubscriptionResponse;
      const future = futureRes.body as SubscriptionResponse;

      const invoicesAfterRenewableOne = await listInvoicesForSubscription(
        adminClient,
        renewableOne.id,
      );
      const invoicesAfterRenewableTwo = await listInvoicesForSubscription(
        adminClient,
        renewableTwo.id,
      );
      const invoicesAfterCancel = await listInvoicesForSubscription(
        adminClient,
        nonRenewCancelAtPeriodEnd.id,
      );
      const invoicesAfterFuture = await listInvoicesForSubscription(
        adminClient,
        nonRenewFuture.id,
      );

      expect(renewedCount).toBe(2);
      expect(renewedOne.status).toBe('ACTIVE');
      expect(renewedTwo.status).toBe('ACTIVE');
      expect(renewedOne.currentPeriodStart).toBe(renewableOne.currentPeriodEnd);
      expect(renewedTwo.currentPeriodStart).toBe(renewableTwo.currentPeriodEnd);
      expect(invoicesAfterRenewableOne).toHaveLength(
        invoicesBeforeRenewableOne.length + 1,
      );
      expect(invoicesAfterRenewableTwo).toHaveLength(
        invoicesBeforeRenewableTwo.length + 1,
      );
      expect(invoicesAfterCancel).toHaveLength(invoicesBeforeCancel.length);
      expect(invoicesAfterFuture).toHaveLength(invoicesBeforeFuture.length);
      expect(canceling.currentPeriodStart).toBe(
        nonRenewCancelAtPeriodEnd.currentPeriodStart,
      );
      expect(canceling.currentPeriodEnd).toBe(
        nonRenewCancelAtPeriodEnd.currentPeriodEnd,
      );
      expect(future.currentPeriodStart).toBe(nonRenewFuture.currentPeriodStart);
      expect(future.currentPeriodEnd).toBe(nonRenewFuture.currentPeriodEnd);
    });
  });
});
