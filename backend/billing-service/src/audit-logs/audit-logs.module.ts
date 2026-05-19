import { Global, Module } from '@nestjs/common';
import { TenantModule } from '../common/tenant/tenant.module';
import { AuditLogsService } from './audit-logs.service';

@Global()
@Module({
  imports: [TenantModule],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
