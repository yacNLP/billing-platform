import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { OnboardingStatusResponse } from './dto/onboarding-status-response.type';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Roles(Role.ADMIN, Role.USER)
  @Get('status')
  getStatus(): Promise<OnboardingStatusResponse> {
    return this.onboardingService.getStatus();
  }
}
