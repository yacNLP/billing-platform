import { Prisma } from '@prisma/client';

export type AuditLogResponse = {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: Prisma.JsonValue;
  actorUserId: number | null;
  createdAt: Date;
};
