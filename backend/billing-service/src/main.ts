import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validateRuntimeEnv } from './config/env';
import helmet from 'helmet';

function isSwaggerEnabled(): boolean {
  const configuredValue = process.env.ENABLE_SWAGGER?.trim().toLowerCase();

  if (configuredValue) {
    return ['1', 'true', 'yes', 'on'].includes(configuredValue);
  }

  return process.env.NODE_ENV !== 'production';
}

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
  validateRuntimeEnv();

  const app = await NestFactory.create(AppModule);
  const swaggerEnabled = isSwaggerEnabled();

  app.use(
    helmet({
      contentSecurityPolicy: swaggerEnabled ? false : undefined,
    }),
  );

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

  if (swaggerEnabled) {
    // swagger configuration
    const config = new DocumentBuilder()
      .setTitle('RevenueOps Platform API')
      .setDescription('API documentation for RevenueOps Platform backend')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Failed to bootstrap the application', err);
  process.exit(1);
});
