import { Role } from '../role.enum';

export type AuthenticatedUser = {
  id: number;
  tenantId: number;
  role: Role;
};
