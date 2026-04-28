import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminJobsController } from './admin-jobs.controller';

@Module({
  imports: [InvoicesModule, SubscriptionsModule],
  controllers: [AdminJobsController],
})
export class AdminJobsModule {}
