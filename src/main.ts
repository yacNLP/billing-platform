import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .setTitle('Billing Platform API')
    .setDescription('API documentation for Billing Platform backend')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
