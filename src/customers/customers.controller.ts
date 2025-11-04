import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateCustomerDto } from './create-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  list() {
    return this.customersService.list();
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
