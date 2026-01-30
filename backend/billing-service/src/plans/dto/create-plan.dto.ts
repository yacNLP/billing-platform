import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { BillingInterval } from '@prisma/client';
import { trim, toCurrencyISO } from '../../common/transformers/transformers';

export class CreatePlanDto {
  @IsString()
  @Transform((p: TransformFnParams) => trim(p))
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code must be UPPER_SNAKE_CASE like PRO_MONTHLY',
  })
  @Length(3, 64)
  code!: string; // public unique code

  @IsString()
  @Transform((p: TransformFnParams) => trim(p))
  @Length(2, 100)
  name!: string; // display name

  @IsOptional()
  @IsString()
  @Transform((p: TransformFnParams) => trim(p))
  @MaxLength(2000)
  description?: string; // optional description

  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  productId!: number; // FK to Product

  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  amount!: number; // minor units (cents)

  @IsString()
  @Transform(toCurrencyISO)
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be 3-letter ISO like EUR' })
  currency!: string;

  @IsEnum(BillingInterval)
  interval!: BillingInterval; // DAY/WEEK/MONTH/YEAR

  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(1)
  intervalCount!: number; // e.g. every 1 month

  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(0)
  trialDays!: number; // 0 means no trial

  @IsOptional()
  @IsBoolean()
  active?: boolean; // defaults true in DB
}
