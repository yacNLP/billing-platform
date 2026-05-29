import { Injectable } from '@nestjs/common';
import { TenantSettings } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import {
  OnboardingStatusResponse,
  OnboardingStep,
} from './dto/onboarding-status-response.type';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async getStatus(): Promise<OnboardingStatusResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const [
      settings,
      customersCount,
      productsCount,
      plansCount,
      subscriptionsCount,
      invoicesCount,
    ] = await this.prisma.$transaction([
      this.prisma.tenantSettings.findUnique({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.plan.count({ where: { tenantId } }),
      this.prisma.subscription.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId } }),
    ]);

    const steps: OnboardingStep[] = [
      {
        key: 'settings',
        label: 'Complete billing settings',
        completed: this.areSettingsComplete(settings),
        href: '/settings',
      },
      {
        key: 'customers',
        label: 'Create your first customer',
        completed: customersCount > 0,
        href: '/customers',
      },
      {
        key: 'products',
        label: 'Create your first product',
        completed: productsCount > 0,
        href: '/products',
      },
      {
        key: 'plans',
        label: 'Create your first plan',
        completed: plansCount > 0,
        href: '/plans',
      },
      {
        key: 'subscriptions',
        label: 'Create your first subscription',
        completed: subscriptionsCount > 0,
        href: '/subscriptions',
      },
      {
        key: 'invoices',
        label: 'Create your first invoice',
        completed: invoicesCount > 0,
        href: '/invoices',
      },
    ];

    const completedCount = steps.filter((step) => step.completed).length;

    return {
      steps,
      completedCount,
      totalCount: steps.length,
      isComplete: completedCount === steps.length,
    };
  }

  private areSettingsComplete(settings: TenantSettings | null): boolean {
    if (!settings) {
      return false;
    }

    return (
      [
        settings.companyName,
        settings.billingEmail,
        settings.addressLine1,
        settings.city,
        settings.postalCode,
        settings.country,
        settings.defaultCurrency,
      ].every((value) => value.trim().length > 0) && settings.paymentTerms >= 0
    );
  }
}
