import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { InvoicesService } from '../invoices/invoices.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuditLogAction } from '../audit-logs/audit-log-action';
import { AuditLogEntityType } from '../audit-logs/audit-log-entity-type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@ApiTags('admin-jobs')
@ApiBearerAuth()
@Controller('admin/jobs')
export class AdminJobsController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @Roles(Role.ADMIN)
  @Post('mark-overdue-invoices')
  async markOverdueInvoices() {
    const summary = await this.invoicesService.runMarkOverdueInvoicesJob();
    await this.auditLogs.record({
      action: AuditLogAction.AdminJobRun,
      entityType: AuditLogEntityType.AdminJob,
      metadata: {
        job: 'mark-overdue-invoices',
        ...summary,
      },
    });
    return summary;
  }

  @Roles(Role.ADMIN)
  @Post('update-past-due-subscriptions')
  async updatePastDueSubscriptions() {
    const summary =
      await this.subscriptionsService.updatePastDueSubscriptions();
    await this.auditLogs.record({
      action: AuditLogAction.AdminJobRun,
      entityType: AuditLogEntityType.AdminJob,
      metadata: {
        job: 'update-past-due-subscriptions',
        ...summary,
      },
    });
    return summary;
  }

  @Roles(Role.ADMIN)
  @Post('renew-due-subscriptions')
  async renewDueSubscriptions() {
    const summary =
      await this.subscriptionsService.runRenewDueSubscriptionsJob();
    await this.auditLogs.record({
      action: AuditLogAction.AdminJobRun,
      entityType: AuditLogEntityType.AdminJob,
      metadata: {
        job: 'renew-due-subscriptions',
        ...summary,
      },
    });
    return summary;
  }

  @Roles(Role.ADMIN)
  @Post('generate-due-invoices')
  async generateDueInvoices() {
    const summary = await this.subscriptionsService.runGenerateDueInvoicesJob();
    await this.auditLogs.record({
      action: AuditLogAction.AdminJobRun,
      entityType: AuditLogEntityType.AdminJob,
      metadata: {
        job: 'generate-due-invoices',
        ...summary,
      },
    });
    return summary;
  }
}
