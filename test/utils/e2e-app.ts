// test/utils/e2e-app.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { Server } from 'http';

export interface TestApp {
  app: INestApplication;
  server: Server;
}

/**
 * Create a real NestJS application instance for e2e tests.
 * - Uses the real AppModule
 * - Applies same global pipes as in main.ts
 */
export async function createE2eApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const server = app.getHttpServer() as Server;

  return { app, server };
}
