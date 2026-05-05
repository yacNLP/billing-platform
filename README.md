# RevenueOps Platform

RevenueOps Platform is a B2B SaaS application for managing subscription lifecycles, billing workflows, payments, admin operations, and revenue analytics.

It covers customers, products, plans, subscriptions, invoices, payments, manual billing jobs, and business analytics in a secure multi-tenant architecture.

The project is built as a modular monolith: one backend application with clear domain modules, backed by PostgreSQL and exposed through a React admin dashboard.

## Product Scope

Implemented modules:

- Authentication with JWT and ADMIN / USER roles
- Tenant-based data isolation
- Customers
- Products
- Plans
- Subscriptions
- Invoices
- Payments
- Admin billing jobs
- Analytics dashboard
- Admin frontend dashboard

The `USER` role exists in the backend authorization model, but the current frontend scope is admin-only. A customer/user portal is not implemented yet.

Main business flows:

- Create customers, products, and pricing plans
- Create subscriptions from customers and plans
- Generate and manage invoices
- Record successful or failed payments
- Mark invoices overdue and subscriptions past due
- Renew due subscriptions through admin jobs
- Track revenue, MRR, overdue amounts, payment success rate, and subscriptions by plan

## Architecture

Backend:

- NestJS
- Prisma
- PostgreSQL
- JWT authentication
- Role-based access control
- Request-scoped tenant context
- Swagger / OpenAPI at `/docs`
- Jest + Supertest e2e tests

Frontend:

- Next.js
- React
- Redux Toolkit Query
- Admin dashboard with protected routes
- URL-driven listings, filters, and pagination

Infrastructure:

- Docker Compose for local PostgreSQL and API runtime
- Separate test database
- GitHub Actions CI for backend build and e2e tests

## Repository Structure

```text
backend/billing-service      NestJS billing API
frontend/admin-dashboard     Next.js admin dashboard
docker-compose.yml           Local PostgreSQL/API setup
```

## Quick Start

Start PostgreSQL and the backend API with Docker:

```bash
docker compose up --build
```

Docker applies migrations automatically. To log in to the admin dashboard, seed the development data once from `backend/billing-service`:

```bash
npm run db:seed:dev
```

The API is available at:

```text
http://localhost:3000
http://localhost:3000/docs
```

For local frontend development:

```bash
cd frontend/admin-dashboard
cp .env.example .env.local
npm install
npm run dev
```

Start the backend first. Since the backend uses port `3000`, Next.js will usually start the dashboard on:

```text
http://localhost:3001
```

If the frontend is started before the backend, Next.js may take port `3000`. In that case, stop it, start the backend, then restart the frontend.

## Local Backend Development

```bash
cd backend/billing-service
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Seed development data:

```bash
npm run db:seed:dev
```

For a clean development database, reset before seeding:

```bash
npx prisma migrate reset
npm run db:seed:dev
```

Use reset only in development or test environments. It deletes existing data.

## Quality Checks

Backend:

```bash
cd backend/billing-service
npm run lint
npm run test:e2e
```

Frontend:

```bash
cd frontend/admin-dashboard
npm run lint
npm run build
```

Recent smoke checks passed:

- Backend lint
- Backend e2e tests
- Frontend lint
- Frontend build
- Development seed

## Admin Dashboard Pages

Current protected admin pages:

- `/dashboard`
- `/customers`
- `/products`
- `/plans`
- `/subscriptions`
- `/invoices`
- `/payments`
- `/admin-jobs`

## Explicit Non-Goals For The Current Version

The current version does not include:

- Real Stripe integration
- Webhooks
- Automatic cron scheduling
- Email reminders
- Coupons or discounts
- Advanced tax/VAT handling
- Refunds
- Accounting export
- Invoice PDF generation
- Advanced revenue forecasting
- Full audit log

Payments currently store provider metadata manually. Admin jobs are triggered manually from the dashboard.

## Documentation

Backend documentation is available in:

```text
backend/billing-service/README.md
backend/billing-service/docs/
```

Some documentation files are being updated to match the current product scope.
