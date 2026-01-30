import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { PlansModule } from './plans/plans.module';

@Module({
  imports: [CustomersModule, ProductsModule, PlansModule],
  controllers: [AppController],
})
export class AppModule {}
