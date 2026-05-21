import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Paginated } from '../common/dto/paginated.type';
import { errorMessage } from '../common/error.util';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { AuditLogAction } from './audit-log-action';
import { AuditLogEntityType } from './audit-log-entity-type';
import { AuditLogResponse } from './dto/audit-log-response.type';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';

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

  async findAll(
    query: AuditLogsQueryDto,
  ): Promise<Paginated<AuditLogResponse>> {
    const tenantId = this.tenantContext.getTenantId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId !== undefined ? { entityId: query.entityId } : {}),
    };

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data = logs.map(
      (log): AuditLogResponse => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        actorUserId: log.actorUserId,
        createdAt: log.createdAt,
      }),
    );

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
