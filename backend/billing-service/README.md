# Billing Service

Billing Service is the core backend of the **Billing Platform**.

It exposes a secure, multi-tenant REST API to manage **customers**, **products**, and **subscription plans**.  
The service is built as a **modular monolith** using **NestJS** and **Prisma**, with a strong focus on clean architecture and production-ready practices.

This service is Docker-first and production-oriented.

---

## Architecture

The application follows a modular structure:

- **auth** — JWT authentication and role-based access control  
- **tenant** — request-scoped tenant resolution  
- **customers** — customer management  
- **products** — product catalog  
- **plans** — subscription plans  
- **common** — shared utilities and DTOs  

### Key characteristics

- Modular monolith (NestJS)
- PostgreSQL database
- Prisma ORM with migrations
- JWT authentication
- ADMIN / USER roles
- Automatic tenant-based data scoping
- Docker-ready setup
- End-to-end test coverage for critical flows

---

## Environment Configuration

The service supports multiple environments:

- `.env` → local development (non-Docker)
- `.env.docker` → Docker runtime
- `.env.test` → end-to-end tests
- `.env.example` → template file (committed)

### Local setup (without Docker)

Copy the example file:

```
cp .env.example .env
```


Adjust values if needed.

Docker automatically uses `.env.docker`.

---


## Running the Service (Docker — Recommended)
From the project root:

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

## Security & Multi-Tenancy

- JWT-based authentication
- Role-based access control (ADMIN / USER)
- Tenant resolved per request
- Automatic data isolation at the service layer
- Multi-tenant isolation verified through e2e tests

---

## Code Quality

- ESLint + Prettier
- DTO validation with `class-validator`
- Jest (unit & e2e)
- Prisma schema-driven modeling

---

## Documentation

More detailed technical documentation (architecture decisions, domain model, roadmap) is available in:

```
docs/
```


