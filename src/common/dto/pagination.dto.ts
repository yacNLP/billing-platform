import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1; // page actuelle, par défaut 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pageSize?: number = 20; // nombre d’éléments par page

  @IsOptional()
  @IsString()
  q?: string; // recherche texte (nom/sku)

  @IsOptional()
  @IsString()
  @IsIn(['name', 'priceCents', 'createdAt', 'updatedAt', 'stock', 'sku'])
  sortBy?: string = 'createdAt'; // tri par champ

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc'; // ordre du tri

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceCents?: number; // filtre prix min

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number; // filtre prix max

  @IsOptional()
  isActive?: 'true' | 'false'; // filtre actif/inactif
}
