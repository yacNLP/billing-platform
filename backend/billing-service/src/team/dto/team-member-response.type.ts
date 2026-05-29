import { Role } from '@prisma/client';

export type TeamMemberResponse = {
  id: number;
  email: string;
  role: Role;
  createdAt: Date;
};
