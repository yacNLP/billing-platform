import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PrismaService } from '../prisma.service';
import { TenantModule } from 'src/common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [PlansController],
  providers: [PlansService, PrismaService],
})
export class PlansModule {}
