import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';

interface CustomerDto {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

describe('Customers e2e', () => {
  let app: INestApplication;
  let server: Server;
  let createdId: number; // store the created customer ID across tests

  beforeAll(async () => {
    // Build a full AppModule like in production
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // same global validation behavior
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // initialize the app (starts the HTTP server internally)
    await app.init();

    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /customers (create)', async () => {
    const res = await request(server)
      .post('/customers')
      .send({ name: 'Test User', email: `test_${Date.now()}@example.com` })
      .expect(201);

    // narrow the response body to the expected shape
    const body = res.body as CustomerDto;

    // ersist the created ID for subsequent tests
    createdId = body.id;

    expect(body.email).toContain('@example.com');
  });

  it('GET /customers (list paginated)', async () => {
    const res = await request(server)
      .get('/customers?page=1&pageSize=2&orderBy=createdAt&order=desc')
      .expect(200);

    const body = res.body as Paginated<CustomerDto>;

    // expecting a common paginated format
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  it('GET /customers/:id (found)', async () => {
    // Fetch previously created customer by ID
    await request(server).get(`/customers/${createdId}`).expect(200);
  });

  it('PATCH /customers/:id (update)', async () => {
    await request(server)
      .patch(`/customers/${createdId}`)
      .send({ name: 'Renamed' })
      .expect(200);
  });

  it('DELETE /customers/:id (204)', async () => {
    await request(server).delete(`/customers/${createdId}`).expect(204);
  });

  it('GET /customers/:id (404 after delete)', async () => {
    // Resource should not be found after deletion
    await request(server).get(`/customers/${createdId}`).expect(404);
  });
});
