import { z } from 'zod';

export const JwtPayloadSchema = z.object({
  sub: z.number(),
  tenantId: z.number(),
  role: z.enum(['ADMIN', 'USER']),
});

export type JwtPayloadParsed = z.infer<typeof JwtPayloadSchema>;
