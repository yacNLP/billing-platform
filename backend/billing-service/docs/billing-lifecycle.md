# Billing Lifecycle

This document explains how the main billing flow works in the current version.

## Overview

The billing lifecycle connects:

```text
Customer -> Product -> Plan -> Subscription -> Invoice -> Payment -> Analytics
```

Admin Jobs provide manual orchestration for overdue invoices, past due subscriptions, due invoice generation, and renewals.

## 1. Catalog Setup

Before billing can happen, an admin creates:

- a customer
- a product
- a plan attached to that product

The plan defines:

- amount in minor units
- currency
- billing interval
- interval count
- active state

Supported intervals:

- `DAY`
- `WEEK`
- `MONTH`
- `YEAR`

## 2. Subscription Creation

An admin creates a subscription by selecting:

- customer
- active plan
- optional start date
- optional `cancelAtPeriodEnd`

Rules:

- the customer and plan must belong to the same tenant
- the plan must be active
- the customer cannot already have an `ACTIVE` subscription

When the subscription is created:

- status is set to `ACTIVE`
- current period start/end are calculated
- plan price/currency/interval are snapshotted
- an initial invoice is created for the current period

The snapshot matters because future plan edits should not rewrite the economic terms of an already-created subscription.

## 3. Invoice Generation

Invoices represent billing for a subscription period.

Invoice statuses:

- `ISSUED`
- `PAID`
- `VOID`
- `OVERDUE`

Rules:

- an invoice belongs to a customer and subscription
- an invoice has a period start/end
- overlapping invoices for the same subscription are rejected
- the system must not create duplicate invoices for the same subscription period

## 4. Payment Recording

Payments are linked to invoices.

Payment statuses:

- `SUCCESS`
- `FAILED`

Rules:

- payment currency must match the invoice currency
- a successful payment marks the invoice as `PAID`
- a failed payment is recorded but does not mark the invoice paid
- provider fields are metadata only

There is no real Stripe integration yet.

## 5. Mark Overdue Invoices

Admin job:

```text
POST /admin/jobs/mark-overdue-invoices
```

Behavior:

- scans `ISSUED` invoices
- if `dueAt < now`, marks them `OVERDUE`
- never touches `PAID`
- never touches `VOID`

Returns:

```ts
{
  scanned: number;
  updated: number;
  skipped: number;
}
```

## 6. Update Past Due Subscriptions

Admin job:

```text
POST /admin/jobs/update-past-due-subscriptions
```

Behavior:

- scans `ACTIVE` subscriptions
- if a subscription has at least one unpaid `OVERDUE` invoice, moves it to `PAST_DUE`
- does not touch `CANCELED`
- does not touch `EXPIRED`

## 7. Generate Due Invoices

Admin job:

```text
POST /admin/jobs/generate-due-invoices
```

Behavior:

- scans `ACTIVE` subscriptions
- ensures the current subscription period has an invoice
- does not create next-period invoices
- skips already billed periods
- respects the anti-overlap invoice rule

This job is idempotent: running it twice should not create duplicate invoices for the same period.

## 8. Renew Due Subscriptions

Admin job:

```text
POST /admin/jobs/renew-due-subscriptions
```

Behavior:

- scans `ACTIVE` subscriptions whose current period already ended
- skips subscriptions with `cancelAtPeriodEnd = true`
- advances `currentPeriodStart` and `currentPeriodEnd`
- ensures an invoice exists for the new period
- skips invoice creation if the new period is already billed

This job owns next-period renewal behavior.

## 9. Cancellation

Subscriptions can be canceled:

- immediately
- at period end

For period-end cancellation:

- the subscription remains `ACTIVE`
- `cancelAtPeriodEnd` is set
- lifecycle/renewal logic avoids renewing it

## 10. Analytics

Analytics reads tenant-scoped operational data and computes:

- customer count
- subscription counts
- invoice counts
- paid revenue
- revenue this month
- amount due
- overdue amount
- payment counts
- payment success rate
- estimated MRR
- subscriptions by plan

Analytics is not stored as a separate ledger. It is derived from current billing data.

## Current Limits

The current lifecycle does not include:

- automatic cron scheduling
- real Stripe integration
- webhooks
- emails or dunning reminders
- refunds
- tax/VAT handling
- invoice PDFs
- full audit log
