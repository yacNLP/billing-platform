import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Customer, Prisma } from '@prisma/client';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Paginated } from '../common/dto/paginated.type';
import { errorMessage } from '../common/error.util';
import { ListCustomersQuery } from './dto/list-customers.query';
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private prisma: PrismaService) {}

  async list(params: ListCustomersQuery): Promise<Paginated<Customer>> {
    const page = params?.page ?? 1; // current page (default 1)
    const pageSize = params?.pageSize ?? 10; // items per page (default 10)
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

    const totalPages = Math.ceil(total / pageSize);

    return { data, page, pageSize, total, totalPages };
  }

  async get(id: number): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }
    return customer;
  }

  async create(data: { name: string; email: string }): Promise<Customer> {
    try {
      const customer = await this.prisma.customer.create({ data });
      this.logger.log(
        `Created customer with id=${customer.id} and email=${customer.email}`,
      );
      return customer;
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        this.logger.warn(`duplicate email=${data.email}`);
        throw new ConflictException('Email already exists');
      }

      this.logger.error(
        `create customer failed email=${data.email}: ${errorMessage(e)}`,
      );
      throw e;
    }
  }

  async update(id: number, data: UpdateCustomerDto): Promise<Customer> {
    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data,
      });
      this.logger.log(`updated customer id=${id}`);
      return customer;
    } catch (e: unknown) {
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

      this.logger.error(`update customer failed id=${id}: ${errorMessage(e)}`);
      throw e;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.customer.delete({ where: { id } });
      this.logger.log(`deleted customer id=${id}`);
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        this.logger.warn(`Customer ${id} not found`);
        throw new NotFoundException(`Customer ${id} not found`);
      }

      this.logger.error(`delete customer failed id=${id}: ${errorMessage(e)}`);
      throw e;
    }
  }
}
