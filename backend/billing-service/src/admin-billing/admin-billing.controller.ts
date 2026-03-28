import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { InvoicesService } from '../invoices/invoices.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('admin-billing')
@ApiBearerAuth()
@Controller('admin/billing')
export class AdminBillingController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Roles(Role.ADMIN)
  @Post('run-overdue')
  async runOverdue() {
    const updatedCount = await this.invoicesService.markOverdueInvoices();

    return {
      action: 'run-overdue',
      updatedCount,
    };
  }

  @Roles(Role.ADMIN)
  @Post('run-renewal')
  async runRenewal() {
    const renewedCount =
      await this.subscriptionsService.renewDueSubscriptions();

    return {
      action: 'run-renewal',
      renewedCount,
    };
  }
}
