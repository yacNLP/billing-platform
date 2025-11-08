// test/products.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Server } from 'http';
import { PrismaService } from '../src/prisma.service';

interface ProductDto {
  id: number;
  name: string;
  sku: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  taxRate: string;
  isActive: boolean;
  stock: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

describe('Products e2e', () => {
  let app: INestApplication;
  let server: Server;
  let createdId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // global validation like in prod
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    server = app.getHttpServer() as Server;

    // clean table to avoid collisions across runs
    const prisma = app.get<PrismaService>(PrismaService);
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /products -> create', async () => {
    // nominal creation
    const res = await request(server)
      .post('/products')
      .send({
        name: 'Test Product',
        sku: 'TEST-001',
        priceCents: 1234,
        stock: 5,
      })
      .expect(201);

    const body = res.body as ProductDto;
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Test Product');
    expect(body.sku).toBe('TEST-001');
    expect(body.priceCents).toBe(1234);
    expect(body.stock).toBe(5);
    createdId = body.id;
  });

  it('GET /products -> list with pagination & filters', async () => {
    // list should support paging, sorting and filters
    const res = await request(server)
      .get('/products')
      .query({
        page: 1,
        pageSize: 10,
        q: 'test',
        sortBy: 'createdAt',
        order: 'desc',
        minPriceCents: 100,
        maxPriceCents: 2000,
        isActive: 'true',
      })
      .expect(200);

    const body = res.body as Paginated<ProductDto>;
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(typeof body.totalPages).toBe('number');
  });

  it('GET /products/:id -> one', async () => {
    // fetch by id should return the created product
    const res = await request(server).get(`/products/${createdId}`).expect(200);
    const body = res.body as ProductDto;
    expect(body.id).toBe(createdId);
    expect(body.sku).toBe('TEST-001');
  });

  it('PATCH /products/:id -> update', async () => {
    // update should modify selected fields only
    const res = await request(server)
      .patch(`/products/${createdId}`)
      .send({ priceCents: 1500, stock: 9 })
      .expect(200);

    const body = res.body as ProductDto;
    expect(body.priceCents).toBe(1500);
    expect(body.stock).toBe(9);
  });

  it('Validation error on bad sku', async () => {
    // invalid sku format should be rejected with 400
    await request(server)
      .post('/products')
      .send({ name: 'X', sku: 'bad sku with space', priceCents: 100 })
      .expect(400);
  });

  it('409 on duplicate SKU (create)', async () => {
    // create once
    await request(server)
      .post('/products')
      .send({ name: 'Dup A', sku: 'DUP-001', priceCents: 100, stock: 1 })
      .expect(201);
    // create again with same sku -> conflict
    await request(server)
      .post('/products')
      .send({ name: 'Dup B', sku: 'DUP-001', priceCents: 200, stock: 2 })
      .expect(409);
  });

  it('404 on GET non-existent product', async () => {
    // explicit not found (id that does not exist)
    await request(server).get('/products/999999').expect(404);
  });

  it('404 on PATCH non-existent product', async () => {
    // update on a missing id -> not found
    await request(server)
      .patch('/products/999999')
      .send({ priceCents: 123 })
      .expect(404);
  });

  it('404 on DELETE non-existent product', async () => {
    // delete on a missing id -> not found
    await request(server).delete('/products/999999').expect(404);
  });

  it('DELETE /products/:id -> remove', async () => {
    // delete previously created product
    await request(server).delete(`/products/${createdId}`).expect(200);
    // now it should be gone
    await request(server).get(`/products/${createdId}`).expect(404);
  });
});
