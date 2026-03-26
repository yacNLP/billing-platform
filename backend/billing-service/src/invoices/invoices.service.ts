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
