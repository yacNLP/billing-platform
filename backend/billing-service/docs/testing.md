# Testing Strategy — Billing Service

## 1. Overview

The Billing Service relies primarily on **end-to-end (e2e) tests**
to validate critical business flows.

The objective is to ensure:

- API correctness
- Multi-tenant isolation
- Business rule enforcement
- Database integrity

The project prioritizes realistic integration testing over isolated unit testing.

---

## 2. Test Types

### 2.1 End-to-End Tests (Primary Strategy)

E2E tests:

- Boot a full NestJS application instance
- Use real controllers, guards, services
- Interact with a real PostgreSQL test database
- Validate real HTTP requests and responses

This approach ensures that:

- Authentication works
- RBAC works
- Multi-tenancy isolation works
- Database constraints behave correctly

E2E tests are located in:
- test/e2e/



### 2.2 Unit Tests

The current MVP does not include isolated unit tests.
Given the size of the project and the strong integration focus,
e2e tests provide sufficient coverage for core flows.

Unit testing may be introduced later for :
- Complex business logic
- Subscription lifecycle logic
- Billing calculations


---

## 3. Multi-Tenant Isolation Testing

The project includes a dedicated multi-tenant isolation test suite.

This ensures:

- Tenant A cannot access Tenant B data
- Resources created under one tenant are invisible to others
- Tenant scoping is consistently enforced at service level

Isolation is validated through **multi-tenant-isolation.e2e-spec.ts**:

Isolation tests protect against regressions where tenant scoping
might be accidentally removed during refactoring.

---

## 4. Database Strategy for Tests

E2E tests run against a **dedicated PostgreSQL test database**.

The test workflow:

1. Start test database (Docker container)
2. Apply Prisma migrations
3. Optionally seed minimal required data
4. Run tests
5. Reset database when needed

This ensures:

- Test reproducibility
- Isolation from development data
- Deterministic behavior

The test database is strictly separated from development and production environments.

---

## 5. How to Run Tests

Start the test database:
```
docker compose up -d postgres-test
```


Apply test migrations:
```
npm run db:test:deploy
```

Run e2e tests:
```
npm run test:e2e
```

Reset test database:
```
npm run db:test:reset
```


---

## 6. Quality Criteria per Module

Each core module (Customers, Products, Plans) includes tests for:

- POST success
- Validation failure (400)
- Unique constraint conflict (409)
- GET by id success
- GET by id not found (404)
- Listing with pagination
- Delete success

For Products and Plans:

- Business constraint enforcement (e.g. deletion blocked if referenced)

---

## 7. Design Philosophy

Testing focuses on validating real system behavior rather than mocking internal layers.

Key principles:

- Tests express business intent clearly
- No cross-tenant assumptions
- Database constraints are validated through real queries
- Security checks occur before database interaction
- Isolation is explicitly tested

This strategy ensures the system behaves correctly as a SaaS multi-tenant backend.

---

## 8. Future Improvements

- Selective unit tests for complex domain logic
- Code coverage reporting
- CI-based automatic test execution
- Structured E2E architecture (test harness, actors, builders)
- Load and performance testing
