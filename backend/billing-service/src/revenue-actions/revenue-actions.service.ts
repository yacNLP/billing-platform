import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
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

    if (
      (query.severity && query.severity !== RevenueActionSeverity.HIGH) ||
      (query.type && query.type !== RevenueActionType.OVERDUE_INVOICE)
    ) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      status: InvoiceStatus.OVERDUE,
      amountPaid: {
        lt: this.prisma.invoice.fields.amountDue,
      },
    };

    const [total, invoices] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      }),
    ]);

    const data = invoices.map(
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

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
