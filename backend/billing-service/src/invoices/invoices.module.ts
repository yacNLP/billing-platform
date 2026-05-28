import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { TenantModule } from 'src/common/tenant/tenant.module';
import { TenantSettingsModule } from 'src/tenant-settings/tenant-settings.module';
import { InvoiceEmailService } from './invoice-email.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  imports: [TenantModule, TenantSettingsModule, EmailModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService, InvoiceEmailService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
