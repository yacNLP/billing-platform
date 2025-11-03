import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('customers')
export class CustomersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.customer.findMany();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.customer.findUnique({ where: { id: Number(id) } });
  }

  @Post()
  async create(@Body() body: { name: string; email: string }) {
    return this.prisma.customer.create({ data: body });
  }
}
