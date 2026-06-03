import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogAction } from '../audit-logs/audit-log-action';
import { AuditLogEntityType } from '../audit-logs/audit-log-entity-type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { EmailService } from '../email/email.service';
import { EmailProvider } from '../email/email.types';
import { PrismaService } from '../prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { InvoicePdfService } from './invoice-pdf.service';

export type SendInvoiceEmailResult = {
  sent: boolean;
  provider: EmailProvider;
  recipient: string;
};

@Injectable()
export class InvoiceEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly emailService: EmailService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly tenantSettingsService: TenantSettingsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async sendInvoiceEmail(invoiceId: number): Promise<SendInvoiceEmailResult> {
    const tenantId = this.tenantContext.getTenantId();
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id=${invoiceId} not found`);
    }

    const [pdf, tenantSettings] = await Promise.all([
      this.invoicePdfService.generateInvoicePdf(invoice.id),
      this.tenantSettingsService.getCurrentTenantSettingsEntity(),
    ]);

    const emailResult = await this.emailService.sendEmail({
      to: invoice.customer.email,
      from: tenantSettings.billingEmail,
      subject: `Invoice ${invoice.invoiceNumber}`,
      text: this.buildTextBody(
        invoice.invoiceNumber,
        tenantSettings.companyName,
      ),
      html: this.buildHtmlBody(
        invoice.invoiceNumber,
        tenantSettings.companyName,
      ),
      attachments: [
        {
          filename: pdf.filename,
          contentType: 'application/pdf',
          content: pdf.buffer,
        },
      ],
    });

    await this.auditLogs.record({
      action: AuditLogAction.InvoiceEmailSent,
      entityType: AuditLogEntityType.Invoice,
      entityId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        recipient: invoice.customer.email,
        provider: emailResult.provider,
        messageId: emailResult.messageId,
      },
    });

    return {
      sent: emailResult.sent,
      provider: emailResult.provider,
      recipient: invoice.customer.email,
    };
  }

  private buildTextBody(invoiceNumber: string, companyName: string): string {
    return `Hello,\n\nPlease find invoice ${invoiceNumber} from ${companyName} attached.\n\nThank you.`;
  }

  private buildHtmlBody(invoiceNumber: string, companyName: string): string {
    return `<p>Hello,</p><p>Please find invoice <strong>${invoiceNumber}</strong> from ${companyName} attached.</p><p>Thank you.</p>`;
  }
}
