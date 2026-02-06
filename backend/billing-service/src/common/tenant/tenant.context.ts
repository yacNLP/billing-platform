import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { Request } from 'express';

interface TenantAwareRequest extends Request {
  tenantId?: number;
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
}
