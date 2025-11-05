import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateCustomerDto } from './create-customer.dto';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './update-customer.dto';
import { ListCustomersQuery } from './list-customers.query';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  list(@Query() q: ListCustomersQuery) {
    return this.customersService.list(q);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.customersService.get(Number(id));
  }

  @Post()
  create(@Body() body: CreateCustomerDto) {
    return this.customersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204) // No content
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.delete(id);
  }
}
