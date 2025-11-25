// src/plans/plans.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, type Plan, type Product, type $Enums } from '@prisma/client';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansQueryDto } from './dto/plans-query.dto';
import { errorMessage } from '../common/error.util';
import { Paginated } from '../common/dto/paginated.type';

// Whitelist for sorting
type PlanSortKey = 'id' | 'code' | 'name' | 'amount' | 'createdAt';
const ALLOWED_SORT: readonly PlanSortKey[] = [
  'id',
  'code',
  'name',
  'amount',
  'createdAt',
] as const;

function isPlanSortKey(v: unknown): v is PlanSortKey {
  return (
    typeof v === 'string' && (ALLOWED_SORT as readonly string[]).includes(v)
  );
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    // validate productId exists
    const product: Product | null = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new BadRequestException('Invalid productId');

    try {
      const data: Prisma.PlanCreateInput = {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency,
        interval: dto.interval as $Enums.BillingInterval,
        intervalCount: dto.intervalCount,
        trialDays: dto.trialDays,
        active: dto.active ?? true,
        product: { connect: { id: dto.productId } },
      };

      return await this.prisma.plan.create({ data });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          // unique constraint violation on code
          throw new ConflictException('Code already exists');
        }
        if (e.code === 'P2003') {
          // invalid FK (should être rare vu le check plus haut)
          throw new BadRequestException('Invalid productId');
        }
      }
      throw new BadRequestException(`Operation failed: ${errorMessage(e)}`);
    }
  }

  async findOne(id: number): Promise<Plan> {
    const plan = await this.prisma.plan.findFirst({
      where: { id, deletedAt: null },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with id=${id} not found`);
    }

    return plan;
  }

  async findAll(query: PlansQueryDto): Promise<Paginated<Plan>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const sortField: PlanSortKey = isPlanSortKey(query.sort)
      ? query.sort
      : 'id';
    const sortOrder: 'asc' | 'desc' =
      query.order && query.order === 'desc' ? 'desc' : 'asc';

    const where: Prisma.PlanWhereInput = {
      deletedAt: null,
      ...(query.active ? { active: query.active === 'true' } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.PlanOrderByWithRelationInput = {
      [sortField]: sortOrder,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.plan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async update(id: number, dto: UpdatePlanDto): Promise<Plan> {
    const existing: Plan = await this.findOne(id);

    // productId is immutable (rule in doc)
    if (dto.productId && dto.productId !== existing.productId) {
      throw new BadRequestException('productId cannot be changed');
    }

    try {
      const data: Prisma.PlanUpdateInput = {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency,
        interval: dto.interval as $Enums.BillingInterval | undefined,
        intervalCount: dto.intervalCount,
        trialDays: dto.trialDays,
        active: dto.active,
        // no product connect here: productId is immutable
      };

      return await this.prisma.plan.update({
        where: { id: existing.id },
        data,
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException('Code already exists');
        }
        if (e.code === 'P2003') {
          throw new BadRequestException('Invalid productId');
        }
      }
      throw new BadRequestException(`Operation failed: ${errorMessage(e)}`);
    }
  }

  async remove(id: number): Promise<void> {
    const existing: Plan = await this.findOne(id);

    await this.prisma.plan.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });
  }
}
