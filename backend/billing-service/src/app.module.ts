import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { PlansModule } from './plans/plans.module';
import { TenantModule } from './common/tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminJobsModule } from './admin-jobs/admin-jobs.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { RevenueActionsModule } from './revenue-actions/revenue-actions.module';
import { TenantSettingsModule } from './tenant-settings/tenant-settings.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TeamModule } from './team/team.module';
import { DemoModule } from './demo/demo.module';

import { JwtAuthGuard } from './auth/jwt.guard';
import { TenantGuard } from './common/tenant/tenant.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    CustomersModule,
    ProductsModule,
    PlansModule,
    SubscriptionsModule,
    InvoicesModule,
    PaymentsModule,
    AdminJobsModule,
    AnalyticsModule,
    AuditLogsModule,
    RevenueActionsModule,
    TenantSettingsModule,
    OnboardingModule,
    TeamModule,
    DemoModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
