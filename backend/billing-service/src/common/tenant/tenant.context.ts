import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import type { TenantRequest } from './tenant.middleware';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  constructor(@Inject(REQUEST) private readonly request: TenantRequest) {}

  getTenantId(): number {
    if (!this.request.tenantId) {
      throw new Error('Tenant not resolved');
    }
    return this.request.tenantId;
  }
}
