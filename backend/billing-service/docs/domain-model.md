# Domain Model — Billing Service

## 1. Overview

The Billing Service domain model represents a multi-tenant B2B billing foundation.

Each tenant (organization) manages:

- Its own users
- Its own customers
- Its own products
- Its own subscription plans

All business entities are strictly isolated per tenant.

---

## 2. Multi-Tenancy at Data Level

Multi-tenancy is implemented directly at the database level.

Each core entity contains:

- `tenantId`
- A foreign key relation to `Tenant`

Isolation is enforced through:

- Composite unique constraints scoped by `tenantId`
- Indexed `tenantId` on all tenant-scoped entities
- Application-level scoping in services

Example:
- Customer email is unique **per tenant**, not globally.
- Product SKU is unique **per tenant**, not globally.
- Plan code is unique **per tenant**, not globally.

This design enables safe logical isolation inside a single PostgreSQL database.

---

## 3. Core Entities

### 3.1 Tenant

Represents an organization using the Billing Platform.

Fields:
- `id`
- `name`
- `createdAt`

Relations:
- 1 → N Users
- 1 → N Customers
- 1 → N Products
- 1 → N Plans

The Tenant is the top-level isolation boundary.

---

### 3.2 User

Represents an authenticated user belonging to a Tenant.

Fields:
- `email` (globally unique)
- `password` (hashed)
- `role` (ADMIN / USER)
- `tenantId`

Users are scoped to exactly one tenant.

Roles are enforced via RBAC at the application layer.

---

### 3.3 Customer

Represents a client of a Tenant’s business.

Fields:
- `name`
- `email`
- `tenantId`
- timestamps

Constraints:
- `email` unique per tenant (`@@unique([tenantId, email])`)

Customers are hard-deleted in the MVP.

---

### 3.4 Product

Represents a sellable item or service.

Fields:
- `name`
- `sku`
- `priceCents`
- `currency`
- `taxRate`
- `stock`
- `isActive`
- `tenantId`

Constraints:
- SKU unique per tenant (`@@unique([tenantId, sku])`)

Relations:
- 1 → N Plans

Products are hard-deleted if not referenced by plans.

---

### 3.5 Plan

Represents a subscription pricing model attached to a Product.

Fields:
- `code`
- `name`
- `productId`
- `tenantId`
- `amount`
- `currency`
- `interval`
- `intervalCount`
- `trialDays`
- `active`
- `deletedAt` (soft delete)

Constraints:
- Code unique per tenant (`@@unique([tenantId, code])`)

Soft delete:
- Plans are not physically removed.
- `deletedAt` is set.
- Queries exclude soft-deleted plans.

Plans must always reference a Product of the same tenant.

---

## 4. Enums

### BillingInterval

Defines subscription cadence:

- DAY
- WEEK
- MONTH
- YEAR

Used to calculate billing cycles.

---

### Role

Defines access control:

- ADMIN
- USER

Used by RBAC guards.

---

## 5. Relationships Overview

Tenant (1)
 ├── Users (N)
 ├── Customers (N)
 ├── Products (N)
 │       └── Plans (N)

Key constraints:

- A Product belongs to exactly one Tenant.
- A Plan belongs to exactly one Product.
- A Plan belongs to exactly one Tenant.
- Cross-tenant relations are impossible at DB level.

---

## 6. Business Rules

Core rules enforced in the MVP:

- A Plan cannot exist without a Product.
- A Plan code is immutable after creation.
- A Product cannot be deleted if it has Plans.
- Monetary values are stored in minor units (cents).
- Currency uses ISO codes (e.g. EUR).
- All tenant-scoped entities must include tenantId.
- Cross-tenant access is forbidden by design.

---

## 7. Deletion Strategy

- Customers → Hard delete
- Products → Hard delete (if no plans reference them)
- Plans → Soft delete via `deletedAt`

Soft delete ensures:
- Historical integrity
- Future subscription compatibility
- Safer business evolution

---

## 8. Design Principles

The domain model is designed to:

- Support strict tenant isolation
- Prevent cross-organization data leaks
- Remain extensible for subscriptions & invoicing
- Keep infrastructure simple (single DB)
- Enable future domain expansion without refactoring core entities
