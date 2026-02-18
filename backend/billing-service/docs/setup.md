# Setup & Environment — Billing Service

## 1. Overview

The Billing Service supports multiple environments:

- Development (local)
- Docker runtime
- Test environment (e2e)
- Production (future)

Environment configuration is managed via `.env` files.

---

## 2. Environment Files

The project uses:

- `.env` → local development
- `.env.docker` → Docker runtime
- `.env.test` → E2E testing
- `.env.example` → template (committed)

Each environment defines:

- DATABASE_URL
- SHADOW_DATABASE_URL (Prisma migrations)
- PORT
- NODE_ENV

---

## 3. Running with Docker (Recommended)

From project root:

```
docker compose up --build
```

This will:

- Start PostgreSQL
- Apply Prisma migrations (`migrate deploy`)
- Start the API

The API will be available at:

- http://localhost:3000  
- http://localhost:3000/docs

## Running Without Docker (Optional)

Inside `backend/billing-service`:

- Install dependencies

```
npm install
```

- Generate Prisma client:

```
npx prisma generate
```

- Apply migrations:

```
npx prisma migrate dev
```

- Start the server:

```
npm run start:dev
```

---


##  Database Migrations : 
Production-safe migrations:
```
npx prisma migrate deploy
```

### Seed (Development Only)
```
npm run db:seed:dev
```

---
## Testing
End-to-end tests run against a dedicated test database.
- Start the test database:

```
docker compose up -d postgres-test
```

- Apply test migrations:
```
npm run db:test:deploy
```
- Run e2e tests:
```
npm run test:e2e
```
- To reset the test database:
```
npm run db:test:reset
```


---
