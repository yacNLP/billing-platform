import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma, SubscriptionStatus } from '@prisma/client';
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

    if (query.severity && query.severity !== RevenueActionSeverity.HIGH) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const actionGroups = await Promise.all([
      query.type && query.type !== RevenueActionType.OVERDUE_INVOICE
        ? Promise.resolve([])
        : this.buildOverdueInvoiceActions(tenantId),
      query.type && query.type !== RevenueActionType.PAST_DUE_SUBSCRIPTION
        ? Promise.resolve([])
        : this.buildPastDueSubscriptionActions(tenantId),
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
}
