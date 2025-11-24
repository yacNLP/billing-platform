import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConflictException } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { UpdateCustomerDto } from './dto/update-customer.dto';

type PaginatedCustomers = {
  data: Customer[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private prisma: PrismaService) {}

  async list(params?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
  }): Promise<PaginatedCustomers> {
    const page = params?.page ?? 1; //current page (default 1)
    const pageSize = params?.pageSize ?? 10; //items per page (default 10)
    const skip = (page - 1) * pageSize; // items to skip

    // handle search query
    const where: Prisma.CustomerWhereInput | undefined = params?.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    // Count total customers (for pagination)
    const total = await this.prisma.customer.count({ where });
    const orderOption = params?.sortBy
      ? { [params.sortBy]: params.order || 'asc' }
      : undefined;

    const data = await this.prisma.customer.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: orderOption,
    });

    //const hasNext = skip + data.length < total; // check if another page exists
    const totalPages = Math.ceil(total / pageSize)
    return { data, page, pageSize, total, totalPages };
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
      const customer = await this.prisma.customer.create({ data });
      this.logger.log(
        `Created customer with id ${customer.id} and email ${customer.email}`,
      );
      return customer;
    } catch (e) {
      //handdle double email error
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        this.logger.warn(`duplicate email=${data.email}`);
        throw new ConflictException('Email already exists');
      }
      throw e;
    }
  }

  async update(id: number, data: UpdateCustomerDto): Promise<Customer> {
    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data,
      });
      this.logger.log(`updated id=${id}`);
      return customer;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          this.logger.warn(`duplicate email=${data.email}`);
          throw new ConflictException('Email already exists');
        }
        if (e.code === 'P2025') {
          this.logger.warn(`Customer ${id} not found`);
          throw new NotFoundException(`Customer ${id} not found`);
        }
      }
      throw e;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.customer.delete({ where: { id } });
      this.logger.log(`deleted id=${id}`);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException(`Customer ${id} not found`);
      }
      throw e;
    }
  }
}
