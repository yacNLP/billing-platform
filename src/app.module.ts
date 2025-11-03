import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { CustomersController } from './customers.controller';

@Module({
  controllers: [AppController, CustomersController],
  providers: [PrismaService],
})
export class AppModule {}
