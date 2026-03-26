import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotImplementedException,
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

  findAll(query: SubscriptionsQueryDto): Promise<Paginated<Subscription>> {
    const tenantId = this.tenantContext.getTenantId();

    void this.prisma;
    void query;

    this.logger.debug(`list subscriptions scaffold tenantId=${tenantId}`);
    throw new NotImplementedException(
      'Subscription listing is not implemented yet',
    );
  }

  findOne(id: number): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();

    void this.prisma;
    void id;

    this.logger.debug(`get subscription scaffold tenantId=${tenantId}`);
    throw new NotImplementedException(
      'Subscription retrieval is not implemented yet',
    );
  }

  cancel(id: number, dto: CancelSubscriptionDto): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();

    void this.prisma;
    void id;
    void dto;

    this.logger.debug(`cancel subscription scaffold tenantId=${tenantId}`);
    throw new NotImplementedException(
      'Subscription cancellation is not implemented yet',
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
        throw new Error(`Unsupported interval`);
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
