# Production Operations Runbook

This runbook covers the minimum operational checks for running RevenueOps in a deployed environment.

## Health And Readiness

RevenueOps exposes two public operational endpoints.

```http
GET /healthz
```

Use this endpoint for a lightweight process health check. It does not check external dependencies.

Expected response:

```json
{ "status": "ok" }
```

```http
GET /readyz
```

Use this endpoint for readiness checks. It verifies that the API can reach the database through Prisma.

Expected response when ready:

```json
{ "status": "ok", "database": "ok" }
```

If the database is unavailable, the endpoint returns `503` with a non-sensitive response.

## Required Production Environment

Set these variables in the backend hosting provider:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<long-random-secret>
CORS_ORIGIN=https://<frontend-domain>
FRONTEND_URL=https://<frontend-domain>
EMAIL_MODE=noop|resend
ENABLE_SWAGGER=false
```

For real email delivery with Resend:

```env
EMAIL_MODE=resend
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM=RevenueOps <billing@your-domain.com>
EMAIL_REPLY_TO=support@your-domain.com
```

Production startup fails if:

- `DATABASE_URL` is missing
- `JWT_SECRET` is missing or still set to `dev-secret`
- `CORS_ORIGIN` is missing
- `EMAIL_MODE` is not `noop` or `resend`
- `EMAIL_MODE=resend` and `RESEND_API_KEY` or `EMAIL_FROM` is missing

## Migrations

Production deploys should apply migrations before starting the API:

```bash
npx prisma migrate deploy
npm run start:prod
```

Do not run development seeds against production data.

## Post-Deploy Check

After each deploy, verify:

```bash
curl https://<api-domain>/healthz
curl https://<api-domain>/readyz
```

Then verify from the frontend:

- login works
- dashboard loads
- tenant settings loads
- invoice PDF download works if invoice data exists

## Neon Backup And Restore

For Neon-managed Postgres, use Neon point-in-time restore or branch restore from the Neon dashboard.

Recommended manual process before risky changes:

1. Confirm the latest automatic backup or create a protected branch/snapshot in Neon.
2. Record the current API commit SHA and migration state.
3. Deploy the change.
4. Verify `/readyz` and the main admin flows.

If restore is needed:

1. Restore the database from the Neon dashboard to the target point in time or branch.
2. Update `DATABASE_URL` if Neon provides a new restored branch connection string.
3. Redeploy or restart the backend service.
4. Run `GET /readyz` and verify core reads in the admin dashboard.

## Basic Rollback

If a deploy breaks the API but the database is still compatible:

1. Redeploy the previous working commit from the hosting provider.
2. Confirm `/healthz` and `/readyz`.
3. Check recent auth, dashboard, invoices, and payments flows.

If a migration caused the issue, do not manually edit production data first. Restore from Neon backup/branch, then redeploy a known-good commit.

## Logging

The backend logs each HTTP request with:

- `requestId`
- `method`
- `url`
- `statusCode`
- `durationMs`

The response also includes `x-request-id`. Pass this id around when debugging incidents.

Request bodies are not logged.

## Monitoring Minimum

For a simple production/demo setup, configure external uptime monitoring against:

- `GET /healthz`
- `GET /readyz`

Recommended alerting:

- `/healthz` fails for more than 2 minutes
- `/readyz` fails for more than 2 minutes
- Render service restarts repeatedly
- Neon connection errors appear in backend logs

Sentry/OpenTelemetry/Prometheus are intentionally out of scope for the current minimal operations setup.
