import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { toCurrencyISO, trim } from '../../common/transformers/transformers';

export class CreateInvoiceDto {
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  customerId!: number;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  subscriptionId?: number;

  @IsString()
  @Transform(toCurrencyISO)
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a 3-letter ISO code',
  })
  currency!: string;

  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(0)
  subtotalCents!: number;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(0)
  taxCents?: number;

  @IsDateString()
  dueDate!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  @Transform((params: TransformFnParams) => trim(params))
  notes?: string;
}
