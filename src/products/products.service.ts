// src/products/products.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Prisma, Product } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // creation with unique sku handling (409)
  async create(dto: CreateProductDto): Promise<Product> {
    try {
      return await this.prisma.product.create({ data: dto });
    } catch (err) {
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
  async findAll(q: PaginationDto) {
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

    const totalPages = Math.ceil(total / pageSize) || 1;
    return { data, total, page, pageSize, totalPages };
  }

  // read one or 404
  async findOne(id: number): Promise<Product> {
    const item = await this.prisma.product.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Product not found');
    return item;
  }

  // update with not-found and duplicate-sku handling
  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    try {
      return await this.prisma.product.update({ where: { id }, data: dto });
    } catch (err) {
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
  async remove(id: number) {
    try {
      await this.prisma.product.delete({ where: { id } });
      return { deleted: true };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Product not found');
      }
      throw err;
    }
  }
}
