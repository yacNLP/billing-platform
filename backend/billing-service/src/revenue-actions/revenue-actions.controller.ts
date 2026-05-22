import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/auth/role.enum';
import { Roles } from 'src/auth/roles.decorator';
import { RevenueActionsQueryDto } from './dto/revenue-actions-query.dto';
import { RevenueActionsService } from './revenue-actions.service';

@ApiTags('revenue-actions')
@ApiBearerAuth()
@Controller('revenue-actions')
export class RevenueActionsController {
  constructor(private readonly revenueActionsService: RevenueActionsService) {}

  @Roles(Role.ADMIN, Role.USER)
  @Get()
  findAll(@Query() query: RevenueActionsQueryDto) {
    return this.revenueActionsService.findAll(query);
  }
}
