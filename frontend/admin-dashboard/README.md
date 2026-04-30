# Admin Dashboard

This is the frontend admin application for the **Revenue & Billing Platform**.

It is not a customer-facing billing portal. It is an internal dashboard used by an admin to manage the billing lifecycle: customers, products, plans, subscriptions, invoices, payments, manual jobs, and analytics.

The frontend is built with **Next.js**, **React**, **Redux Toolkit**, and **RTK Query**. The application follows production-oriented frontend practices: authenticated API calls, paginated resources, URL-driven filters, and predictable cache refresh after mutations, while keeping the codebase readable and maintainable.

The backend already has an `ADMIN / USER` role model, but this frontend only implements the admin side. There is no customer portal yet for users to view their own subscriptions, invoices, or payments.

## Current Scope

The dashboard currently contains:

- **Dashboard** — billing analytics and revenue metrics
- **Customers** — paginated customer list, search, create/edit/delete flows
- **Products** — paginated product list, readable labels, create/edit/delete flows
- **Plans** — paginated plan list, product labels, create/edit/delete flows
- **Subscriptions** — filters, pagination, readable customer and plan labels
- **Invoices** — filters, pagination, readable customer/subscription context, status actions
- **Payments** — filters, pagination, readable invoice/customer context
- **Admin Jobs** — manual billing jobs triggered by an admin
- **Auth** — login, JWT storage, protected private routes

The dashboard focuses on the core billing administration workflows needed to demonstrate a realistic SaaS backoffice: lifecycle management, operational actions, and billing analytics.

## Running Locally

From `frontend/admin-dashboard`:

```bash
npm install
npm run dev
```

The app runs on:

```text
http://localhost:3001
```

Start the backend first. Next.js uses port `3000` by default, so it will usually move the dashboard to `3001` only when the backend is already using `3000`.

The backend API is expected on:

```text
http://localhost:3000
```

If needed, create a local env file:

```bash
cp .env.example .env.local
```

Main variable:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Backend Required

This dashboard depends on the `billing-service` backend. Start the backend first, and make sure the development seed has been run at least once before testing the dashboard.

From `backend/billing-service`:

```bash
npm install
npm run db:seed:dev
npm run start:dev
```

You do not need to reseed every time you start the frontend. Reseed when you want to restore predictable local demo data.

Without the seed, the API can run, but the demo admin login below will not exist yet.

## Login

With the development seed, the admin user is:

```text
email: admin@acme.com
password: password123
```

The login endpoint returns a JWT. The frontend stores it and sends it on API calls with:

```text
Authorization: Bearer <token>
```

If the dashboard suddenly shows API errors after reseeding or restarting things, the first simple fix is to log out and log in again.

## Project Structure

The useful folders are:

```text
src/app
src/features
src/components
src/lib
src/store
```

`src/app` contains the Next.js routes.

The private admin pages are under:

```text
src/app/(private)
```

`src/features` contains business modules. Each feature owns its API file, types, and UI components.

Examples:

```text
src/features/invoices
src/features/payments
src/features/subscriptions
```

`src/components/admin` contains small shared admin UI components:

- `PageHeader`
- `StatePanel`
- `PaginationControls`

These are deliberately small. We use them to remove obvious duplication, but we are not trying to build a full design system yet.

`src/lib` contains small helpers:

- `formatters.ts` for dates and money
- `query-params.ts` for parsing URL values
- `pagination.ts` for shared pagination defaults
- `env.ts` for frontend environment variables

## API Layer

The frontend uses RTK Query.

The base API lives in:

```text
src/store/api/base-api.ts
```

That file centralizes:

- the backend base URL
- the JWT `Authorization` header
- the shared RTK Query API instance

Each feature extends this base API.

For example, payments defines its own endpoints in:

```text
src/features/payments/payments-api.ts
```

This keeps the code readable: the payments page does not need to know how auth headers are added, and the global API config does not need to know every payments detail.

## URL As Source Of Truth

For list pages, the URL query string is the source of truth.

That means filters and pagination live in the URL:

```text
/invoices?status=OVERDUE&page=1&pageSize=10
/payments?invoiceId=1&status=SUCCESS&page=1&pageSize=10
```

This is useful because:

- refresh keeps the same filters
- copy/paste keeps the same view
- browser back/next works naturally
- the UI does not hide important state inside React only

The pattern is simple:

1. Read `searchParams`.
2. Parse values safely.
3. Build query params for RTK Query.
4. When a filter changes, update the URL.
5. When filters change, reset `page` to `1`.

Numeric values from the URL are parsed with:

```text
parsePositiveInteger()
```

If a value is missing or invalid, we ignore it instead of crashing the page.

## Pagination Pattern

List endpoints return paginated responses from the backend.

The frontend expects a shape like:

```ts
{
  data: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

The list page renders the rows, then passes pagination info to:

```text
PaginationControls
```

That component only knows how to display:

- current page
- total pages
- number of displayed results
- Previous button
- Next button

It does not know about invoices, customers, or payments. That is intentional.

## Loading, Error, Empty States

Most list pages use:

```text
StatePanel
```

It gives us a consistent way to show:

- loading
- error
- empty list

The important idea is not the component itself. The important idea is to avoid writing a slightly different loading/error block on every page.

## Cache Refresh

RTK Query caches API responses.

When a mutation changes billing data, the related cached data must be invalidated. Otherwise the UI can stay visually stale until a manual refresh.

Example:

- running `mark-overdue-invoices` changes invoices
- it may also affect analytics
- so the admin jobs API invalidates invoices and analytics tags

This is why some mutations invalidate several tags. It is not random. It reflects the business impact of the action.

As a rule:

- creating or editing customers should refresh customers and sometimes analytics
- creating payments should refresh payments, invoices, and analytics
- admin jobs should refresh the billing data they can change
- analytics should refresh after billing mutations that affect revenue or status counts

This is one of the easiest places to create subtle UI bugs, so keep it explicit.

## Readable Labels

The dashboard tries not to show raw IDs when a human-readable label is available.

For example:

- plans display product name/code instead of only `productId`
- subscriptions display customer and plan labels
- invoices display invoice numbers and customer context
- payments display invoice numbers instead of only `invoiceId`

IDs are still useful internally and in URLs, but the UI should help an admin understand the data without opening the database.

## Admin Jobs

The Admin Jobs page triggers manual backend jobs:

```text
mark-overdue-invoices
update-past-due-subscriptions
renew-due-subscriptions
generate-due-invoices
```

These jobs are not automatic cron jobs yet. The frontend only provides buttons to run them manually.

After a job runs, the frontend displays the returned summary:

```ts
{
  scanned: number;
  updated: number;
  skipped: number;
}
```

The same action also refreshes the related RTK Query cache so pages like invoices, subscriptions, and analytics do not require a manual browser refresh.

## Common Local Issues

If the UI shows an error but the build passes, check the backend first.

Useful checks:

```bash
curl http://localhost:3000/healthz
```

If protected endpoints return `401`, log in again from the UI.

If the frontend expects new fields but the backend returns an old response shape, the backend is probably running from an old build. This can happen when starting from `dist`.

In that case, from `backend/billing-service`:

```bash
npm run build
npm run start:dev
```

For local development, prefer `start:dev` because it runs the current source code in watch mode.

## Quality Checks

Run lint:

```bash
npm run lint
```

Build the frontend:

```bash
npm run build
```

Run the browser smoke test:

```bash
npx playwright install chromium
npm run test:e2e
```

The smoke test expects the backend to be running on `http://localhost:3000` with development seed data available.

Before considering the frontend stable, also make sure the backend is running and manually check the main pages:

```text
/dashboard
/customers
/products
/plans
/subscriptions
/invoices
/payments
/admin-jobs
```

## Current Design Approach

The UI prioritizes clarity, predictable workflows, and reliable billing operations. Visual polish can be improved over time without changing the billing logic underneath.

The next useful UI improvements would be:

- better dashboard layout and hierarchy
- clearer empty states
- richer selects for invoices/subscriptions
- more helpful error messages from API responses
- better confirmation flows for destructive actions

Those are good next steps, but they should not come before keeping the billing logic and cache behavior reliable.
