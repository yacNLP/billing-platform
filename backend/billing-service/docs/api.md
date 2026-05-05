# API — RevenueOps Backend

The RevenueOps Backend exposes a REST JSON API for RevenueOps Platform.

Swagger / OpenAPI is available at:

```text
/docs
```

## Conventions

- JSON request and response bodies
- ISO 8601 dates
- monetary amounts in minor units
- Bearer JWT authentication
- tenantId derived from the authenticated user
- ADMIN-only write operations for core billing management

Authorization header:

```text
Authorization: Bearer <JWT>
```

## Pagination

List endpoints return a paginated response:

```ts
type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
```

Common query params:

- `page`
- `pageSize`

Some modules also support search, filters, and sorting.

## Errors

The API uses standard HTTP semantics:

- `400` — validation or invalid business request
- `401` — unauthenticated
- `403` — forbidden by role or tenant guard
- `404` — resource not found
- `409` — conflict or unique constraint

## Auth

```text
POST /auth/login
```

Returns a JWT access token used by the admin dashboard.

## Customers

```text
GET    /customers
GET    /customers/:id
POST   /customers
PATCH  /customers/:id
DELETE /customers/:id
```

List filters:

- `search`
- `sortBy`
- `order`
- `page`
- `pageSize`

Rules:

- email is unique per tenant
- write operations are ADMIN-only

## Products

```text
GET    /products
GET    /products/:id
POST   /products
PATCH  /products/:id
DELETE /products/:id
```

List filters:

- `q`
- `isActive`
- `sortBy`
- `order`
- `page`
- `pageSize`

Rules:

- products can be active or inactive
- delete can be blocked by plan references
- write operations are ADMIN-only

## Plans

```text
GET    /plans
GET    /plans/:id
POST   /plans
PATCH  /plans/:id
DELETE /plans/:id
```

List filters:

- `search`
- `active`
- `currency`
- `sort`
- `order`
- `page`
- `pageSize`

Rules:

- plan code is unique per tenant
- plan belongs to a product from the same tenant
- `productId` is immutable
- plans use soft delete
- write operations are ADMIN-only

Supported intervals:

- `DAY`
- `WEEK`
- `MONTH`
- `YEAR`

## Subscriptions

```text
GET   /subscriptions
GET   /subscriptions/:id
POST  /subscriptions
PATCH /subscriptions/:id/cancel
```

List filters:

- `status`
- `customerId`
- `planId`
- `page`
- `pageSize`

Statuses:

- `ACTIVE`
- `CANCELED`
- `EXPIRED`
- `PAST_DUE`

Rules:

- one customer can have only one `ACTIVE` subscription
- creating a subscription creates an initial invoice
- subscription snapshots plan price and billing cadence
- cancellation can be immediate or scheduled at period end
- write operations are ADMIN-only

## Invoices

```text
GET   /invoices
GET   /invoices/:id
POST  /invoices
PATCH /invoices/:id/paid
PATCH /invoices/:id/void
PATCH /invoices/:id/overdue
```

List filters:

- `status`
- `customerId`
- `subscriptionId`
- `page`
- `pageSize`

Statuses:

- `ISSUED`
- `PAID`
- `VOID`
- `OVERDUE`

Rules:

- invoice numbers are tenant-scoped
- overlapping invoices for the same subscription period are rejected
- paid and void invoices are not modified by overdue jobs
- write operations are ADMIN-only

## Payments

```text
GET  /payments
GET  /payments/:id
POST /payments
```

List filters:

- `status`
- `invoiceId`
- `customerId`
- `page`
- `pageSize`

Statuses:

- `SUCCESS`
- `FAILED`

Rules:

- payment currency must match invoice currency
- successful payment marks the linked invoice as `PAID`
- failed payment is recorded without paying the invoice
- provider fields are metadata only
- create is ADMIN-only

## Admin Jobs

```text
POST /admin/jobs/mark-overdue-invoices
POST /admin/jobs/update-past-due-subscriptions
POST /admin/jobs/renew-due-subscriptions
POST /admin/jobs/generate-due-invoices
```

All admin jobs are ADMIN-only.

They return:

```ts
type JobSummary = {
  scanned: number;
  updated: number;
  skipped: number;
};
```

These jobs are manually triggered. There is no cron scheduler yet.

## Analytics

```text
GET /analytics/summary
```

Returns tenant-scoped metrics:

- total customers
- active subscriptions
- past due subscriptions
- issued invoices
- paid invoices
- overdue invoices
- total revenue paid
- revenue this month
- total amount due
- overdue amount
- failed payments
- successful payments
- payment success rate
- estimated MRR
- subscriptions by plan

## Versioning

The API is currently unversioned.

A `/v1` prefix can be introduced later if external API compatibility becomes a requirement.
