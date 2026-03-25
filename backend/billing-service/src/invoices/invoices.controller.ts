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
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get()
  async findAll(@Query() query: InvoicesQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/finalize')
  async finalize(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.finalize(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/mark-paid')
  async markPaid(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.markPaid(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/void')
  async void(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.void(id);
  }
}
