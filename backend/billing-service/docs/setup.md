# Setup — Billing Service

This document explains how to run the backend locally, seed development data, and run the test database.

## Environments

The backend uses separate environment files:

- `.env` — local backend development
- `.env.test` — e2e tests
- `.env.example` — committed template

Docker Compose defines its local development variables directly in `docker-compose.yml`, so a fresh clone does not need a `.env.docker` file.

Main variables:

- `DATABASE_URL`
- `SHADOW_DATABASE_URL`
- `PORT`
- `NODE_ENV`

## Docker Setup

From the repository root:

```bash
docker compose up --build
```

This starts:

- `postgres` on port `5432`
- `api` on port `3000`

The API is available at:

```text
http://localhost:3000
http://localhost:3000/docs
```

The Docker API startup command applies Prisma migrations before starting the NestJS application.

## Local Backend Setup

Inside `backend/billing-service`:

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

## Development Seed

Seed realistic development data:

```bash
npm run db:seed:dev
```

For a clean local database, reset before seeding:

```bash
npx prisma migrate reset
npm run db:seed:dev
```

Use reset only in development or test environments. It deletes existing data.

The dev seed creates representative data for:

- tenant
- users
- customers
- products
- plans
- subscriptions
- initial invoices
- payments

## Test Database

Start the dedicated test database from the repository root:

```bash
docker compose up -d postgres-test
```

Apply migrations to the test database:

```bash
npm run db:test:deploy
```

Run e2e tests:

```bash
npm run test:e2e
```

Reset the test database:

```bash
npm run db:test:reset
```

## Frontend Integration

The backend is consumed by `frontend/admin-dashboard`.

The frontend expects:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

If the backend runs on `3000`, Next.js usually starts the admin dashboard on `3001`.
