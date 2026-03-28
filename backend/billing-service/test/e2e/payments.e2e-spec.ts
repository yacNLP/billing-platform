import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import type { BillingInterval } from '@prisma/client';

import { createE2eApp, TestApp } from '../utils/e2e-app';
import { E2EClient } from '../utils/e2e-client';
import { loginAsAdmin } from '../utils/e2e-auth';

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
  customerId: number;
  planId: number;
  status: string;
  amountSnapshot: number;
  currencySnapshot: string;
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

interface PaymentResponse {
  id: number;
  tenantId: number;
  invoiceId: number;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
  paidAt: string | null;
  failureReason: string | null;
  provider: string | null;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaymentFixture {
  customer: CustomerResponse;
  product: ProductResponse;
  plan: PlanResponse;
  subscription: SubscriptionResponse;
  invoice: InvoiceResponse;
}

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

function expectIsoDate(value: string | null, expected: string): void {
  expect(value).not.toBeNull();
  expect(new Date(value!).toISOString()).toBe(new Date(expected).toISOString());
}

async function createTestCustomer(
  client: E2EClient,
): Promise<CustomerResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/customers', {
      name: `Payment Customer ${suffix}`,
      email: `payment_customer_${suffix}@example.com`,
    })
    .expect(201);

  return res.body as CustomerResponse;
}

async function createTestProduct(client: E2EClient): Promise<ProductResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/products', {
      name: `Payment Product ${suffix}`,
      sku: `PAYMENT_PRODUCT_${suffix}`,
      priceCents: 2500,
      stock: 50,
      isActive: true,
    })
    .expect(201);

  return res.body as ProductResponse;
}

async function createTestPlan(
  client: E2EClient,
  productId: number,
): Promise<PlanResponse> {
  const suffix = uniqueSuffix();
  const res = await client
    .post('/plans', {
      code: `PAYMENT_PLAN_${suffix}`,
      name: `Payment Plan ${suffix}`,
      description: 'Payment test plan',
      amount: 4900,
      currency: 'EUR',
      interval: 'MONTH',
      intervalCount: 1,
      trialDays: 0,
      active: true,
      productId,
    })
    .expect(201);

  return res.body as PlanResponse;
}

async function createTestSubscription(
  client: E2EClient,
  customerId: number,
  planId: number,
): Promise<SubscriptionResponse> {
  const res = await client
    .post('/subscriptions', {
      customerId,
      planId,
    })
    .expect(201);

  return res.body as SubscriptionResponse;
}

async function createTestInvoice(
  client: E2EClient,
  customerId: number,
  subscriptionId: number,
  overrides: Partial<{
    amountDue: number;
    currency: string;
  }> = {},
): Promise<InvoiceResponse> {
  const periodStart = new Date('2026-01-01T00:00:00.000Z');
  const periodEnd = new Date('2026-02-01T00:00:00.000Z');
  const issuedAt = new Date('2026-01-01T00:00:00.000Z');
  const dueAt = new Date('2026-01-10T00:00:00.000Z');

  const res = await client
    .post('/invoices', {
      customerId,
      subscriptionId,
      amountDue: 4900,
      currency: 'EUR',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      ...overrides,
    })
    .expect(201);

  return res.body as InvoiceResponse;
}

async function createPaymentFixture(
  client: E2EClient,
): Promise<PaymentFixture> {
  const customer = await createTestCustomer(client);
  const product = await createTestProduct(client);
  const plan = await createTestPlan(client, product.id);
  const subscription = await createTestSubscription(
    client,
    customer.id,
    plan.id,
  );
  const invoice = await createTestInvoice(client, customer.id, subscription.id);

  return {
    customer,
    product,
    plan,
    subscription,
    invoice,
  };
}

describe('Payments e2e', () => {
  let app: INestApplication;
  let server: Server;
  let adminClient: E2EClient;

  beforeAll(async () => {
    const testApp: TestApp = await createE2eApp();
    app = testApp.app;
    server = testApp.server;

    adminClient = new E2EClient(server);

    await loginAsAdmin(adminClient);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create payment', () => {
    it('creates a SUCCESS payment on an ISSUED invoice and marks the invoice as PAID', async () => {
      const { invoice } = await createPaymentFixture(adminClient);
      const paidAt = '2026-01-05T12:00:00.000Z';

      const res = await adminClient
        .post('/payments', {
          invoiceId: invoice.id,
          amount: invoice.amountDue,
          currency: invoice.currency,
          status: 'SUCCESS',
          paidAt,
          provider: 'stripe',
          providerReference: `pay_success_${uniqueSuffix()}`,
        })
        .expect(201);

      const payment = res.body as PaymentResponse;

      expect(payment.id).toBeDefined();
      expect(payment.invoiceId).toBe(invoice.id);
      expect(payment.status).toBe('SUCCESS');
      expect(payment.amount).toBe(invoice.amountDue);
      expect(payment.currency).toBe(invoice.currency);
      expectIsoDate(payment.paidAt, paidAt);

      const invoiceRes = await adminClient
        .get(`/invoices/${invoice.id}`)
        .expect(200);
      const updatedInvoice = invoiceRes.body as InvoiceResponse;

      expect(updatedInvoice.status).toBe('PAID');
      expect(updatedInvoice.amountPaid).toBe(invoice.amountDue);
      expectIsoDate(updatedInvoice.paidAt, paidAt);
    });

    it('creates a FAILED payment on an ISSUED invoice and keeps the invoice as ISSUED', async () => {
      const { invoice } = await createPaymentFixture(adminClient);

      const res = await adminClient
        .post('/payments', {
          invoiceId: invoice.id,
          amount: invoice.amountDue,
          currency: invoice.currency,
          status: 'FAILED',
          failureReason: 'card_declined',
          provider: 'stripe',
          providerReference: `pay_failed_${uniqueSuffix()}`,
        })
        .expect(201);

      const payment = res.body as PaymentResponse;

      expect(payment.id).toBeDefined();
      expect(payment.invoiceId).toBe(invoice.id);
      expect(payment.status).toBe('FAILED');
      expect(payment.amount).toBe(invoice.amountDue);
      expect(payment.currency).toBe(invoice.currency);
      expect(payment.failureReason).toBe('card_declined');
      expect(payment.paidAt).toBeNull();

      const invoiceRes = await adminClient
        .get(`/invoices/${invoice.id}`)
        .expect(200);
      const updatedInvoice = invoiceRes.body as InvoiceResponse;

      expect(updatedInvoice.status).toBe('ISSUED');
      expect(updatedInvoice.amountPaid).toBe(0);
      expect(updatedInvoice.paidAt).toBeNull();
    });

    it('rejects creation on a VOID invoice', async () => {
      const { invoice } = await createPaymentFixture(adminClient);

      await adminClient.patch(`/invoices/${invoice.id}/void`).expect(200);

      await adminClient
        .post('/payments', {
          invoiceId: invoice.id,
          amount: invoice.amountDue,
          currency: invoice.currency,
          status: 'FAILED',
          failureReason: 'void_invoice',
          provider: 'stripe',
          providerReference: `pay_void_${uniqueSuffix()}`,
        })
        .expect(400);
    });

    it('rejects creation on an already PAID invoice', async () => {
      const { invoice } = await createPaymentFixture(adminClient);

      await adminClient.patch(`/invoices/${invoice.id}/paid`).expect(200);

      await adminClient
        .post('/payments', {
          invoiceId: invoice.id,
          amount: invoice.amountDue,
          currency: invoice.currency,
          status: 'FAILED',
          failureReason: 'already_paid',
          provider: 'stripe',
          providerReference: `pay_paid_${uniqueSuffix()}`,
        })
        .expect(400);
    });

    it('rejects creation when amount does not match invoice amount due', async () => {
      const { invoice } = await createPaymentFixture(adminClient);

      await adminClient
        .post('/payments', {
          invoiceId: invoice.id,
          amount: invoice.amountDue - 100,
          currency: invoice.currency,
          status: 'FAILED',
          failureReason: 'bad_amount',
          provider: 'stripe',
          providerReference: `pay_amount_${uniqueSuffix()}`,
        })
        .expect(400);

      const invoiceRes = await adminClient
        .get(`/invoices/${invoice.id}`)
        .expect(200);
      const updatedInvoice = invoiceRes.body as InvoiceResponse;

      expect(updatedInvoice.status).toBe('ISSUED');
      expect(updatedInvoice.amountPaid).toBe(0);
    });

    it('rejects creation when currency does not match invoice currency', async () => {
      const { invoice } = await createPaymentFixture(adminClient);

      await adminClient
        .post('/payments', {
          invoiceId: invoice.id,
          amount: invoice.amountDue,
          currency: 'USD',
          status: 'FAILED',
          failureReason: 'bad_currency',
          provider: 'stripe',
          providerReference: `pay_currency_${uniqueSuffix()}`,
        })
        .expect(400);

      const invoiceRes = await adminClient
        .get(`/invoices/${invoice.id}`)
        .expect(200);
      const updatedInvoice = invoiceRes.body as InvoiceResponse;

      expect(updatedInvoice.status).toBe('ISSUED');
      expect(updatedInvoice.amountPaid).toBe(0);
    });
  });
});
