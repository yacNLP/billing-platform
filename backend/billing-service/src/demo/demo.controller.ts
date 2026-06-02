import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { LoadSampleDataResponse } from './dto/load-sample-data-response.type';
import { DemoService } from './demo.service';

@ApiTags('demo')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post('load-sample-data')
  loadSampleData(): Promise<LoadSampleDataResponse> {
    return this.demoService.loadSampleData();
  }
}
