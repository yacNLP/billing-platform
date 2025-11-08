import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  IsNumber,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsString()
  @Length(1, 64)
  @Matches(/^[A-Z0-9-_.]+$/i, {
    message: 'SKU invalide : lettres, chiffres, -, _, . uniquement',
  })
  sku!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsString()
  @Length(3, 3)
  currency: string = 'EUR';

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  taxRate: number = 0.2;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  stock: number = 0;

  @IsInt()
  @Min(0)
  lowStockThreshold: number = 0;
}
