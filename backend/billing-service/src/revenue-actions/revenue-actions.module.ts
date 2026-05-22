import { Module } from '@nestjs/common';
import { TenantModule } from '../common/tenant/tenant.module';
import { RevenueActionsController } from './revenue-actions.controller';
import { RevenueActionsService } from './revenue-actions.service';

@Module({
  imports: [TenantModule],
  controllers: [RevenueActionsController],
  providers: [RevenueActionsService],
})
export class RevenueActionsModule {}
