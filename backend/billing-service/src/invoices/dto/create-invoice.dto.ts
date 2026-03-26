import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  Matches,
} from 'class-validator';

export class CreateInvoiceDto {
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  subscriptionId!: number;

  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  customerId!: number;

  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  amountDue!: number;

  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be 3-letter ISO like EUR' })
  currency?: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsDateString()
  dueAt!: string;
}
