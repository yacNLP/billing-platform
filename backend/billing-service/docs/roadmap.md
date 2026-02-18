# Roadmap — Billing Service

## 1. Current State (MVP Completed)

The following components are implemented and validated:

- Multi-tenant architecture (database-level isolation via tenantId)
- JWT authentication
- Role-based access control (ADMIN / USER)
- Customers module (CRUD)
- Products module (CRUD + business constraints)
- Plans module (CRUD + soft delete)
- Composite unique constraints per tenant
- End-to-end testing (including tenant isolation)
- Docker-based environment setup

The system provides a secure SaaS-ready foundation.

---

## 2. Short-Term Improvements

Planned technical improvements:

- Structured E2E architecture (test harness, actors, builders)
- Additional isolation tests (update / delete scope validation)
- API versioning strategy (/v1)
- Improved error normalization
- Code coverage reporting

---

## 3. Business Domain Expansion

Next major domain features:

### Subscriptions

- Customer → Plan linkage
- Subscription lifecycle (active, canceled, expired)
- Status management
- Business constraints on Plan deletion

### Invoices

- Invoice generation from subscriptions
- Status tracking (draft, pending, paid, failed)
- Historical records

### Payments

- Payment provider integration (e.g. Stripe)
- Webhook handling
- Payment intent validation
- Failure handling logic

---

## 4. DevOps & Infrastructure

Planned improvements:

- CI pipeline (GitHub Actions)
- Automatic migration execution in CI
- Docker image publishing
- Environment-based configuration validation
- Secrets management
- Observability (structured logs, health checks)
- Metrics & monitoring

---

## 5. Long-Term Architecture Evolution

As the domain grows, potential architectural evolutions:

- Extraction of subscription domain into separate module
- Event-driven architecture (internal domain events)
- Webhook support for external integrations
- API versioning & backward compatibility strategy

Microservices are not planned unless domain complexity justifies it.

---

## 6. Design Philosophy Going Forward

The system will continue to prioritize:

- Strict tenant isolation
- Database-level integrity
- Clear domain boundaries
- Production-safe migration strategy
- Scalable testing architecture
- Clean, maintainable modular design
