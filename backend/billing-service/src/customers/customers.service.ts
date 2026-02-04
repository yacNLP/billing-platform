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
import { CustomersQueryDto } from './dto/customers-query.dto';
import { TenantContext } from 'src/common/tenant/tenant.context';
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async list(params: CustomersQueryDto): Promise<Paginated<Customer>> {
    const tenantId = this.tenantContext.getTenantId();
    const { page = 1, pageSize = 10, sortBy, order, search } = params;

    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const total = await this.prisma.customer.count({ where });

    const orderOption = sortBy ? { [sortBy]: order ?? 'asc' } : undefined;

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
    const tenantId = this.tenantContext.getTenantId();
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }
    return customer;
  }

  async create(data: { name: string; email: string }): Promise<Customer> {
    const tenantId = this.tenantContext.getTenantId();
    try {
      const customer = await this.prisma.customer.create({
        data: {
          ...data,
          tenantId,
        },
      });
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
    const tenantId = this.tenantContext.getTenantId();
    try {
      const customer = await this.prisma.customer.update({
        where: {
          id,
          tenantId,
        },
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
    const tenantId = this.tenantContext.getTenantId();
    try {
      await this.prisma.customer.delete({
        where: {
          id,
          tenantId,
        },
      });
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
