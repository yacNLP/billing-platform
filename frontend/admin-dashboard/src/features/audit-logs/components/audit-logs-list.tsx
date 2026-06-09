"use client";

import { FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { StatePanel } from "@/components/admin/state-panel";
import { useGetAuditLogsQuery } from "@/features/audit-logs/audit-logs-api";
import type {
  AuditLog,
  AuditLogsQueryParams,
} from "@/features/audit-logs/types";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

const auditLogActions = [
  ["customer.created", "Customer created"],
  ["customer.updated", "Customer updated"],
  ["customer.deleted", "Customer deleted"],
  ["product.created", "Product created"],
  ["product.updated", "Product updated"],
  ["product.deleted", "Product deleted"],
  ["plan.created", "Plan created"],
  ["plan.updated", "Plan updated"],
  ["plan.deleted", "Plan deleted"],
  ["subscription.created", "Subscription created"],
  ["subscription.canceled", "Subscription canceled"],
  ["invoice.created", "Invoice created"],
  ["invoice.marked_paid", "Invoice marked paid"],
  ["invoice.voided", "Invoice voided"],
  ["invoice.marked_overdue", "Invoice marked overdue"],
  ["invoice.email_sent", "Invoice email sent"],
  ["payment.created", "Payment created"],
  ["admin_job.run", "Admin job run"],
  ["tenant_settings.updated", "Tenant settings updated"],
  ["team.member_created", "Team member created"],
  ["team.member_role_updated", "Team member role updated"],
  ["team.member_deleted", "Team member deleted"],
  ["demo.sample_data_loaded", "Sample data loaded"],
  ["auth.password_reset_requested", "Password reset requested"],
  ["auth.password_reset_completed", "Password reset completed"],
] as const;

const auditLogEntityTypes = [
  ["customer", "Customer"],
  ["product", "Product"],
  ["plan", "Plan"],
  ["subscription", "Subscription"],
  ["invoice", "Invoice"],
  ["payment", "Payment"],
  ["admin_job", "Admin job"],
  ["tenant_settings", "Tenant settings"],
  ["team_member", "Team member"],
  ["demo", "Demo"],
  ["auth", "Auth"],
] as const;

const actionLabelMap = Object.fromEntries(auditLogActions);
const entityTypeLabelMap = Object.fromEntries(auditLogEntityTypes);

function getQueryParams(searchParams: URLSearchParams): AuditLogsQueryParams {
  return {
    page: parsePositiveInteger(searchParams.get("page")) ?? 1,
    pageSize: parsePositiveInteger(searchParams.get("pageSize")) ?? 20,
    action: searchParams.get("action") || undefined,
    entityType: searchParams.get("entityType") || undefined,
    entityId: parsePositiveInteger(searchParams.get("entityId")),
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAction(action: string) {
  return actionLabelMap[action] ?? action;
}

function formatEntityType(entityType: string) {
  return entityTypeLabelMap[entityType] ?? entityType;
}

function formatMetadata(metadata: unknown) {
  if (metadata === null || metadata === undefined) {
    return "No metadata";
  }

  if (typeof metadata === "string") {
    return metadata;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return "Metadata unavailable";
  }
}

function hasActiveFilters(queryParams: AuditLogsQueryParams) {
  return Boolean(
    queryParams.action || queryParams.entityType || queryParams.entityId,
  );
}

function AuditLogRow({ log }: { log: AuditLog }) {
  const metadata = formatMetadata(log.metadata);

  return (
    <article className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1.2fr)_180px_140px_minmax(0,1fr)] xl:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Created
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {formatDateTime(log.createdAt)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Action
          </p>
          <p className="mt-1 truncate text-base font-semibold text-slate-950">
            {formatAction(log.action)}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{log.action}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Entity
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {formatEntityType(log.entityType)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {log.entityId ? `ID #${log.entityId}` : "No entity ID"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Actor
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {log.actorUserId ? `User #${log.actorUserId}` : "System"}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Metadata
          </p>
          <p className="mt-1 line-clamp-3 break-words rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 font-mono text-xs leading-5 text-slate-600">
            {metadata}
          </p>
        </div>
      </div>
    </article>
  );
}

export function AuditLogsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } = useGetAuditLogsQuery(
    queryParams,
    { refetchOnMountOrArgChange: true },
  );

  function replaceSearchParams(nextParams: URLSearchParams) {
    const queryString = nextParams.toString();
    router.replace(queryString ? pathname + "?" + queryString : pathname, {
      scroll: false,
    });
  }

  function handleFiltersSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextParams = new URLSearchParams(searchParams.toString());
    const formData = new FormData(event.currentTarget);
    const normalizedAction = String(formData.get("action") ?? "").trim();
    const normalizedEntityType = String(
      formData.get("entityType") ?? "",
    ).trim();
    const normalizedEntityId = String(formData.get("entityId") ?? "").trim();
    const normalizedPageSize = String(formData.get("pageSize") ?? "").trim();

    if (normalizedAction) {
      nextParams.set("action", normalizedAction);
    } else {
      nextParams.delete("action");
    }

    if (normalizedEntityType) {
      nextParams.set("entityType", normalizedEntityType);
    } else {
      nextParams.delete("entityType");
    }

    if (normalizedEntityId) {
      nextParams.set("entityId", normalizedEntityId);
    } else {
      nextParams.delete("entityId");
    }

    if (normalizedPageSize) {
      nextParams.set("pageSize", normalizedPageSize);
    } else {
      nextParams.delete("pageSize");
    }

    nextParams.set("page", "1");
    replaceSearchParams(nextParams);
  }

  function handleResetFilters() {
    const nextParams = new URLSearchParams();
    nextParams.set("page", "1");
    nextParams.set("pageSize", String(queryParams.pageSize ?? 20));
    replaceSearchParams(nextParams);
  }

  function handlePageChange(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("page", String(nextPage));
    replaceSearchParams(nextParams);
  }

  if (isLoading) {
    return (
      <StatePanel
        eyebrow="Audit Logs"
        title="Workspace activity"
        message="Loading audit logs..."
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Audit Logs"
        title="Workspace activity"
        message="Unable to load audit logs."
      />
    );
  }

  if (!data || data.total === 0) {
    return (
      <StatePanel
        action={
          hasActiveFilters(queryParams) ? (
            <button
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={handleResetFilters}
              type="button"
            >
              Reset filters
            </button>
          ) : null
        }
        eyebrow="Audit Logs"
        title="Workspace activity"
        message={
          hasActiveFilters(queryParams)
            ? "No audit logs match the current filters."
            : "No audit logs have been recorded yet."
        }
      />
    );
  }

  const isEmptyCurrentPage = data.data.length === 0;

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          eyebrow="Audit Logs"
          title="Audit Logs"
          description="Track workspace activity and security-sensitive operations."
        />

        <form
          className="mt-6 grid gap-3 rounded-[1.5rem] border border-[var(--color-border)] bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.04)] md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_190px_150px_150px_auto_auto] xl:items-end"
          onSubmit={handleFiltersSubmit}
        >
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Action
            </span>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
              defaultValue={queryParams.action ?? ""}
              name="action"
            >
              <option value="">All actions</option>
              {auditLogActions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Entity
            </span>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
              defaultValue={queryParams.entityType ?? ""}
              name="entityType"
            >
              <option value="">All entities</option>
              {auditLogEntityTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Entity ID
            </span>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
              defaultValue={queryParams.entityId ?? ""}
              min={1}
              name="entityId"
              placeholder="Any"
              type="number"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Page size
            </span>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
              defaultValue={queryParams.pageSize ?? 20}
              name="pageSize"
            >
              {pageSizeOptions.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} / page
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            type="submit"
          >
            Apply
          </button>
          <button
            className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={handleResetFilters}
            type="button"
          >
            Reset
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-700">
            {data.total} audit log{data.total > 1 ? "s" : ""} found
          </p>
          {isFetching ? (
            <p className="text-sm text-slate-500">Refreshing audit logs...</p>
          ) : null}
        </div>

        {isEmptyCurrentPage ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            No audit logs on this page.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {data.data.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        )}

        <PaginationControls
          currentPage={data.page}
          displayedResults={data.data.length}
          onPageChange={handlePageChange}
          totalPages={data.totalPages}
        />
      </section>
    </main>
  );
}
