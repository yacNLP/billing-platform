import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Payment, PaymentStatus } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const tenantId = this.tenantContext.getTenantId();

    this.logger.debug(
      `create payment tenantId=${tenantId} invoiceId=${dto.invoiceId} status=${dto.status}`,
    );

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: dto.invoiceId,
        tenantId,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id=${dto.invoiceId} not found`);
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        'Cannot create a payment for a void invoice',
      );
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(
        'Cannot create a payment for an already paid invoice',
      );
    }

    if (dto.amount !== invoice.amountDue) {
      throw new BadRequestException(
        'Payment amount must equal invoice amount due',
      );
    }

    if (dto.currency !== invoice.currency) {
      throw new BadRequestException(
        'Payment currency must match invoice currency',
      );
    }

    if (dto.status === PaymentStatus.SUCCESS) {
      const paidAt = new Date(dto.paidAt!);

      const [payment] = await this.prisma.$transaction([
        this.prisma.payment.create({
          data: {
            tenantId,
            invoiceId: invoice.id,
            status: dto.status,
            amount: dto.amount,
            currency: dto.currency,
            paidAt,
            provider: dto.provider,
            providerReference: dto.providerReference,
          },
        }),
        this.prisma.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            status: InvoiceStatus.PAID,
            amountPaid: invoice.amountDue,
            paidAt,
          },
        }),
      ]);

      this.logger.log(
        `created successful payment id=${payment.id} invoiceId=${invoice.id} tenantId=${tenantId}`,
      );

      return payment;
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        status: dto.status,
        amount: dto.amount,
        currency: dto.currency,
        failureReason: dto.failureReason,
        provider: dto.provider,
        providerReference: dto.providerReference,
      },
    });

    this.logger.log(
      `created failed payment id=${payment.id} invoiceId=${invoice.id} tenantId=${tenantId}`,
    );

    return payment;
  }
}
