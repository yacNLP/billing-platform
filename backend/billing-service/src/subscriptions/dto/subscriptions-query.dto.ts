import { Transform, TransformFnParams, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class SubscriptionsQueryDto {
  @IsOptional()
  @IsIn([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELED,
    SubscriptionStatus.EXPIRED,
    SubscriptionStatus.PAST_DUE,
  ])
  @Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    return value.toUpperCase();
  })
  status?: SubscriptionStatus;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
