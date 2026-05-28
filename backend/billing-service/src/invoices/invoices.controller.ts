import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/auth/role.enum';
import { Roles } from 'src/auth/roles.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceEmailService } from './invoice-email.service';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly invoiceEmailService: InvoiceEmailService,
  ) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get()
  findAll(@Query() query: InvoicesQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Roles(Role.ADMIN, Role.USER)
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const pdf = await this.invoicePdfService.generateInvoicePdf(id);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${pdf.filename}"`,
    );
    response.send(pdf.buffer);
  }

  @Roles(Role.ADMIN)
  @Post(':id/send-email')
  sendEmail(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceEmailService.sendInvoiceEmail(id);
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
