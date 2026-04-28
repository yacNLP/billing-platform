import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { InvoicesService } from '../invoices/invoices.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('admin-jobs')
@ApiBearerAuth()
@Controller('admin/jobs')
export class AdminJobsController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Roles(Role.ADMIN)
  @Post('mark-overdue-invoices')
  markOverdueInvoices() {
    return this.invoicesService.runMarkOverdueInvoicesJob();
  }

  @Roles(Role.ADMIN)
  @Post('update-past-due-subscriptions')
  updatePastDueSubscriptions() {
    return this.subscriptionsService.updatePastDueSubscriptions();
  }

  @Roles(Role.ADMIN)
  @Post('renew-due-subscriptions')
  renewDueSubscriptions() {
    return this.subscriptionsService.runRenewDueSubscriptionsJob();
  }

  @Roles(Role.ADMIN)
  @Post('generate-due-invoices')
  generateDueInvoices() {
    return this.subscriptionsService.runGenerateDueInvoicesJob();
  }
}
