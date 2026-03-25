import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingInterval,
  Prisma,
  Subscription,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsQueryDto } from './dto/subscriptions-query.dto';
import { Paginated } from 'src/common/dto/paginated.type';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });

    if (!customer) {
      throw new BadRequestException('Invalid customerId');
    }

    const plan = await this.prisma.plan.findFirst({
      where: {
        id: dto.planId,
        tenantId,
        active: true,
        deletedAt: null,
      },
    });

    if (!plan) {
      throw new BadRequestException('Invalid or inactive planId');
    }

    const hasActive = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        customerId: dto.customerId,
        status: SubscriptionStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (hasActive) {
      throw new ConflictException(
        'Customer already has an active subscription',
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const currentPeriodStart = startDate;
    const currentPeriodEnd = this.computePeriodEnd(
      startDate,
      plan.interval,
      plan.intervalCount,
    );

    if (currentPeriodEnd <= currentPeriodStart) {
      throw new BadRequestException('currentPeriodEnd must be after startDate');
    }

    try {
      const created = await this.prisma.subscription.create({
        data: {
          tenantId,
          customerId: customer.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? false,
          amountSnapshot: plan.amount,
          currencySnapshot: plan.currency,
          intervalSnapshot: plan.interval,
          intervalCountSnapshot: plan.intervalCount,
          startDate,
          currentPeriodStart,
          currentPeriodEnd,
        },
      });

      this.logger.log(
        `Created subscription id=${created.id} customerId=${created.customerId} tenantId=${tenantId}`,
      );

      return created;
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    query: SubscriptionsQueryDto,
  ): Promise<Paginated<Subscription>> {
    const tenantId = this.tenantContext.getTenantId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.SubscriptionWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();

    const subscription = await this.prisma.subscription.findFirst({
      where: { id, tenantId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with id=${id} not found`);
    }

    return subscription;
  }

  async cancel(id: number, dto: CancelSubscriptionDto): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();
    const existing = await this.findOne(id);

    if (existing.status === SubscriptionStatus.CANCELED) {
      return existing;
    }

    const cancelAtPeriodEnd = dto.cancelAtPeriodEnd ?? true;

    if (cancelAtPeriodEnd && existing.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'Only active subscriptions can be scheduled for cancellation',
      );
    }

    try {
      const now = new Date();
      const canceledAt = existing.canceledAt ?? now;

      const updated = await this.prisma.subscription.update({
        where: { id: existing.id, tenantId },
        data: cancelAtPeriodEnd
          ? {
              cancelAtPeriodEnd: true,
              canceledAt,
            }
          : {
              status: SubscriptionStatus.CANCELED,
              cancelAtPeriodEnd: false,
              canceledAt,
              endedAt: now,
              currentPeriodEnd: now,
            },
      });

      this.logger.log(
        `Canceled subscription id=${updated.id} atPeriodEnd=${cancelAtPeriodEnd} tenantId=${tenantId}`,
      );

      return updated;
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  private computePeriodEnd(
    start: Date,
    interval: BillingInterval,
    intervalCount: number,
  ): Date {
    const end = new Date(start);

    if (interval === BillingInterval.DAY) {
      end.setUTCDate(end.getUTCDate() + intervalCount);
      return end;
    }

    if (interval === BillingInterval.WEEK) {
      end.setUTCDate(end.getUTCDate() + intervalCount * 7);
      return end;
    }

    if (interval === BillingInterval.MONTH) {
      end.setUTCMonth(end.getUTCMonth() + intervalCount);
      return end;
    }

    end.setUTCFullYear(end.getUTCFullYear() + intervalCount);
    return end;
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Customer already has an active subscription',
        );
      }

      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid customerId or planId');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(`Subscription not found`);
      }
    }

    throw error;
  }
}
