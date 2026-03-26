import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class CreateSubscriptionDto {
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  customerId!: number;

  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  planId!: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}
