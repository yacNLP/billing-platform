// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // 1️⃣ création
  async create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

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

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ];
    }

    const priceFilter: Prisma.IntFilter = {};
    if (typeof minPriceCents === 'number') priceFilter.gte = minPriceCents;
    if (typeof maxPriceCents === 'number') priceFilter.lte = maxPriceCents;
    if (Object.keys(priceFilter).length > 0) where.priceCents = priceFilter;

    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

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

  async findOne(id: number) {
    const item = await this.prisma.product.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Product not found');
    return item;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id); // vérifie existence
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id); // vérifie existence
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }
}
