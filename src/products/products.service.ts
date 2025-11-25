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

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(private prisma: PrismaService) {}

  // creation with unique sku handling (409)
  async create(dto: CreateProductDto): Promise<Product> {
    this.logger.log(`create product sku=${dto.sku}`);
    try {
      const created = await this.prisma.product.create({ data: dto });
      this.logger.debug(`created product id=${created.id}`);
      return created;
    } catch (err: unknown) {
      this.logger.error(
        `create failed for sku=${dto.sku}: ${errorMessage(err)}`,
      );
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // unique constraint violation on sku
        throw new ConflictException('SKU already exists');
      }
      throw err;
    }
  }

  // list with query filters, sorting and pagination
  async findAll(q: ProductsQueryDto): Promise<Paginated<Product>> {
    const {
      page = 1,
      pageSize = 20,
      q: query,
      sortBy = 'createdAt',
      order = 'desc',
      minPriceCents,
      maxPriceCents,
      isActive,
    } = q;

    this.logger.debug(
      `list products page=${page} size=${pageSize} q=${query ?? ''} sort=${sortBy}:${order} price=[${minPriceCents ?? ''},${maxPriceCents ?? ''}] active=${isActive ?? ''}`,
    );

    const where: Prisma.ProductWhereInput = {};

    // text search on name and sku
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ];
    }

    // price range filter
    const priceFilter: Prisma.IntFilter = {};
    if (typeof minPriceCents === 'number') priceFilter.gte = minPriceCents;
    if (typeof maxPriceCents === 'number') priceFilter.lte = maxPriceCents;
    if (Object.keys(priceFilter).length > 0) where.priceCents = priceFilter;

    // active flag filter
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    // typed orderBy mapping to avoid unsafe dynamic keys
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'name'
        ? { name: order }
        : sortBy === 'priceCents'
          ? { priceCents: order }
          : sortBy === 'updatedAt'
            ? { updatedAt: order }
            : sortBy === 'stock'
              ? { stock: order }
              : sortBy === 'sku'
                ? { sku: order }
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

  // read one or 404
  async findOne(id: number): Promise<Product> {
    this.logger.debug(`get product id=${id}`);
    const item = await this.prisma.product.findUnique({ where: { id } });
    if (!item) {
      this.logger.warn(`product not found id=${id}`);
      throw new NotFoundException('Product not found');
    }
    return item;
  }

  // update with not-found and duplicate-sku handling
  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    this.logger.log(`update product id=${id} sku=${dto.sku ?? '<unchanged>'}`);
    try {
      const updated = await this.prisma.product.update({
        where: { id },
        data: dto,
      });
      this.logger.debug(`updated product id=${updated.id}`);
      return updated;
    } catch (err: unknown) {
      this.logger.error(`update failed id=${id}: ${errorMessage(err)}`);
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // record not found
        if (err.code === 'P2025')
          throw new NotFoundException('Product not found');
        // unique constraint violation on sku
        if (err.code === 'P2002')
          throw new ConflictException('SKU already exists');
      }
      throw err;
    }
  }

  // delete with not-found handling
  async remove(id: number): Promise<void> {
    this.logger.log(`delete product id=${id}`);
    try {
      await this.prisma.product.delete({ where: { id } });
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
