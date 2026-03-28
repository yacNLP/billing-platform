import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminBillingController } from './admin-billing.controller';

@Module({
  imports: [InvoicesModule, SubscriptionsModule],
  controllers: [AdminBillingController],
})
export class AdminBillingModule {}
