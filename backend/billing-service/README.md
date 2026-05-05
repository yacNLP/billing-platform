# RevenueOps Backend

RevenueOps Backend is the backend API of the **RevenueOps Platform**.

It exposes a secure multi-tenant REST API for managing the core revenue lifecycle of a subscription business: customers, products, plans, subscriptions, invoices, payments, manual billing jobs, and analytics.

The service is built as a **modular monolith** with **NestJS**, **Prisma**, and **PostgreSQL**. It is intentionally kept as one deployable backend while preserving clear domain boundaries.

## Current Scope

Implemented backend domains:

- **auth** — JWT login, token validation, ADMIN / USER roles
- **tenant** — request-scoped tenant resolution and data isolation
- **customers** — customer CRUD, search, pagination
- **products** — product CRUD, active/inactive state, search, pagination
- **plans** — pricing plans, billing interval, soft delete, filters, pagination
- **subscriptions** — subscription creation, periods, cancellation, renewal logic
- **invoices** — invoice creation, numbering, statuses, paid/void/overdue actions
- **payments** — success/failed payment recording linked to invoices
- **admin-jobs** — manual billing orchestration jobs
- **analytics** — billing metrics, MRR estimation, revenue and overdue KPIs
- **common** — shared DTOs, transformers, logging, tenant utilities

## Main Business Rules

- Each authenticated user belongs to one tenant.
- All business data is scoped by `tenantId`.
- A customer can have only one `ACTIVE` subscription at a time.
- Creating a subscription creates the initial invoice for the current period.
- A successful payment marks the linked invoice as `PAID`.
- Issued invoices past their due date can be marked `OVERDUE`.
- Subscriptions with unpaid overdue invoices can move to `PAST_DUE`.
- Due subscriptions can be renewed manually through admin jobs.
- Invoice generation is idempotent for a subscription period.

## API Documentation

Swagger / OpenAPI is available when the API is running:

```text
http://localhost:3000/docs
```

The API is JSON-based and uses:

- Bearer JWT authentication
- DTO validation with `class-validator`
- Pagination for list endpoints
- Standard HTTP errors: `400`, `401`, `403`, `404`, `409`

## Environment Configuration

The service uses environment-specific files:

- `.env` — local development
- `.env.test` — e2e test database
- `.env.example` — committed template

Docker Compose defines its local development variables directly in `docker-compose.yml`, so no `.env.docker` file is required for a fresh clone.

Create a local env file:

```bash
cp .env.example .env
```

Main variables:

- `DATABASE_URL`
- `SHADOW_DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `JWT_SECRET`
- `CORS_ORIGIN`

For deployed environments, set `JWT_SECRET` to a strong private value and set `CORS_ORIGIN` to the deployed frontend URL. Multiple origins can be comma-separated.

## Running With Docker

From the repository root:

```bash
docker compose up --build
```

This starts PostgreSQL, applies Prisma migrations, and starts the API.

API URLs:

```text
http://localhost:3000
http://localhost:3000/docs
```

## Running Locally Without Docker

Inside `backend/billing-service`:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

## Database Commands

Apply production-safe migrations:

```bash
npx prisma migrate deploy
```

Seed development data:

```bash
npm run db:seed:dev
```

Reset and reseed a local development database:

```bash
npx prisma migrate reset
npm run db:seed:dev
```

Use reset only in development or test environments. It deletes existing data.

## Testing

End-to-end tests run against a dedicated PostgreSQL test database.

Start the test database from the repository root:

```bash
docker compose up -d postgres-test
```

Apply test migrations:

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

Current e2e suites cover:

- customers
- products
- plans
- subscriptions
- invoices
- payments
- admin jobs
- analytics
- multi-tenant isolation

## Code Quality

Run lint:

```bash
npm run lint
```

Build the backend:

```bash
npm run build
```

The project uses:

- ESLint
- Prettier
- Prisma schema and migrations
- NestJS global `ValidationPipe`
- Jest and Supertest for e2e tests

## Security & Multi-Tenancy

Security is enforced through global guards:

- `JwtAuthGuard`
- `TenantGuard`
- `RolesGuard`

Tenant isolation is handled by:

- tenant-aware JWT payloads
- request-scoped `TenantContext`
- tenant-scoped Prisma queries in services
- e2e tests validating cross-tenant isolation

## Admin Jobs

Admin jobs are manual operations exposed under:

```text
POST /admin/jobs/mark-overdue-invoices
POST /admin/jobs/update-past-due-subscriptions
POST /admin/jobs/renew-due-subscriptions
POST /admin/jobs/generate-due-invoices
```

They are restricted to `ADMIN` users.

These are not cron jobs yet. They are triggered from the admin dashboard or directly through the API.

## Analytics

The analytics endpoint exposes a tenant-scoped billing summary:

```text
GET /analytics/summary
```

Tracked metrics include:

- total customers
- active subscriptions
- past due subscriptions
- issued / paid / overdue invoices
- total paid revenue
- revenue this month
- total amount due
- overdue amount
- successful / failed payments
- payment success rate
- estimated MRR
- subscriptions by plan

## Frontend Integration

This backend is consumed by:

```text
frontend/admin-dashboard
```

The frontend provides protected admin pages for:

- dashboard
- customers
- products
- plans
- subscriptions
- invoices
- payments
- admin jobs

## Explicit Non-Goals For The Current Version

The backend does not currently implement:

- real Stripe integration
- webhooks
- automatic cron scheduling
- email reminders
- coupons or discounts
- advanced tax/VAT handling
- refunds
- accounting export
- invoice PDF generation
- advanced revenue forecasting
- full audit log

Payment provider fields are stored as metadata only.

## Documentation

More backend documentation is available in:

```text
docs/
```

Some documentation files are still being updated to match the current product scope.
