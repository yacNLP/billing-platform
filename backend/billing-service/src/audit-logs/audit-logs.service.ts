import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { errorMessage } from '../common/error.util';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { AuditLogAction } from './audit-log-action';
import { AuditLogEntityType } from './audit-log-entity-type';

type RecordAuditLogParams = {
  action: AuditLogAction;
  entityType: AuditLogEntityType;
  entityId?: number;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async record(params: RecordAuditLogParams): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    const actorUserId = this.tenantContext.getActorUserId();

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: params.metadata ?? Prisma.JsonNull,
        },
      });
    } catch (e: unknown) {
      this.logger.error(
        `failed to write audit log action=${params.action} tenantId=${tenantId} actorUserId=${actorUserId}: ${errorMessage(e)}`,
      );
    }
  }
}
