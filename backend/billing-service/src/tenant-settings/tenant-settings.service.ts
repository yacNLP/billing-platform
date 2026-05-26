import { Injectable } from '@nestjs/common';
import { TenantSettings } from '@prisma/client';
import { AuditLogAction } from '../audit-logs/audit-log-action';
import { AuditLogEntityType } from '../audit-logs/audit-log-entity-type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { TenantSettingsResponseDto } from './dto/tenant-settings-response.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

@Injectable()
export class TenantSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findCurrentTenantSettings(): Promise<TenantSettingsResponseDto> {
    const settings = await this.getCurrentTenantSettingsEntity();

    return this.toResponse(settings);
  }

  async getCurrentTenantSettingsEntity(): Promise<TenantSettings> {
    const tenantId = this.tenantContext.getTenantId();

    return this.getOrCreateDefaultSettings(tenantId);
  }

  async upsertCurrentTenantSettings(
    dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsResponseDto> {
    const tenantId = this.tenantContext.getTenantId();

    const settings = await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...dto,
      },
      update: dto,
    });

    await this.auditLogs.record({
      action: AuditLogAction.TenantSettingsUpdated,
      entityType: AuditLogEntityType.TenantSettings,
      entityId: settings.id,
      metadata: {
        changedFields: Object.keys(dto),
      },
    });

    return this.toResponse(settings);
  }

  private async getOrCreateDefaultSettings(
    tenantId: number,
  ): Promise<TenantSettings> {
    const existingSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (existingSettings) {
      return existingSettings;
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true },
    });

    return this.prisma.tenantSettings.create({
      data: {
        tenantId,
        companyName: tenant.name,
        billingEmail: 'billing@example.com',
        addressLine1: '',
        city: '',
        postalCode: '',
        country: '',
        defaultCurrency: 'EUR',
        paymentTerms: 30,
      },
    });
  }

  private toResponse(settings: TenantSettings): TenantSettingsResponseDto {
    return {
      id: settings.id,
      companyName: settings.companyName,
      logoUrl: settings.logoUrl,
      billingEmail: settings.billingEmail,
      phone: settings.phone,
      addressLine1: settings.addressLine1,
      addressLine2: settings.addressLine2,
      city: settings.city,
      postalCode: settings.postalCode,
      country: settings.country,
      taxId: settings.taxId,
      vatNumber: settings.vatNumber,
      defaultCurrency: settings.defaultCurrency,
      paymentTerms: settings.paymentTerms,
      invoiceFooter: settings.invoiceFooter,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
