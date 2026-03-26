import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { type Subscription } from '@prisma/client';
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

  create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const tenantId = this.tenantContext.getTenantId();

    void this.prisma;
    void dto;

    this.logger.debug(`create subscription scaffold tenantId=${tenantId}`);
    throw new NotImplementedException(
      'Subscription creation is not implemented yet',
    );
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
}
