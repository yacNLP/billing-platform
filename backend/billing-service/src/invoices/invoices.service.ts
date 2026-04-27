import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Invoice, InvoiceStatus, Prisma } from '@prisma/client';
import { Paginated } from '../common/dto/paginated.type';
import { errorMessage } from '../common/error.util';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const tenantId = this.tenantContext.getTenantId();
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    const dueAt = new Date(dto.dueAt);
    const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : new Date();

    this.logger.debug(
      `create invoice tenantId=${tenantId} customerId=${dto.customerId} subscriptionId=${dto.subscriptionId}`,
    );

    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime()) ||
      Number.isNaN(dueAt.getTime()) ||
      Number.isNaN(issuedAt.getTime())
    ) {
      throw new BadRequestException(
        'Invalid periodStart, periodEnd, dueAt, or issuedAt',
      );
    }

    if (dto.amountDue <= 0) {
      throw new BadRequestException('amountDue must be greater than 0');
    }

    if (periodEnd <= periodStart) {
      throw new BadRequestException('periodEnd must be after periodStart');
    }

    if (dueAt < issuedAt) {
      throw new BadRequestException(
        'dueAt must be greater than or equal to issuedAt',
      );
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        tenantId,
      },
    });

    if (!customer) {
      throw new BadRequestException('Invalid customerId');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: dto.subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      throw new BadRequestException('Invalid subscriptionId');
    }

    if (subscription.customerId !== dto.customerId) {
      throw new BadRequestException(
        'subscription.customerId does not match customerId',
      );
    }

    const overlappingInvoice = await this.prisma.invoice.findFirst({
      where: {
        tenantId,
        subscriptionId: subscription.id,
        periodStart: {
          lt: periodEnd,
        },
        periodEnd: {
          gt: periodStart,
        },
      },
    });

    if (overlappingInvoice) {
      throw new ConflictException(
        'Invoice period overlaps an existing invoice for this subscription',
      );
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const invoiceNumber = await this.generateInvoiceNumber(tenantId, attempt);

      try {
        const created = await this.prisma.invoice.create({
          data: {
            tenantId,
            subscriptionId: subscription.id,
            customerId: customer.id,
            invoiceNumber,
            status: InvoiceStatus.ISSUED,
            currency: dto.currency ?? subscription.currencySnapshot,
            amountDue: dto.amountDue,
            amountPaid: 0,
            periodStart,
            periodEnd,
            issuedAt,
            dueAt,
          },
        });

        this.logger.log(
          `created invoice id=${created.id} invoiceNumber=${created.invoiceNumber} customerId=${created.customerId} subscriptionId=${created.subscriptionId} tenantId=${tenantId}`,
        );

        return created;
      } catch (e: unknown) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === 'P2002') {
            const target = Array.isArray(e.meta?.target) ? e.meta.target : [];

            if (
              target.includes('tenantId') &&
              target.includes('subscriptionId') &&
              target.includes('periodStart') &&
              target.includes('periodEnd')
            ) {
              throw new ConflictException(
                'Invoice already exists for this subscription period',
              );
            }

            this.logger.warn(
              `duplicate invoiceNumber=${invoiceNumber} tenantId=${tenantId}`,
            );

            if (attempt < 2) {
              continue;
            }

            throw new ConflictException('Invoice number already exists');
          }

          if (e.code === 'P2003') {
            throw new BadRequestException(
              'Invalid customerId or subscriptionId',
            );
          }
        }

        this.logger.error(
          `create invoice failed customerId=${dto.customerId} subscriptionId=${dto.subscriptionId}: ${errorMessage(e)}`,
        );
        throw e;
      }
    }

    throw new ConflictException('Invoice number already exists');
  }

  private async generateInvoiceNumber(
    tenantId: number,
    offset = 0,
  ): Promise<string> {
    const total = await this.prisma.invoice.count({
      where: {
        tenantId,
      },
    });

    return `INV-${tenantId}-${String(total + 1 + offset).padStart(6, '0')}`;
  }

  async findAll(query: InvoicesQueryDto): Promise<Paginated<Invoice>> {
    const tenantId = this.tenantContext.getTenantId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    this.logger.debug(
      `list invoices tenantId=${tenantId} page=${page} pageSize=${pageSize} status=${query.status ?? ''}`,
    );

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async findOne(id: number): Promise<Invoice> {
    const tenantId = this.tenantContext.getTenantId();

    this.logger.debug(`get invoice id=${id} tenantId=${tenantId}`);
    return this.findInvoiceOrThrow(id, tenantId);
  }

  async markAsPaid(id: number): Promise<Invoice> {
    const tenantId = this.tenantContext.getTenantId();

    this.logger.debug(`mark invoice as paid id=${id} tenantId=${tenantId}`);
    const invoice = await this.findInvoiceOrThrow(id, tenantId);

    if (
      invoice.status !== InvoiceStatus.ISSUED &&
      invoice.status !== InvoiceStatus.OVERDUE
    ) {
      throw new BadRequestException(
        'Only issued or overdue invoices can be marked as paid',
      );
    }

    const now = new Date();

    try {
      const updated = await this.prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: InvoiceStatus.PAID,
          amountPaid: invoice.amountDue,
          paidAt: now,
        },
      });

      this.logger.log(
        `marked invoice id=${updated.id} as paid tenantId=${tenantId}`,
      );

      return updated;
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        this.logger.warn(`Invoice with id=${id} not found`);
        throw new NotFoundException(`Invoice with id=${id} not found`);
      }

      this.logger.error(
        `mark invoice as paid failed id=${id}: ${errorMessage(e)}`,
      );
      throw e;
    }
  }

  async markAsVoid(id: number): Promise<Invoice> {
    const tenantId = this.tenantContext.getTenantId();

    this.logger.debug(`mark invoice as void id=${id} tenantId=${tenantId}`);
    const invoice = await this.findInvoiceOrThrow(id, tenantId);

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new BadRequestException('Only issued invoices can be voided');
    }

    const now = new Date();

    try {
      const updated = await this.prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: InvoiceStatus.VOID,
          amountPaid: 0,
          paidAt: null,
          voidedAt: now,
        },
      });

      this.logger.log(
        `marked invoice id=${updated.id} as void tenantId=${tenantId}`,
      );

      return updated;
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        this.logger.warn(`Invoice with id=${id} not found`);
        throw new NotFoundException(`Invoice with id=${id} not found`);
      }

      this.logger.error(
        `mark invoice as void failed id=${id}: ${errorMessage(e)}`,
      );
      throw e;
    }
  }

  async markAsOverdue(id: number): Promise<Invoice> {
    const tenantId = this.tenantContext.getTenantId();
    const now = new Date();

    this.logger.debug(`mark invoice as overdue id=${id} tenantId=${tenantId}`);
    const invoice = await this.findInvoiceOrThrow(id, tenantId);

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new BadRequestException(
        'Only issued invoices can be marked as overdue',
      );
    }

    if (invoice.dueAt >= now) {
      throw new BadRequestException(
        'Only past-due invoices can be marked as overdue',
      );
    }

    try {
      const updated = await this.prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: InvoiceStatus.OVERDUE,
        },
      });

      this.logger.log(
        `marked invoice id=${updated.id} as overdue tenantId=${tenantId}`,
      );

      return updated;
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        this.logger.warn(`Invoice with id=${id} not found`);
        throw new NotFoundException(`Invoice with id=${id} not found`);
      }

      this.logger.error(
        `mark invoice as overdue failed id=${id}: ${errorMessage(e)}`,
      );
      throw e;
    }
  }

  async markOverdueInvoices(): Promise<number> {
    const tenantId = this.tenantContext.getTenantId();
    const now = new Date();

    this.logger.debug(`mark overdue invoices tenantId=${tenantId}`);

    const result = await this.prisma.invoice.updateMany({
      where: {
        tenantId,
        status: InvoiceStatus.ISSUED,
        dueAt: {
          lt: now,
        },
      },
      data: {
        status: InvoiceStatus.OVERDUE,
      },
    });

    this.logger.log(
      `marked overdue invoices tenantId=${tenantId} updatedCount=${result.count}`,
    );

    return result.count;
  }

  private async findInvoiceOrThrow(
    id: number,
    tenantId: number,
  ): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id=${id} not found`);
    }

    return invoice;
  }
}
