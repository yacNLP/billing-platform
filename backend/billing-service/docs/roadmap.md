# Roadmap — RevenueOps Backend

This roadmap reflects the current state of the backend and the next pragmatic steps.

## Completed

Core platform:

- modular NestJS backend
- Prisma + PostgreSQL
- Docker Compose local environment
- JWT authentication
- ADMIN / USER roles
- tenant-scoped data isolation
- global validation
- Swagger / OpenAPI at `/docs`

Business domains:

- customers
- products
- plans
- subscriptions
- invoices
- payments
- admin billing jobs
- analytics

Frontend integration:

- backend consumed by the admin dashboard
- paginated/filterable list contracts used by frontend

Quality:

- e2e tests for core modules
- multi-tenant isolation tests
- backend CI with build and e2e tests

## Current Version

The current version is a functional RevenueOps Platform backend.

It supports:

- creating customer/product/plan records
- creating one active subscription per customer
- generating initial invoices
- recording payments
- marking invoices paid/void/overdue
- running manual billing jobs
- computing billing analytics

Admin jobs are manual, not scheduled.

Payment provider fields are stored as metadata only. There is no real Stripe integration yet.

The `USER` role exists for authorization and tenant-scoped access, but there is no customer/user portal implemented yet. The current frontend is an admin dashboard.

## Short-Term Documentation Work

The current priority is documentation alignment:

- keep root README product-oriented
- keep backend README operational
- update API documentation
- update domain model
- document billing lifecycle
- document current limits and next steps

## Short-Term Engineering Improvements

High-value next improvements:

- add frontend lint/build to CI
- add clearer demo credentials documentation
- add smoke test checklist
- improve error normalization
- add confirmation UX for destructive/admin actions if missing
- review old `admin-billing` folder if still unused

## Product Next Steps

Potential product improvements:

- customer/user portal for viewing subscriptions, invoices, and payments
- automated cron scheduling for billing jobs
- email reminders for overdue invoices
- invoice PDF generation
- real payment provider integration
- webhook handling
- refunds
- coupons or discounts
- tax/VAT handling
- audit log
- richer revenue analytics

## DevOps Next Steps

Potential delivery improvements:

- frontend CI checks
- Docker image publishing
- production-like Docker Compose profile
- environment validation
- deployment documentation
- structured logs and monitoring
- metrics endpoint

## Explicit Non-Goals For Now

Not part of the current version:

- microservices
- real Stripe integration
- webhooks
- cron automation
- full accounting system
- marketplace flows
- advanced revenue forecasting

## Architecture Direction

The project should stay a modular monolith until domain complexity justifies extraction.

Possible future extraction candidates:

- payment integration
- notification service
- analytics service
- billing job runner

For now, keeping one backend is the correct tradeoff.
