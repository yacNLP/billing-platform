import { TransformFnParams } from 'class-transformer';

// Safe string trim
export function trimString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

// Uppercase 3-letter currency
export function toCurrencyISO({ value }: TransformFnParams): string {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

// Generic trim transformer for class-transformer
export function trim({ value }: TransformFnParams): string {
  return trimString(value);
}
