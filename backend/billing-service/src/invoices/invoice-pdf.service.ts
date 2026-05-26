import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantSettings } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';

export type GeneratedInvoicePdf = {
  buffer: Buffer;
  filename: string;
};

type InvoicePdfData = Awaited<ReturnType<InvoicePdfService['loadInvoiceData']>>;

@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly tenantSettingsService: TenantSettingsService,
  ) {}

  async generateInvoicePdf(invoiceId: number): Promise<GeneratedInvoicePdf> {
    const data = await this.loadInvoiceData(invoiceId);
    const buffer = await this.renderPdf(data);

    return {
      buffer,
      filename: `${this.safeFilename(data.invoice.invoiceNumber)}.pdf`,
    };
  }

  private async loadInvoiceData(invoiceId: number) {
    const tenantId = this.tenantContext.getTenantId();

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        customer: true,
        subscription: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id=${invoiceId} not found`);
    }

    const tenantSettings =
      await this.tenantSettingsService.getCurrentTenantSettingsEntity();

    return {
      invoice,
      tenantSettings,
    };
  }

  private renderPdf(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.writeDocument(doc, data);
      doc.end();
    });
  }

  private writeDocument(doc: PDFKit.PDFDocument, data: InvoicePdfData) {
    const { invoice, tenantSettings } = data;
    const remainingAmount = Math.max(
      0,
      Number(invoice.amountDue) - Number(invoice.amountPaid),
    );

    this.writeHeader(doc, tenantSettings, invoice.invoiceNumber);

    doc.moveDown(1.5);
    this.writeKeyValueRow(doc, 'Status', invoice.status);
    this.writeKeyValueRow(doc, 'Issued', this.formatDate(invoice.issuedAt));
    this.writeKeyValueRow(doc, 'Due', this.formatDate(invoice.dueAt));
    this.writeKeyValueRow(
      doc,
      'Payment terms',
      `${tenantSettings.paymentTerms} days`,
    );

    doc.moveDown(1.5);
    this.writeSectionTitle(doc, 'Bill to');
    doc.font('Helvetica-Bold').fontSize(11).text(invoice.customer.name);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(invoice.customer.email);
    doc.fillColor('#0f172a');

    doc.moveDown(1.5);
    this.writeSectionTitle(doc, 'Billing period');
    this.writeKeyValueRow(
      doc,
      'Period start',
      this.formatDate(invoice.periodStart),
    );
    this.writeKeyValueRow(
      doc,
      'Period end',
      this.formatDate(invoice.periodEnd),
    );

    doc.moveDown(1.5);
    this.writeSectionTitle(doc, 'Amount summary');
    this.writeAmountRow(
      doc,
      'Amount due',
      Number(invoice.amountDue),
      invoice.currency,
    );
    this.writeAmountRow(
      doc,
      'Amount paid',
      Number(invoice.amountPaid),
      invoice.currency,
    );
    this.writeAmountRow(
      doc,
      'Remaining amount',
      remainingAmount,
      invoice.currency,
      true,
    );

    if (invoice.payments.length > 0) {
      doc.moveDown(1.5);
      this.writeSectionTitle(doc, 'Payments');
      invoice.payments.slice(0, 5).forEach((payment) => {
        const paidAt = payment.paidAt
          ? this.formatDate(payment.paidAt)
          : 'Not paid';
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#475569')
          .text(
            `${payment.status} · ${this.formatMoney(Number(payment.amount), payment.currency)} · ${payment.provider} · ${paidAt}`,
          );
      });
      doc.fillColor('#0f172a');
    }

    if (tenantSettings.invoiceFooter) {
      doc.moveDown(2);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#64748b')
        .text(tenantSettings.invoiceFooter, { align: 'center' });
    }
  }

  private writeHeader(
    doc: PDFKit.PDFDocument,
    tenantSettings: TenantSettings,
    invoiceNumber: string,
  ) {
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor('#0f172a')
      .text('Invoice');
    doc.font('Helvetica').fontSize(11).fillColor('#475569').text(invoiceNumber);

    doc.moveUp(2);
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#0f172a')
      .text(tenantSettings.companyName, { align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#475569');

    [
      tenantSettings.billingEmail,
      tenantSettings.phone,
      tenantSettings.addressLine1,
      tenantSettings.addressLine2,
      [tenantSettings.postalCode, tenantSettings.city]
        .filter(Boolean)
        .join(' '),
      tenantSettings.country,
      tenantSettings.vatNumber,
      tenantSettings.taxId,
    ]
      .filter(Boolean)
      .forEach((line) => doc.text(String(line), { align: 'right' }));

    doc.moveDown(2);
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .moveTo(48, doc.y)
      .lineTo(547, doc.y)
      .stroke();
    doc.fillColor('#0f172a');
  }

  private writeSectionTitle(doc: PDFKit.PDFDocument, title: string) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title);
    doc.moveDown(0.4);
  }

  private writeKeyValueRow(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
  ) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#64748b')
      .text(label, { continued: true });
    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(`  ${value}`, { align: 'right' });
  }

  private writeAmountRow(
    doc: PDFKit.PDFDocument,
    label: string,
    amount: number,
    currency: string,
    highlight = false,
  ) {
    doc
      .font(highlight ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(highlight ? 12 : 10);
    doc
      .fillColor(highlight ? '#0f172a' : '#64748b')
      .text(label, { continued: true });
    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(`  ${this.formatMoney(amount, currency)}`, { align: 'right' });
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private formatMoney(cents: number, currency: string): string {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }

  private safeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
