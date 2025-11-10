import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { trim } from '../../common/transformers/transformers';

export class QueryPlanDto {
  @IsOptional()
  @IsString()
  @Transform((p: TransformFnParams) => trim(p))
  search?: string; // free text on code/name

  @IsOptional()
  @IsBooleanString()
  active?: string; // "true" | "false"

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  @Transform((p: TransformFnParams) => trim(p).toUpperCase())
  currency?: string; // filter by currency

  @IsOptional()
  @IsIn(['id,', 'code', 'name', 'amount', 'createdAt'])
  sort?: string; // safe sort fields

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: string; // asc|desc

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
