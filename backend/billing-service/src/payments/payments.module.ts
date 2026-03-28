import { Module } from '@nestjs/common';
import { TenantModule } from 'src/common/tenant/tenant.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TenantModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
