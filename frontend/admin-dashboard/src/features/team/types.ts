import type { AuthRole } from "@/features/auth/types";

export type TeamMember = {
  id: number;
  email: string;
  role: AuthRole;
  createdAt: string;
};

export type CreateTeamMemberRequest = {
  email: string;
  password: string;
  role: AuthRole;
};

export type UpdateTeamMemberRoleRequest = {
  id: number;
  role: AuthRole;
};
