import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [CustomersModule, ProductsModule],
  controllers: [AppController],
})
export class AppModule {}
