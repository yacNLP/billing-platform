import { ConflictException, Injectable } from '@nestjs/common';
import {
  BillingInterval,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { AuditLogAction } from '../audit-logs/audit-log-action';
import { AuditLogEntityType } from '../audit-logs/audit-log-entity-type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { LoadSampleDataResponse } from './dto/load-sample-data-response.type';

const DEMO_COUNTS: LoadSampleDataResponse = {
  customers: 3,
  products: 2,
  plans: 3,
  subscriptions: 3,
  invoices: 3,
  payments: 2,
};

@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async loadSampleData(): Promise<LoadSampleDataResponse> {
    const tenantId = this.tenantContext.getTenantId();

    await this.ensureWorkspaceIsEmpty(tenantId);

    const summary = await this.prisma.$transaction(async (tx) => {
      await this.createSampleData(tx, tenantId);
      return DEMO_COUNTS;
    });

    await this.auditLogs.record({
      action: AuditLogAction.DemoSampleDataLoaded,
      entityType: AuditLogEntityType.Demo,
      metadata: summary,
    });

    return summary;
  }

  private async ensureWorkspaceIsEmpty(tenantId: number): Promise<void> {
    const [customers, products, plans, subscriptions, invoices, payments] =
      await Promise.all([
        this.prisma.customer.count({ where: { tenantId } }),
        this.prisma.product.count({ where: { tenantId } }),
        this.prisma.plan.count({ where: { tenantId } }),
        this.prisma.subscription.count({ where: { tenantId } }),
        this.prisma.invoice.count({ where: { tenantId } }),
        this.prisma.payment.count({ where: { tenantId } }),
      ]);

    const hasBusinessData =
      customers > 0 ||
      products > 0 ||
      plans > 0 ||
      subscriptions > 0 ||
      invoices > 0 ||
      payments > 0;

    if (hasBusinessData) {
      throw new ConflictException(
        'Sample data can only be loaded into an empty workspace',
      );
    }
  }

  private async createSampleData(
    tx: Prisma.TransactionClient,
    tenantId: number,
  ): Promise<void> {
    const now = new Date();
    const currentPeriodStart = addDays(now, -20);
    const currentPeriodEnd = addDays(now, 10);
    const pastPeriodStart = addDays(now, -45);
    const pastPeriodEnd = addDays(now, -15);

    const [acme, northstar, atlas] = await Promise.all([
      tx.customer.create({
        data: {
          tenantId,
          name: 'Acme Analytics',
          email: 'billing@acme-analytics.example',
        },
      }),
      tx.customer.create({
        data: {
          tenantId,
          name: 'Northstar Logistics',
          email: 'finance@northstar-logistics.example',
        },
      }),
      tx.customer.create({
        data: {
          tenantId,
          name: 'Atlas Studio',
          email: 'ops@atlas-studio.example',
        },
      }),
    ]);

    const [platformProduct, advisoryProduct] = await Promise.all([
      tx.product.create({
        data: {
          tenantId,
          name: 'RevenueOps Platform',
          description: 'Core subscription billing operations workspace.',
          isActive: true,
        },
      }),
      tx.product.create({
        data: {
          tenantId,
          name: 'Billing Advisory',
          description: 'Operational support for billing teams.',
          isActive: true,
        },
      }),
    ]);

    const [starterPlan, growthPlan, advisoryPlan] = await Promise.all([
      tx.plan.create({
        data: {
          tenantId,
          productId: platformProduct.id,
          code: 'DEMO_STARTER_MONTHLY',
          name: 'Starter Monthly',
          description: 'Entry plan for small revenue teams.',
          amount: 4900,
          currency: 'EUR',
          interval: BillingInterval.MONTH,
          intervalCount: 1,
          trialDays: 0,
          active: true,
        },
      }),
      tx.plan.create({
        data: {
          tenantId,
          productId: platformProduct.id,
          code: 'DEMO_GROWTH_MONTHLY',
          name: 'Growth Monthly',
          description: 'Advanced billing operations for growing teams.',
          amount: 12900,
          currency: 'EUR',
          interval: BillingInterval.MONTH,
          intervalCount: 1,
          trialDays: 0,
          active: true,
        },
      }),
      tx.plan.create({
        data: {
          tenantId,
          productId: advisoryProduct.id,
          code: 'DEMO_ADVISORY_MONTHLY',
          name: 'Advisory Monthly',
          description: 'Monthly billing operations advisory package.',
          amount: 24900,
          currency: 'EUR',
          interval: BillingInterval.MONTH,
          intervalCount: 1,
          trialDays: 0,
          active: true,
        },
      }),
    ]);

    const [paidSubscription, failedPaymentSubscription, pastDueSubscription] =
      await Promise.all([
        this.createSubscription(tx, {
          tenantId,
          customerId: acme.id,
          planId: growthPlan.id,
          status: SubscriptionStatus.ACTIVE,
          amountSnapshot: growthPlan.amount,
          currencySnapshot: growthPlan.currency,
          intervalSnapshot: growthPlan.interval,
          intervalCountSnapshot: growthPlan.intervalCount,
          startDate: currentPeriodStart,
          currentPeriodStart,
          currentPeriodEnd,
        }),
        this.createSubscription(tx, {
          tenantId,
          customerId: northstar.id,
          planId: starterPlan.id,
          status: SubscriptionStatus.ACTIVE,
          amountSnapshot: starterPlan.amount,
          currencySnapshot: starterPlan.currency,
          intervalSnapshot: starterPlan.interval,
          intervalCountSnapshot: starterPlan.intervalCount,
          startDate: currentPeriodStart,
          currentPeriodStart,
          currentPeriodEnd,
        }),
        this.createSubscription(tx, {
          tenantId,
          customerId: atlas.id,
          planId: advisoryPlan.id,
          status: SubscriptionStatus.PAST_DUE,
          amountSnapshot: advisoryPlan.amount,
          currencySnapshot: advisoryPlan.currency,
          intervalSnapshot: advisoryPlan.interval,
          intervalCountSnapshot: advisoryPlan.intervalCount,
          startDate: pastPeriodStart,
          currentPeriodStart: pastPeriodStart,
          currentPeriodEnd: pastPeriodEnd,
        }),
      ]);

    const [paidInvoice, issuedInvoice, overdueInvoice] = await Promise.all([
      tx.invoice.create({
        data: {
          tenantId,
          customerId: acme.id,
          subscriptionId: paidSubscription.id,
          invoiceNumber: `DEMO-${tenantId}-0001`,
          status: InvoiceStatus.PAID,
          amountDue: growthPlan.amount,
          amountPaid: growthPlan.amount,
          currency: growthPlan.currency,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          issuedAt: addDays(now, -18),
          dueAt: addDays(now, -11),
          paidAt: addDays(now, -10),
        },
      }),
      tx.invoice.create({
        data: {
          tenantId,
          customerId: northstar.id,
          subscriptionId: failedPaymentSubscription.id,
          invoiceNumber: `DEMO-${tenantId}-0002`,
          status: InvoiceStatus.ISSUED,
          amountDue: starterPlan.amount,
          amountPaid: 0,
          currency: starterPlan.currency,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          issuedAt: addDays(now, -5),
          dueAt: addDays(now, 5),
        },
      }),
      tx.invoice.create({
        data: {
          tenantId,
          customerId: atlas.id,
          subscriptionId: pastDueSubscription.id,
          invoiceNumber: `DEMO-${tenantId}-0003`,
          status: InvoiceStatus.OVERDUE,
          amountDue: advisoryPlan.amount,
          amountPaid: 0,
          currency: advisoryPlan.currency,
          periodStart: pastPeriodStart,
          periodEnd: pastPeriodEnd,
          issuedAt: addDays(now, -35),
          dueAt: addDays(now, -25),
        },
      }),
    ]);

    await Promise.all([
      tx.payment.create({
        data: {
          tenantId,
          invoiceId: paidInvoice.id,
          status: PaymentStatus.SUCCESS,
          amount: paidInvoice.amountDue,
          currency: paidInvoice.currency,
          paidAt: paidInvoice.paidAt,
          provider: 'demo-gateway',
          providerReference: `demo-success-${paidInvoice.id}`,
        },
      }),
      tx.payment.create({
        data: {
          tenantId,
          invoiceId: issuedInvoice.id,
          status: PaymentStatus.FAILED,
          amount: issuedInvoice.amountDue,
          currency: issuedInvoice.currency,
          failureReason: 'Card declined in sample scenario',
          provider: 'demo-gateway',
          providerReference: `demo-failed-${issuedInvoice.id}`,
        },
      }),
    ]);

    // Keep the variable used to make the intent of the overdue scenario explicit.
    void overdueInvoice;
  }

  private createSubscription(
    tx: Prisma.TransactionClient,
    data: Prisma.SubscriptionUncheckedCreateInput,
  ) {
    return tx.subscription.create({ data });
  }
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}
