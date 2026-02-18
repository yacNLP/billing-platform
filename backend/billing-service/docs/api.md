# API — Billing Service

## 1. Overview

The Billing Service exposes a RESTful JSON API.

It allows tenants to manage:

- Customers
- Products
- Subscription Plans

All endpoints are:

- JSON-based
- Stateless
- Protected via JWT authentication
- Scoped per tenant

Swagger documentation is available at:

/docs

---

## 2. API Conventions

### 2.1 Format

- Content-Type: application/json
- Dates returned in ISO 8601 format
- Monetary values expressed in minor units (cents)

---

### 2.2 Authentication

All protected routes require:

Authorization: Bearer <JWT>

The JWT:

- Identifies the user
- Contains tenant context
- Determines role (ADMIN / USER)

---

### 2.3 Authorization (RBAC)

Roles:

- ADMIN
- USER

Route-level guards enforce permissions.

Authorization is evaluated before business logic execution.

---

### 2.4 Multi-Tenancy Scoping

All business endpoints are automatically scoped to:

tenantId derived from authenticated user.

This ensures:

- No cross-tenant data access
- No manual tenant parameter in queries
- Secure isolation

---

## 3. Standardized Pagination

List endpoints follow a common format.

Query parameters:

- page (default: 1)
- pageSize (default: 20)
- sortBy (module-dependent)
- order (asc / desc)

Response format:

```ts
interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

--- 

## 4. Error Handling

The API follows consistent HTTP semantics:

- 400 — Validation error
- 401 — Unauthorized
- 403 — Forbidden
- 404 — Resource not found
- 409 — Business conflict

Examples of conflicts:

- Duplicate email per tenant
- Duplicate SKU per tenant
- Duplicate plan code per tenant
- Deleting a product referenced by plans

---

## 5 Endpoints Overview
### 5.1 Customers

- GET /customers
- GET /customers/:id
- POST /customers
- PATCH /customers/:id
- DELETE /customers/:id

Rules:
- Email unique per tenant
- Hard delete

### 5.2 Products

- GET /products
- GET /products/:id
- POST /products
- PATCH /products/:id
- DELETE /products/:id

Rules:
- SKU unique per tenant
- Cannot delete if referenced by plans
- Hard delete

### 5.3 Plans

- GET /plans
- GET /plans/:id
- POST /plans
- PATCH /plans/:id
- DELETE /plans/:id

Rules:
- Code unique per tenant
- Soft delete (deletedAt)
- Excluded from list queries if soft-deleted
- Must reference a product of the same tenant

## 6. Versioning Strategy 
The API is currently unversioned. Versioning (e.g. /v1) may be introduced in future releases to support backward compatibility.

---
 
## 7. Security Considerations
- Stateless JWT authentication
- Tenant-scoped data access
- Role-based guards
- DTO validation via class-validator
- Unique constraints enforced at database level