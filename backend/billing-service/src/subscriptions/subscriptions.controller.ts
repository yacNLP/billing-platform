import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/role.enum';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsQueryDto } from './dto/subscriptions-query.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Get()
  findAll(@Query() query: SubscriptionsQueryDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancel(id, dto);
  }
}
