import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TenantModule } from '../common/tenant/tenant.module';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

@Module({
  imports: [TenantModule, AuditLogsModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
