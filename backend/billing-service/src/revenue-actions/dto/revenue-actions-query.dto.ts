import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { RevenueActionSeverity } from '../revenue-action-severity.enum';
import { RevenueActionType } from '../revenue-action-type.enum';

export class RevenueActionsQueryDto {
  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(RevenueActionSeverity)
  severity?: RevenueActionSeverity;

  @IsOptional()
  @IsEnum(RevenueActionType)
  type?: RevenueActionType;
}
