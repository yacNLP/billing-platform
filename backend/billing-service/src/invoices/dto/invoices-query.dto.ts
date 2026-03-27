import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class InvoicesQueryDto {
  @IsOptional()
  @IsIn(['ISSUED', 'PAID', 'VOID', 'OVERDUE'])
  status?: 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  customerId?: number;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  subscriptionId?: number;

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
