# Architecture — Billing Service

## 1. Overview

Billing Service is the core backend component of the Billing Platform.

It is implemented as a **modular monolith** using NestJS and Prisma,
designed to support a secure multi-tenant B2B SaaS architecture.

The service exposes a REST API used by:
- Frontend applications (future admin panel)
- Internal tools
- Potential future external integrations

---

## 2. High-Level System Architecture

Simplified flow:

Client (HTTP)
    ↓
NestJS Application
    ↓
Controllers
    ↓
Guards (JWT / Roles)
    ↓
Tenant Resolution
    ↓
Services (Business Logic)
    ↓
Prisma ORM
    ↓
PostgreSQL

The service runs in Docker with PostgreSQL as the primary database.

---

## 3. Architectural Style

The application follows a **modular monolith architecture**.

Each domain is isolated inside its own NestJS module:

- auth
- tenant
- customers
- products
- plans
- common

Each module typically contains:
- Controller (HTTP layer)
- Service (business logic)
- DTOs (validation)
- Prisma-based data access

This approach was chosen over microservices to:
- Reduce operational complexity
- Keep deployment simple
- Maintain clear domain separation
- Enable future extraction if needed

---

## 4. Multi-Tenancy Strategy

The system implements **logical multi-tenancy**.

Key principles:

- Each request is associated with a tenant
- Tenant context is resolved per request
- Data is scoped automatically at the service layer
- Cross-tenant access is prevented
- Isolation is validated via end-to-end tests

Multi-tenancy is implemented without database-per-tenant,
keeping the infrastructure simple for MVP.

---

## 5. Authentication & Authorization

Authentication:
- JWT-based authentication
- Stateless tokens
- Guards validate token presence and integrity

Authorization:
- Role-based access control (RBAC)
- Supported roles: `ADMIN`, `USER`
- Guards enforce role restrictions at route level

Security is enforced before reaching business logic.

---

## 6. Request Lifecycle

Typical request flow:

1. HTTP request reaches controller
2. JWT Guard validates token
3. Tenant context is resolved
4. Role Guard verifies permissions
5. Service layer executes business logic
6. Prisma executes scoped database query
7. Response returned as JSON

Validation is performed globally via NestJS `ValidationPipe`.

---

## 7. Data Access Layer

Data access is handled through Prisma ORM.

Design decisions:

- Schema-driven modeling
- Type-safe queries
- Centralized PrismaService
- Production-safe migrations (`migrate deploy`)
- Development migrations (`migrate dev`)

Soft delete is used selectively (Plans).
Hard delete is used where safe (Customers, Products).

---

## 8. Error Handling Strategy

The API follows consistent HTTP semantics:

- 400 — Validation error
- 401 — Unauthorized
- 403 — Forbidden
- 404 — Resource not found
- 409 — Business conflict (unique constraints, dependencies)

Errors are normalized at controller/service level.

---

## 9. Non-Functional Considerations

Current focus:
- Code clarity
- Strong validation
- Isolation guarantees
- Docker-based reproducibility
- End-to-end test coverage

Future improvements:
- Refresh tokens
- Audit logs
- Rate limiting
- Observability & monitoring
- CI/CD pipeline

---

## 10. Deployment Model

The service runs in Docker Compose:

- PostgreSQL container
- API container

On startup:
- Prisma migrations are applied
- Application boots with environment-specific configuration

The system is designed to be easily portable to a cloud environment.
