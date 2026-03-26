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
import { Paginated } from '../common/dto/paginated.type';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma.service';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsQueryDto } from './dto/subscriptions-query.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();
    this.logger.debug(
      `create subscription customerId=${dto.customerId} planId=${dto.planId} tenantId=${tenantId}`,
    );

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        tenantId,
      },
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

    const existingActiveSubscription = await this.prisma.subscription.findFirst(
      {
        select: { id: true },
        where: {
          tenantId,
          customerId: dto.customerId,
          status: SubscriptionStatus.ACTIVE,
        },
      },
    );

    if (existingActiveSubscription) {
      throw new ConflictException(
        'Customer already has an active subscription',
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid startDate');
    }

    const currentPeriodStart = startDate;
    const currentPeriodEnd = this.computeCurrentPeriodEnd(
      currentPeriodStart,
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
        `created subscription id=${created.id} customerId=${created.customerId} planId=${created.planId} tenantId=${tenantId}`,
      );

      return created;
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException(
            'Customer already has an active subscription',
          );
        }

        if (e.code === 'P2003') {
          throw new BadRequestException('Invalid customerId or planId');
        }
      }

      throw e;
    }
  }

  async findAll(
    query: SubscriptionsQueryDto,
  ): Promise<Paginated<Subscription>> {
    const tenantId = this.tenantContext.getTenantId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    this.logger.debug(
      `list subscriptions tenantId=${tenantId} page=${page} pageSize=${pageSize} status=${query.status ?? ''}`,
    );

    const where: Prisma.SubscriptionWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
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

  async findOne(id: number): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();

    this.logger.debug(`get subscription id=${id} tenantId=${tenantId}`);

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with id=${id} not found`);
    }

    return subscription;
  }

  async cancel(id: number, dto: CancelSubscriptionDto): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();
    this.logger.debug(`cancel subscription id=${id} tenantId=${tenantId}`);

    const existing = await this.prisma.subscription.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Subscription with id=${id} not found`);
    }

    if (existing.status === SubscriptionStatus.CANCELED) {
      return existing;
    }

    if (existing.status === SubscriptionStatus.EXPIRED) {
      return existing;
    }

    const cancelAtPeriodEnd = dto.cancelAtPeriodEnd ?? true;
    const now = new Date();

    try {
      const updated = await this.prisma.subscription.update({
        where: {
          id: existing.id,
        },
        data: (() => {
          if (cancelAtPeriodEnd) {
            if (existing.status !== SubscriptionStatus.ACTIVE) {
              throw new BadRequestException(
                'Only active subscriptions can be scheduled for cancellation',
              );
            }

            return {
              cancelAtPeriodEnd: true,
              canceledAt: now,
            };
          }

          if (now < existing.currentPeriodStart) {
            throw new BadRequestException(
              'Cannot immediately cancel a subscription before it starts',
            );
          }

          return {
            status: SubscriptionStatus.CANCELED,
            cancelAtPeriodEnd: false,
            canceledAt: now,
            endedAt: now,
            currentPeriodEnd: now,
          };
        })(),
      });

      this.logger.log(
        `canceled subscription id=${updated.id} tenantId=${tenantId} cancelAtPeriodEnd=${cancelAtPeriodEnd}`,
      );

      return updated;
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Subscription with id=${id} not found`);
      }

      throw e;
    }
  }

  async evaluateAndUpdateStatus(
    subscription: Subscription,
  ): Promise<Subscription> {
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return subscription;
    }

    const now = new Date();

    // PAST_DUE lifecycle handling will be introduced later.

    if (now <= subscription.currentPeriodEnd) {
      return subscription;
    }

    if (!subscription.cancelAtPeriodEnd) {
      // Renewal logic not implemented yet -> keep ACTIVE
      return subscription;
    }

    const updated = await this.prisma.subscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });

    const tenantId = this.tenantContext.getTenantId();
    this.logger.log(
      `subscription lifecycle updated id=${updated.id} tenantId=${tenantId} from=${subscription.status} to=${updated.status}`,
    );

    return updated;
  }

  async evaluateSubscriptionsLifecycle(): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        tenantId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    await Promise.all(
      subscriptions.map((subscription) =>
        this.evaluateAndUpdateStatus(subscription),
      ),
    );
  }

  private computeCurrentPeriodEnd(
    startDate: Date,
    interval: BillingInterval,
    intervalCount: number,
  ): Date {
    switch (interval) {
      case BillingInterval.DAY:
        return this.addDays(startDate, intervalCount);
      case BillingInterval.WEEK:
        return this.addDays(startDate, intervalCount * 7);
      case BillingInterval.MONTH:
        return this.addMonthsClamped(startDate, intervalCount);
      case BillingInterval.YEAR:
        return this.addYearsClamped(startDate, intervalCount);
      default:
        throw new Error('Unsupported interval');
    }
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private addMonthsClamped(date: Date, months: number): Date {
    const result = new Date(date);
    const dayOfMonth = result.getUTCDate();

    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);

    const lastDayOfTargetMonth = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
    ).getUTCDate();

    result.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
    return result;
  }

  private addYearsClamped(date: Date, years: number): Date {
    const result = new Date(date);
    const month = result.getUTCMonth();
    const dayOfMonth = result.getUTCDate();

    result.setUTCDate(1);
    result.setUTCFullYear(result.getUTCFullYear() + years);
    result.setUTCMonth(month);

    const lastDayOfTargetMonth = new Date(
      Date.UTC(result.getUTCFullYear(), month + 1, 0),
    ).getUTCDate();

    result.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
    return result;
  }
}
