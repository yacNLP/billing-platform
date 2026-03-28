import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class PaymentsQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  invoiceId?: number;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  limit?: number;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
