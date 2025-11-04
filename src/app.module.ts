import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { CustomersController } from './customers/customers.controller';
import { CustomersService } from './customers/customers.service';

@Module({
  controllers: [AppController, CustomersController],
  providers: [PrismaService, CustomersService],
})
export class AppModule {}
