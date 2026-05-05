# Testing Strategy — RevenueOps Backend

The backend test strategy is centered on end-to-end tests because most value in this project comes from validating real billing flows, tenant isolation, guards, database constraints, and Prisma transactions together.

## Primary Test Type

E2E tests:

- boot a real NestJS application
- use real controllers, guards, services, and pipes
- run against a dedicated PostgreSQL test database
- execute real HTTP requests through Supertest
- apply Prisma migrations before the suite

This is intentional. Billing bugs often happen at integration boundaries: auth, tenant scoping, transactions, status transitions, and unique constraints.

## Current E2E Coverage

Current test suites cover:

- `customers.e2e-spec.ts`
- `products.e2e-spec.ts`
- `plans.e2e-spec.ts`
- `subscriptions.e2e-spec.ts`
- `invoices.e2e-spec.ts`
- `payments.e2e-spec.ts`
- `admin-jobs.e2e-spec.ts`
- `analytics.e2e-spec.ts`
- `multi-tenant-isolation.e2e-spec.ts`

Recent smoke run:

- 9 suites passed
- 95 tests passed

## What The Tests Validate

The e2e suite validates:

- JWT authentication
- ADMIN / USER authorization
- tenant isolation
- DTO validation
- pagination and filtering
- customer/product/plan CRUD
- plan soft delete
- subscription creation and cancellation
- one active subscription per customer
- initial invoice creation
- invoice paid / void / overdue actions
- anti-overlap invoice generation
- payment success and failure flows
- admin jobs summaries and idempotence
- analytics summary metrics

## Test Database

Tests use a separate PostgreSQL database configured through `.env.test`.

Start it from the repository root:

```bash
docker compose up -d postgres-test
```

Apply migrations:

```bash
npm run db:test:deploy
```

Run tests:

```bash
npm run test:e2e
```

Reset the test database:

```bash
npm run db:test:reset
```

## CI

The repository includes a GitHub Actions workflow for the backend.

The CI pipeline currently runs:

- dependency install
- Prisma client generation
- migrations
- backend build
- backend e2e tests

Frontend lint/build is not yet part of CI.

## Unit Tests

The project currently prioritizes e2e tests over isolated unit tests.

Unit tests may be added later for:

- pure date calculation helpers
- billing interval calculations
- analytics calculations
- complex renewal edge cases

## Testing Principles

- Prefer realistic behavior over mocks.
- Test business rules at API level.
- Keep tenant isolation explicit.
- Cover idempotent jobs and financial state transitions.
- Use database-backed tests for constraints and transactional flows.
