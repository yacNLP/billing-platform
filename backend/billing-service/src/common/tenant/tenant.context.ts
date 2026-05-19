import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

interface TenantAwareRequest extends Request {
  tenantId?: number;
  user?: AuthenticatedUser;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  constructor(@Inject(REQUEST) private readonly request: TenantAwareRequest) {}

  getTenantId(): number {
    if (!this.request.tenantId) {
      throw new Error('Tenant not resolved');
    }
    return this.request.tenantId;
  }

  getActorUserId(): number {
    if (!this.request.user?.id) {
      throw new Error('Actor user not resolved');
    }

    return this.request.user.id;
  }
}
