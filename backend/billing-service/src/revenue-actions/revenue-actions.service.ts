import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { Paginated } from '../common/dto/paginated.type';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { RevenueActionResponseDto } from './dto/revenue-action-response.dto';
import { RevenueActionsQueryDto } from './dto/revenue-actions-query.dto';
import { RevenueActionSeverity } from './revenue-action-severity.enum';
import { RevenueActionType } from './revenue-action-type.enum';

@Injectable()
export class RevenueActionsService {
  private static readonly OVERDUE_INVOICE_RULE = 'overdue-invoice';
  private static readonly PAST_DUE_SUBSCRIPTION_RULE = 'past-due-subscription';
  private static readonly FAILED_PAYMENT_RULE = 'failed-payment';

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async findAll(
    query: RevenueActionsQueryDto,
  ): Promise<Paginated<RevenueActionResponseDto>> {
    const tenantId = this.tenantContext.getTenantId();

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    if (query.severity === RevenueActionSeverity.LOW) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const actionGroups = await Promise.all([
      (query.type && query.type !== RevenueActionType.OVERDUE_INVOICE) ||
      (query.severity && query.severity !== RevenueActionSeverity.HIGH)
        ? Promise.resolve([])
        : this.buildOverdueInvoiceActions(tenantId),
      (query.type && query.type !== RevenueActionType.PAST_DUE_SUBSCRIPTION) ||
      (query.severity && query.severity !== RevenueActionSeverity.HIGH)
        ? Promise.resolve([])
        : this.buildPastDueSubscriptionActions(tenantId),
      (query.type && query.type !== RevenueActionType.FAILED_PAYMENT) ||
      (query.severity && query.severity !== RevenueActionSeverity.MEDIUM)
        ? Promise.resolve([])
        : this.buildFailedPaymentActions(tenantId),
    ]);

    const actions = actionGroups.flat();
    const total = actions.length;
    const skip = (page - 1) * pageSize;

    return {
      data: actions.slice(skip, skip + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private async buildOverdueInvoiceActions(
    tenantId: number,
  ): Promise<RevenueActionResponseDto[]> {
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      status: InvoiceStatus.OVERDUE,
      amountPaid: {
        lt: this.prisma.invoice.fields.amountDue,
      },
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        customerId: true,
        subscriptionId: true,
        invoiceNumber: true,
        amountDue: true,
        amountPaid: true,
        currency: true,
        dueAt: true,
      },
    });

    return invoices.map(
      (invoice): RevenueActionResponseDto => ({
        key: `${RevenueActionsService.OVERDUE_INVOICE_RULE}:invoice:${invoice.id}`,
        severity: RevenueActionSeverity.HIGH,
        type: RevenueActionType.OVERDUE_INVOICE,
        title: `Overdue invoice ${invoice.invoiceNumber}`,
        description: `${invoice.invoiceNumber} is overdue and still has an outstanding balance.`,
        entityType: 'invoice',
        entityId: invoice.id,
        amount: invoice.amountDue - invoice.amountPaid,
        currency: invoice.currency,
        suggestedAction: 'Review invoice and collect payment',
        createdFromRule: RevenueActionsService.OVERDUE_INVOICE_RULE,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          subscriptionId: invoice.subscriptionId,
          dueAt: invoice.dueAt.toISOString(),
        },
      }),
    );
  }

  private async buildPastDueSubscriptionActions(
    tenantId: number,
  ): Promise<RevenueActionResponseDto[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        tenantId,
        status: SubscriptionStatus.PAST_DUE,
      },
      orderBy: [{ currentPeriodEnd: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        customerId: true,
        planId: true,
        currentPeriodEnd: true,
      },
    });

    return subscriptions.map(
      (subscription): RevenueActionResponseDto => ({
        key: `${RevenueActionsService.PAST_DUE_SUBSCRIPTION_RULE}:subscription:${subscription.id}`,
        severity: RevenueActionSeverity.HIGH,
        type: RevenueActionType.PAST_DUE_SUBSCRIPTION,
        title: `Past due subscription #${subscription.id}`,
        description: `Subscription #${subscription.id} is past due and needs billing review.`,
        entityType: 'subscription',
        entityId: subscription.id,
        suggestedAction: 'Review subscription billing status',
        createdFromRule: RevenueActionsService.PAST_DUE_SUBSCRIPTION_RULE,
        metadata: {
          customerId: subscription.customerId,
          planId: subscription.planId,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        },
      }),
    );
  }

  private async buildFailedPaymentActions(
    tenantId: number,
  ): Promise<RevenueActionResponseDto[]> {
    const failedPayments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        status: PaymentStatus.FAILED,
        invoice: {
          tenantId,
          status: InvoiceStatus.ISSUED,
          amountPaid: {
            lt: this.prisma.invoice.fields.amountDue,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        invoiceId: true,
        createdAt: true,
        invoice: {
          select: {
            id: true,
            customerId: true,
            invoiceNumber: true,
            amountDue: true,
            amountPaid: true,
            currency: true,
            dueAt: true,
          },
        },
      },
    });

    const latestFailedPaymentInvoiceIds = new Set<number>();
    const actions: RevenueActionResponseDto[] = [];

    for (const payment of failedPayments) {
      if (latestFailedPaymentInvoiceIds.has(payment.invoiceId)) {
        continue;
      }

      latestFailedPaymentInvoiceIds.add(payment.invoiceId);

      actions.push({
        key: `${RevenueActionsService.FAILED_PAYMENT_RULE}:invoice:${payment.invoice.id}`,
        severity: RevenueActionSeverity.MEDIUM,
        type: RevenueActionType.FAILED_PAYMENT,
        title: `Failed payment for ${payment.invoice.invoiceNumber}`,
        description: `${payment.invoice.invoiceNumber} has a failed payment and still has an outstanding balance.`,
        entityType: 'invoice',
        entityId: payment.invoice.id,
        amount: payment.invoice.amountDue - payment.invoice.amountPaid,
        currency: payment.invoice.currency,
        suggestedAction: 'Review failed payment and follow up with customer',
        createdFromRule: RevenueActionsService.FAILED_PAYMENT_RULE,
        metadata: {
          invoiceId: payment.invoice.id,
          invoiceNumber: payment.invoice.invoiceNumber,
          latestFailedPaymentId: payment.id,
          failedAt: payment.createdAt.toISOString(),
          customerId: payment.invoice.customerId,
          dueAt: payment.invoice.dueAt.toISOString(),
        },
      });
    }

    return actions;
  }
}
