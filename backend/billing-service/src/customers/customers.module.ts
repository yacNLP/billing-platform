import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma.service';
import { TenantModule } from 'src/common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [CustomersController],
  providers: [CustomersService, PrismaService],
})
export class CustomersModule {}
