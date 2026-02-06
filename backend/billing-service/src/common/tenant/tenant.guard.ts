import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from '../../auth/public.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export interface TenantRequest extends Request {
  tenantId?: number;
  user?: AuthenticatedUser;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    //  Allow public routes (e.g. /auth/login)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get request after JwtAuthGuard
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;

    // Enforce tenant presence
    if (!user || !user.tenantId) {
      throw new ForbiddenException('Tenant not resolved');
    }

    // Inject tenantId for downstream usage (TenantContext, Prisma, services)
    request.tenantId = user.tenantId;

    return true;
  }
}
