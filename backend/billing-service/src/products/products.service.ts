import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsQueryDto } from './dto/products-query.dto';
import { Prisma, Product } from '@prisma/client';
import { errorMessage } from '../common/error.util';
import { Paginated } from 'src/common/dto/paginated.type';
import { TenantContext } from 'src/common/tenant/tenant.context';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    private prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const tenantId = this.tenantContext.getTenantId();
    this.logger.log(`create product name=${dto.name}`);
    try {
      const created = await this.prisma.product.create({
        data: {
          ...dto,
          tenantId,
        },
      });
      this.logger.debug(`created product id=${created.id}`);
      return created;
    } catch (err: unknown) {
      this.logger.error(
        `create failed for name=${dto.name}: ${errorMessage(err)}`,
      );
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Product name already exists');
      }
      throw err;
    }
  }

  async findAll(q: ProductsQueryDto): Promise<Paginated<Product>> {
    const tenantId = this.tenantContext.getTenantId();
    const {
      page = 1,
      pageSize = 20,
      q: query,
      sortBy = 'createdAt',
      order = 'desc',
      isActive,
    } = q;

    this.logger.debug(
      `list products page=${page} size=${pageSize} q=${query ?? ''} sort=${sortBy}:${order} active=${isActive ?? ''}`,
    );

    const where: Prisma.ProductWhereInput = {
      tenantId,
    };

    if (query) {
      where.name = { contains: query, mode: 'insensitive' };
    }

    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'name'
        ? { name: order }
        : sortBy === 'updatedAt'
          ? { updatedAt: order }
          : { createdAt: order };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    this.logger.debug(
      `list products -> total=${total} returned=${data.length}`,
    );
    return { data, total, page, pageSize, totalPages };
  }

  async findOne(id: number): Promise<Product> {
    const tenantId = this.tenantContext.getTenantId();
    this.logger.debug(`get product id=${id}`);
    const item = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!item) {
      this.logger.warn(`product not found id=${id}`);
      throw new NotFoundException('Product not found');
    }
    return item;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const tenantId = this.tenantContext.getTenantId();
    this.logger.log(`update product id=${id}`);
    try {
      const updated = await this.prisma.product.update({
        where: { id, tenantId },
        data: dto,
      });
      this.logger.debug(`updated product id=${updated.id}`);
      return updated;
    } catch (err: unknown) {
      this.logger.error(`update failed id=${id}: ${errorMessage(err)}`);
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025')
          throw new NotFoundException('Product not found');
        if (err.code === 'P2002')
          throw new ConflictException('Product name already exists');
      }
      throw err;
    }
  }

  async remove(id: number): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    this.logger.log(`delete product id=${id}`);
    try {
      await this.prisma.product.delete({
        where: { id, tenantId },
      });
      this.logger.debug(`deleted product id=${id}`);
    } catch (err: unknown) {
      this.logger.error(`delete failed id=${id}: ${errorMessage(err)}`);

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          // record not found
          throw new NotFoundException('Product not found');
        }

        if (err.code === 'P2003') {
          // foreign key constraint (plans exist)
          throw new ConflictException(
            'Product cannot be deleted because it has associated plans',
          );
        }
      }

      throw err;
    }
  }
}
