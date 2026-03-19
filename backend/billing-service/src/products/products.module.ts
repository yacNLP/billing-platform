import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { TenantModule } from 'src/common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
