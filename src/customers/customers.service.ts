import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConflictException } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

type PaginatedCustomers = {
  data: Customer[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async list(params?: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<PaginatedCustomers> {
    const page = params?.page ?? 1; //current page (default 1)
    const pageSize = params?.pageSize ?? 10; //items per page (default 10)
    const skip = (page - 1) * pageSize; // items to skip

    // Count total customers (for pagination)
    const total = await this.prisma.customer.count();

    const data = await this.prisma.customer.findMany({
      skip,
      take: pageSize,
      orderBy: params?.orderBy
        ? { [params.orderBy]: params.order || 'asc' }
        : undefined,
    });

    const hasNext = skip + data.length < total; // check if another page exists

    return { data, page, pageSize, total, hasNext };
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
