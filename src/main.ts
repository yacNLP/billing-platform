import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // 👈 import

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👇 apply global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //only allow whitelisted fields
      forbidNonWhitelisted: true, //reject non-whitelisted fields
      transform: true, //transform to class
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
