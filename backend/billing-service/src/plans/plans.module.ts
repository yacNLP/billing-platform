import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { TenantModule } from 'src/common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
