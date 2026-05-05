# Architecture — RevenueOps Backend

RevenueOps Backend is the backend API of RevenueOps Platform.

It is implemented as a **modular monolith**: one NestJS application, split into clear business modules, backed by PostgreSQL through Prisma.

## High-Level Flow

```text
Admin Dashboard / API Client
        |
        v
NestJS Controllers
        |
        v
Global Guards
JWT -> Tenant -> Roles
        |
        v
DTO Validation
        |
        v
Domain Services
        |
        v
Prisma ORM
        |
        v
PostgreSQL
```

## Why Modular Monolith

The project intentionally avoids microservices at this stage.

Reasons:

- simpler local development
- simpler deployment
- easier transactions across billing entities
- lower operational complexity
- still allows clean domain boundaries

Future extraction remains possible for domains such as payments, analytics, notifications, or billing orchestration if the product grows.

## Modules

Current backend modules:

- `auth` — login, JWT strategy, role model, public routes
- `common/tenant` — request-scoped tenant resolution
- `customers` — customer CRUD and search
- `products` — product catalog
- `plans` — pricing plans and billing cadence
- `subscriptions` — recurring commercial relationship and lifecycle
- `invoices` — financial documents and statuses
- `payments` — payment records and invoice settlement
- `admin-jobs` — manual billing orchestration endpoints
- `analytics` — tenant-scoped billing metrics
- `common` — shared DTOs, transformers, interceptors, utilities
- `prisma` — Prisma service and database access

Each business module typically contains:

- controller
- service
- DTOs
- e2e tests
- Prisma-backed persistence

## Multi-Tenancy

The system uses logical multi-tenancy in a shared PostgreSQL database.

Core approach:

- users belong to one tenant
- JWT payload contains `tenantId`
- `TenantGuard` attaches tenant context to the request
- `TenantContext` exposes tenantId to services
- services add tenant filters to Prisma queries
- schema constraints use tenant-scoped uniqueness where needed

Tenant isolation is validated by dedicated e2e tests.

## Authentication And Authorization

Authentication:

- JWT-based
- stateless access tokens
- global `JwtAuthGuard`
- public login route

Authorization:

- `ADMIN`
- `USER`
- global `RolesGuard`
- write/admin operations restricted through `@Roles(Role.ADMIN)`

Tenant resolution:

- global `TenantGuard`
- request-scoped tenant context

## Validation

Validation is handled globally with NestJS `ValidationPipe`:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

DTOs use `class-validator` and `class-transformer` to validate and normalize input.

## Data Model And Persistence

Prisma is used as the data access layer.

Design decisions:

- PostgreSQL as primary database
- schema-driven modeling
- migrations managed by Prisma
- monetary values stored in minor units
- tenant-scoped entities include `tenantId`
- plans use soft delete
- most other entities preserve financial history through domain rules rather than hard deletion

## Billing Orchestration

Billing orchestration is currently exposed through manual Admin Jobs:

- mark overdue invoices
- update past due subscriptions
- renew due subscriptions
- generate due invoices

These jobs are ADMIN-only and return a summary:

```ts
{
  scanned: number;
  updated: number;
  skipped: number;
}
```

There is no automatic cron scheduling yet.

## Analytics

Analytics is computed from tenant-scoped billing data.

The service aggregates:

- customers
- subscriptions
- invoices
- payments
- MRR estimate
- revenue
- overdue exposure
- subscriptions by plan

## Error Semantics

The API uses standard HTTP errors:

- `400` — invalid input or invalid business request
- `401` — missing or invalid auth
- `403` — insufficient role or tenant missing
- `404` — resource not found
- `409` — unique constraint or business conflict

## Delivery Model

Local delivery:

- Docker Compose for PostgreSQL and API runtime
- separate PostgreSQL test database
- Prisma migrations
- dev seed script

CI:

- GitHub Actions for backend install, Prisma generation, migrations, build, and e2e tests

Frontend CI is still a next step.
