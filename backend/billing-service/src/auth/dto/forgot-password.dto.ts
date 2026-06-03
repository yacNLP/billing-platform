import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class ForgotPasswordDto {
  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  email!: string;
}
