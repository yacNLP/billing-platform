import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Invoice, InvoiceStatus, Prisma } from '@prisma/client';
import { Paginated } from '../common/dto/paginated.type';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const tenantId = this.tenantContext.getTenantId();

    await this.ensureTenantCustomer(dto.customerId, tenantId);

    if (dto.subscriptionId != null) {
      await this.ensureTenantSubscription(
        dto.subscriptionId,
        tenantId,
        dto.customerId,
      );
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (periodEnd <= periodStart) {
      throw new BadRequestException('periodEnd must be after periodStart');
    }

    const taxCents = dto.taxCents ?? 0;
    const totalCents = dto.subtotalCents + taxCents;

    try {
      return await this.prisma.invoice.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          subscriptionId: dto.subscriptionId,
          invoiceNumber: `INV-${tenantId}-${Date.now()}`,
          status: InvoiceStatus.DRAFT,
          currency: dto.currency,
          subtotalCents: dto.subtotalCents,
          taxCents,
          totalCents,
          dueDate: new Date(dto.dueDate),
          periodStart,
          periodEnd,
          notes: dto.notes,
          issuedAt: null,
          paidAt: null,
          voidedAt: null,
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: InvoicesQueryDto): Promise<Paginated<Invoice>> {
    const tenantId = this.tenantContext.getTenantId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number): Promise<Invoice> {
    const tenantId = this.tenantContext.getTenantId();
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id=${id} not found`);
    }

    return invoice;
  }

  async finalize(id: number): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be finalized');
    }

    return this.updateStatus(invoice.id, InvoiceStatus.OPEN, {
      issuedAt: new Date(),
    });
  }

  async markPaid(id: number): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new BadRequestException('Only OPEN invoices can be marked paid');
    }

    return this.updateStatus(invoice.id, InvoiceStatus.PAID, {
      paidAt: new Date(),
    });
  }

  async void(id: number): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('PAID invoices cannot be voided');
    }

    if (
      invoice.status !== InvoiceStatus.DRAFT &&
      invoice.status !== InvoiceStatus.OPEN
    ) {
      throw new BadRequestException(
        'Only DRAFT or OPEN invoices can be voided',
      );
    }

    return this.updateStatus(invoice.id, InvoiceStatus.VOID, {
      voidedAt: new Date(),
    });
  }

  private async updateStatus(
    id: number,
    status: InvoiceStatus,
    extra: Prisma.InvoiceUpdateInput,
  ): Promise<Invoice> {
    const tenantId = this.tenantContext.getTenantId();

    try {
      return await this.prisma.invoice.update({
        where: { id, tenantId },
        data: {
          status,
          ...extra,
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  private async ensureTenantCustomer(
    customerId: number,
    tenantId: number,
  ): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new BadRequestException('Invalid customerId for tenant');
    }
  }

  private async ensureTenantSubscription(
    subscriptionId: number,
    tenantId: number,
    customerId: number,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
    });

    if (!subscription) {
      throw new BadRequestException('Invalid subscriptionId for tenant');
    }

    if (subscription.customerId !== customerId) {
      throw new BadRequestException(
        'subscription.customerId must match customerId',
      );
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Invoice already exists');
      }

      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid relational reference');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Invoice not found');
      }
    }

    throw error;
  }
}
