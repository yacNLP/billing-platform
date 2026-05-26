import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { TenantSettingsResponseDto } from './dto/tenant-settings-response.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { TenantSettingsService } from './tenant-settings.service';

@ApiTags('tenant-settings')
@ApiBearerAuth()
@Controller('tenant-settings')
export class TenantSettingsController {
  constructor(private readonly tenantSettingsService: TenantSettingsService) {}

  @Roles(Role.ADMIN, Role.USER)
  @Get()
  findCurrent(): Promise<TenantSettingsResponseDto> {
    return this.tenantSettingsService.findCurrentTenantSettings();
  }

  @Roles(Role.ADMIN)
  @Put()
  updateCurrent(
    @Body() body: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsResponseDto> {
    return this.tenantSettingsService.upsertCurrentTenantSettings(body);
  }
}
