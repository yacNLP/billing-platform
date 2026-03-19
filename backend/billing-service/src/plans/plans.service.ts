import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, type Plan, type Product } from '@prisma/client';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansQueryDto } from './dto/plans-query.dto';
import { Paginated } from '../common/dto/paginated.type';
import { TenantContext } from '../common/tenant/tenant.context';

// Whitelist for sorting
type PlanSortKey = 'id' | 'code' | 'name' | 'amount' | 'createdAt';

const ALLOWED_SORT: readonly PlanSortKey[] = [
  'id',
  'code',
  'name',
  'amount',
  'createdAt',
] as const;

function isPlanSortKey(value: unknown): value is PlanSortKey {
  return (
    typeof value === 'string' &&
    (ALLOWED_SORT as readonly string[]).includes(value)
  );
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    const tenantId = this.tenantContext.getTenantId();

    await this.ensureActiveTenantProduct(dto.productId, tenantId);

    try {
      const data: Prisma.PlanCreateInput = {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency,
        interval: dto.interval,
        intervalCount: dto.intervalCount,
        trialDays: dto.trialDays,
        active: dto.active ?? true,
        tenant: { connect: { id: tenantId } },
        product: { connect: { id: dto.productId } },
      };

      const created = await this.prisma.plan.create({ data });

      this.logger.log(
        `Created plan id=${created.id} code=${created.code} tenantId=${tenantId}`,
      );

      return created;
    } catch (e: unknown) {
      this.handleWriteError(e, { id: undefined });
    }
  }

  async findOne(id: number): Promise<Plan> {
    const tenantId = this.tenantContext.getTenantId();

    const plan = await this.prisma.plan.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with id=${id} not found`);
    }

    return plan;
  }

  async findAll(query: PlansQueryDto): Promise<Paginated<Plan>> {
    const tenantId = this.tenantContext.getTenantId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const sortField: PlanSortKey = isPlanSortKey(query.sort)
      ? query.sort
      : 'id';

    const sortOrder: 'asc' | 'desc' = query.order === 'desc' ? 'desc' : 'asc';

    const where: Prisma.PlanWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.active != null ? { active: query.active === 'true' } : {}),
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
    const tenantId = this.tenantContext.getTenantId();
    const existing = await this.findOne(id);

    // productId is immutable
    if (dto.productId != null && dto.productId !== existing.productId) {
      throw new BadRequestException('productId cannot be changed');
    }

    try {
      const data: Prisma.PlanUpdateInput = {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency,
        interval: dto.interval,
        intervalCount: dto.intervalCount,
        trialDays: dto.trialDays,
        active: dto.active,
      };

      const updated = await this.prisma.plan.update({
        where: { id: existing.id, tenantId },
        data,
      });

      this.logger.log(
        `Updated plan id=${updated.id} code=${updated.code} tenantId=${tenantId}`,
      );

      return updated;
    } catch (e: unknown) {
      this.handleWriteError(e, { id });
    }
  }

  async remove(id: number): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    const existing = await this.findOne(id);

    await this.prisma.plan.update({
      where: { id: existing.id, tenantId },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });

    this.logger.log(`Soft-deleted plan id=${existing.id} tenantId=${tenantId}`);
  }

  private async ensureActiveTenantProduct(
    productId: number,
    tenantId: number,
  ): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        isActive: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Invalid or inactive productId');
    }

    return product;
  }

  private handleWriteError(error: unknown, context: { id?: number }): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Code already exists');
      }

      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid or inactive productId');
      }

      if (error.code === 'P2025') {
        if (context.id != null) {
          throw new NotFoundException(`Plan with id=${context.id} not found`);
        }

        throw new NotFoundException('Plan not found');
      }
    }

    throw error;
  }
}
