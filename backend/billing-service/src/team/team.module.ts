import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TenantModule } from '../common/tenant/tenant.module';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [TenantModule, AuditLogsModule],
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
