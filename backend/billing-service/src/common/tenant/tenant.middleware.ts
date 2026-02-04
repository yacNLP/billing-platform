import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
  tenantId?: number;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction) {
    const tenantHeader = req.header('X-Tenant-Id');

    if (!tenantHeader) {
      throw new BadRequestException('X-Tenant-Id header is required');
    }

    const tenantId = Number(tenantHeader);

    if (Number.isNaN(tenantId)) {
      throw new BadRequestException('X-Tenant-Id must be a number');
    }

    req.tenantId = tenantId;
    next();
  }
}
