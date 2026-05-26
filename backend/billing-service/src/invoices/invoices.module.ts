import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { TenantModule } from 'src/common/tenant/tenant.module';
import { TenantSettingsModule } from 'src/tenant-settings/tenant-settings.module';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  imports: [TenantModule, TenantSettingsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
