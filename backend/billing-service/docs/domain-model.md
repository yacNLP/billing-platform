# Domain Model — RevenueOps Backend

The domain model represents a multi-tenant revenue operations platform for subscription businesses.

Each tenant manages its own customers, catalog, subscriptions, invoices, payments, jobs, and analytics data. Tenant isolation is the top-level rule.

## Multi-Tenancy

Most business entities include:

- `tenantId`
- a relation to `Tenant`

Isolation is enforced through:

- tenant-scoped Prisma queries
- request-scoped `TenantContext`
- composite unique constraints where needed
- e2e tests covering cross-tenant access

Examples:

- customer email is unique per tenant
- plan code is unique per tenant
- invoice numbers are tenant-scoped

## Core Entities

### Tenant

Represents an organization using the platform.

Owns:

- users
- customers
- products
- plans
- subscriptions
- invoices
- payments

### User

Represents an authenticated user.

Important fields:

- `email`
- `password`
- `role`
- `tenantId`

Supported roles:

- `ADMIN`
- `USER`

### Customer

Represents a client of the tenant.

Important fields:

- `name`
- `email`
- `tenantId`

Rules:

- email is unique per tenant
- a customer can have at most one `ACTIVE` subscription at a time

### Product

Represents a sellable product family or service category.

Important fields:

- `name`
- `description`
- `isActive`
- `tenantId`

Relations:

- one product can have many plans

### Plan

Represents a pricing offer attached to a product.

Important fields:

- `code`
- `name`
- `productId`
- `amount`
- `currency`
- `interval`
- `intervalCount`
- `trialDays`
- `active`
- `deletedAt`

Rules:

- code is unique per tenant
- `productId` is immutable after creation
- plans use soft delete
- deleted plans are excluded from normal list queries
- pricing lives on the plan, not on the product

`trialDays` exists as plan metadata, but the current subscription lifecycle does not implement a full trial flow.

### Subscription

Represents the recurring commercial relationship between a customer and a plan.

Important fields:

- `customerId`
- `planId`
- `status`
- `currentPeriodStart`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`
- `endedAt`
- pricing snapshots

Statuses:

- `ACTIVE`
- `CANCELED`
- `EXPIRED`
- `PAST_DUE`

Rules:

- one customer can have only one `ACTIVE` subscription
- plan price, currency, interval, and interval count are snapshotted at creation
- creating a subscription creates the initial invoice
- subscriptions can be canceled immediately or scheduled for period end
- due subscriptions can be renewed by admin job

### Invoice

Represents a financial document for a subscription period.

Important fields:

- `invoiceNumber`
- `customerId`
- `subscriptionId`
- `status`
- `amountDue`
- `amountPaid`
- `currency`
- `periodStart`
- `periodEnd`
- `issuedAt`
- `dueAt`
- `paidAt`
- `voidedAt`

Statuses:

- `ISSUED`
- `PAID`
- `VOID`
- `OVERDUE`

Rules:

- invoice numbers are tenant-scoped
- no duplicate invoice should be created for the same subscription period
- overlapping invoice periods for a subscription are blocked
- paid and void invoices are not changed by overdue jobs

### Payment

Represents a payment attempt or payment record linked to an invoice.

Important fields:

- `invoiceId`
- `status`
- `amount`
- `currency`
- `provider`
- `providerReference`
- `paidAt`
- `failureReason`

Statuses:

- `SUCCESS`
- `FAILED`

Rules:

- currency must match the invoice currency
- successful payments mark the invoice as `PAID`
- failed payments are recorded without marking the invoice paid

## Relationship Overview

```text
Tenant
 ├── Users
 ├── Customers
 │    ├── Subscriptions
 │    ├── Invoices
 │    └── Payments through invoices
 ├── Products
 │    └── Plans
 │         └── Subscriptions
 ├── Invoices
 └── Payments
```

## Billing Intervals

Supported billing intervals:

- `DAY`
- `WEEK`
- `MONTH`
- `YEAR`

`intervalCount` allows cadences such as every 1 month, every 3 months, or every 1 year.

## Analytics Model

Analytics is derived from tenant-scoped operational data.

Current metrics include:

- total customers
- active subscriptions
- past due subscriptions
- issued / paid / overdue invoices
- paid revenue
- revenue this month
- total amount due
- overdue amount
- payment counts and success rate
- estimated MRR
- subscriptions by plan

## Deletion Strategy

- Plans use soft delete.
- Products can be deleted only when not blocked by plan references.
- Financial records should be preserved through domain rules.

The model favors preserving billing history over destructive cleanup.
