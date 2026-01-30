# Billing Service — Backend MVP

This repository contains the **Billing Service backend** for the *biling-platform* project.

It provides a REST API to manage:
- customers
- products
- billing plans

---

## Tech Stack

- **NestJS** — backend framework
- **Prisma** — ORM
- **PostgreSQL** — database
- **Docker & Docker Compose** — local infrastructure
- **TypeScript**

---

## Prerequisites

- Docker & Docker Compose
- Node.js ≥ 18
- npm ≥ 9

---

## Environment Variables

The project uses **two environments**:

- `.env` — development (Docker runtime)
- `.env.test` — e2e tests

Both files must exist before running the application.

---

## Start the Application (Recommended: Docker)

From the project root:

```bash
docker compose up --build
```

This starts:
- PostgreSQL (dev)
- PostgreSQL (test)
- Billing API

API will be available at:

```
http://localhost:3000
http://localhost:3000/docs
```

---

## Database Migrations

Apply existing migrations:
migrate deploy is non-interactive and safe for Docker, tests, and CI.

```
npx prisma migrate deploy
```

When modifying the Prisma schema (local development only)

```
npx prisma migrate dev
```

----

## Running the Application Without Docker (Optional)
```
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev

```

## Running End-to-End Tests
The e2e tests use a dedicated test database.

```
docker compose up -d postgres-test
npm run db:test:deploy
npm run test:e2e
```