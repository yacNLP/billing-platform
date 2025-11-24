import { Type } from 'class-transformer';
import { IsInt, Min, IsIn, IsOptional, IsString } from 'class-validator';

// ListCustomersQuery class to validate query parameters
export class ListCustomersQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 10;

  @IsOptional()
  @IsIn(['name', 'email', 'createdAt'])
  sortBy?: 'name' | 'email' | 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  search?: string;
}
