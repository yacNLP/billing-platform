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
import { Role } from 'src/auth/role.enum';
import { Roles } from 'src/auth/roles.decorator';
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
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get()
  findAll(@Query() query: InvoicesQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/paid')
  markAsPaid(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.markAsPaid(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/void')
  markAsVoid(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.markAsVoid(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/overdue')
  markAsOverdue(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.markAsOverdue(id);
  }
}
