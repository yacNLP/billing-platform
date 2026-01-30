import { Prisma } from '@prisma/client';

export function errorMessage(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError)
    return `${e.code} ${e.message}`;
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
