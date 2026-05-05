import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

function getCorsOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGIN;

  if (!configuredOrigins) {
    return ['http://localhost:3001', 'http://localhost:3000'];
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: getCorsOrigins(),
  });

  // apply global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //only allow whitelisted fields
      forbidNonWhitelisted: true, //reject non-whitelisted fields
      transform: true, //transform to class
    }),
  );

  // swagger configuration
  const config = new DocumentBuilder()
    .setTitle('RevenueOps Platform API')
    .setDescription('API documentation for RevenueOps Platform backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Failed to bootstrap the application', err);
  process.exit(1);
});
