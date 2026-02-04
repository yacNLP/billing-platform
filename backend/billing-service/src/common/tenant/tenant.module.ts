import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { TenantContext } from './tenant.context';

@Module({
  providers: [TenantContext],
  exports: [TenantContext],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
