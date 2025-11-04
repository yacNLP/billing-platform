import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateCustomerDto } from './create-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  list(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('orderBy') orderBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.customersService.list({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      orderBy,
      order,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.customersService.get(Number(id));
  }

  @Post()
  create(@Body() body: CreateCustomerDto) {
    return this.customersService.create(body);
  }
}
