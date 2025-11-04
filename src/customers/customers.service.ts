import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConflictException } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async list(): Promise<any> {
    return this.prisma.customer.findMany();
  }

  async get(id: number): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    // handle not found customer error
    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }
    return customer;
  }

  async create(data: { name: string; email: string }): Promise<Customer> {
    try {
      return await this.prisma.customer.create({ data }); // <-- await
    } catch (e) {
      //handdle double email error
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw e;
    }
  }
}
