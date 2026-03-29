import { Injectable, Logger } from '@nestjs/common';
import {
  BillingInterval,
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { AnalyticsSummaryDto } from './dto/analytics-summary.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async getSummary(): Promise<AnalyticsSummaryDto> {
    const tenantId = this.tenantContext.getTenantId();
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    this.logger.debug(`get analytics summary tenantId=${tenantId}`);

    const [
      totalCustomers,
      activeSubscriptions,
      overdueInvoicesCount,
      overdueAmounts,
      successfulPaymentsCount,
      failedPaymentsCount,
      paidInvoicesThisMonth,
      activeSubscriptionSnapshots,
    ] = await this.prisma.$transaction([
      this.prisma.customer.count({
        where: { tenantId },
      }),
      this.prisma.subscription.count({
        where: {
          tenantId,
          status: SubscriptionStatus.ACTIVE,
        },
      }),
      this.prisma.invoice.count({
        where: {
          tenantId,
          status: InvoiceStatus.OVERDUE,
        },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: InvoiceStatus.OVERDUE,
        },
        _sum: {
          amountDue: true,
          amountPaid: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          tenantId,
          status: PaymentStatus.SUCCESS,
        },
      }),
      this.prisma.payment.count({
        where: {
          tenantId,
          status: PaymentStatus.FAILED,
        },
      }),
      this.prisma.invoice.count({
        where: {
          tenantId,
          status: InvoiceStatus.PAID,
          paidAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      this.prisma.subscription.findMany({
        where: {
          tenantId,
          status: SubscriptionStatus.ACTIVE,
        },
        select: {
          amountSnapshot: true,
          intervalSnapshot: true,
          intervalCountSnapshot: true,
        },
      }),
    ]);

    const overdueAmount = Math.max(
      0,
      (overdueAmounts._sum.amountDue ?? 0) -
        (overdueAmounts._sum.amountPaid ?? 0),
    );

    const mrr = Math.round(
      activeSubscriptionSnapshots.reduce((sum, subscription) => {
        return (
          sum +
          this.toMonthlyRecurringRevenue(
            subscription.amountSnapshot,
            subscription.intervalSnapshot,
            subscription.intervalCountSnapshot,
          )
        );
      }, 0),
    );

    return {
      totalCustomers,
      activeSubscriptions,
      overdueInvoicesCount,
      overdueAmount,
      successfulPaymentsCount,
      failedPaymentsCount,
      mrr,
      paidInvoicesThisMonth,
    };
  }

  private toMonthlyRecurringRevenue(
    amount: number,
    interval: BillingInterval,
    intervalCount: number,
  ): number {
    const safeIntervalCount = Math.max(intervalCount, 1);

    switch (interval) {
      case BillingInterval.DAY:
        return (amount * (365 / 12)) / safeIntervalCount;
      case BillingInterval.WEEK:
        return (amount * (52 / 12)) / safeIntervalCount;
      case BillingInterval.MONTH:
        return amount / safeIntervalCount;
      case BillingInterval.YEAR:
        return amount / (12 * safeIntervalCount);
      default:
        return 0;
    }
  }
}
