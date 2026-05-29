import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function normalizeCurrency(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class SignupDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => trimString(value))
  companyName!: string;

  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  billingEmail?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  @Transform(({ value }) => normalizeCurrency(value))
  defaultCurrency?: string;
}
