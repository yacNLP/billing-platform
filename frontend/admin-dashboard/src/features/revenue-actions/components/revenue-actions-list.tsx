"use client";

import Link from "next/link";
import { FormEvent } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { StatePanel } from "@/components/admin/state-panel";
import { useGetRevenueActionsQuery } from "@/features/revenue-actions/revenue-actions-api";
import type {
  RevenueAction,
  RevenueActionSeverity,
  RevenueActionsQueryParams,
  RevenueActionType,
} from "@/features/revenue-actions/types";
import { formatMoney } from "@/lib/formatters";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

const severityClassNameMap: Record<RevenueActionSeverity, string> = {
  HIGH:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-700",
  MEDIUM:
    "inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700",
  LOW:
    "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600",
};

const typeLabelMap: Record<RevenueActionType, string> = {
  FAILED_PAYMENT: "Failed payment",
  OVERDUE_INVOICE: "Overdue invoice",
  PAST_DUE_SUBSCRIPTION: "Past due subscription",
};

function parseSeverity(
  value: string | null,
): RevenueActionSeverity | undefined {
  if (value === "HIGH" || value === "MEDIUM" || value === "LOW") {
    return value;
  }

  return undefined;
}

function parseType(value: string | null): RevenueActionType | undefined {
  if (
    value === "OVERDUE_INVOICE" ||
    value === "PAST_DUE_SUBSCRIPTION" ||
    value === "FAILED_PAYMENT"
  ) {
    return value;
  }

  return undefined;
}

function getQueryParams(searchParams: URLSearchParams): RevenueActionsQueryParams {
  return {
    page: parsePositiveInteger(searchParams.get("page")) ?? 1,
    pageSize: parsePositiveInteger(searchParams.get("pageSize")) ?? 20,
    severity: parseSeverity(searchParams.get("severity")),
    type: parseType(searchParams.get("type")),
  };
}

function getEntityLink(action: RevenueAction) {
  if (action.entityType === "invoice") {
    return {
      href: "/invoices/" + action.entityId,
      label: "View invoice",
    };
  }

  return {
    href: "/subscriptions/" + action.entityId,
    label: "View subscription",
  };
}

export function RevenueActionsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } =
    useGetRevenueActionsQuery(queryParams);

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
    const normalizedSeverity = String(formData.get("severity") ?? "").trim();
    const normalizedType = String(formData.get("type") ?? "").trim();
    const normalizedPageSize = String(formData.get("pageSize") ?? "").trim();

    if (normalizedSeverity) {
      nextParams.set("severity", normalizedSeverity);
    } else {
      nextParams.delete("severity");
    }

    if (normalizedType) {
      nextParams.set("type", normalizedType);
    } else {
      nextParams.delete("type");
    }

    if (normalizedPageSize) {
      nextParams.set("pageSize", normalizedPageSize);
    } else {
      nextParams.delete("pageSize");
    }

    nextParams.set("page", "1");
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
        eyebrow="Action Center"
        title="Revenue actions"
        message="Loading recommended actions..."
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Action Center"
        title="Revenue actions"
        message="Unable to load revenue actions."
      />
    );
  }

  if (!data || data.total === 0) {
    return (
      <StatePanel
        eyebrow="Action Center"
        title="Revenue actions"
        message="No revenue actions need attention right now."
      />
    );
  }

  const isEmptyCurrentPage = data.data.length === 0;

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          eyebrow="Action Center"
          title="Revenue actions"
          description="Prioritized billing issues detected from invoices, subscriptions, and payments."
        />

        <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-[var(--color-border)] bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Recommended actions
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {data.total} action{data.total > 1 ? "s" : ""} detected.
            </p>
          </div>

          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_230px_150px_auto] lg:items-end"
            onSubmit={handleFiltersSubmit}
          >
            <label className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Severity
              </span>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
                defaultValue={queryParams.severity ?? ""}
                name="severity"
              >
                <option value="">All severities</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Type
              </span>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
                defaultValue={queryParams.type ?? ""}
                name="type"
              >
                <option value="">All types</option>
                <option value="OVERDUE_INVOICE">Overdue invoice</option>
                <option value="PAST_DUE_SUBSCRIPTION">
                  Past due subscription
                </option>
                <option value="FAILED_PAYMENT">Failed payment</option>
              </select>
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
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              type="submit"
            >
              Apply
            </button>
          </form>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">
            Refreshing revenue actions...
          </p>
        ) : null}

        {isEmptyCurrentPage ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            No revenue actions on this page.
          </p>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white">
          <ul className="divide-y divide-[var(--color-border)]">
            {data.data.map((action) => {
              const entityLink = getEntityLink(action);

              return (
                <li
                  className="bg-white px-5 py-5 transition hover:bg-slate-50/80"
                  key={action.key}
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(170px,0.8fr)_minmax(280px,1.5fr)_minmax(150px,0.7fr)_150px] xl:items-center">
                    <div className="space-y-2">
                      <span className={severityClassNameMap[action.severity]}>
                        {action.severity}
                      </span>
                      <p className="text-sm font-semibold text-slate-950">
                        {typeLabelMap[action.type]}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {action.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {action.description}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {action.suggestedAction}
                      </p>
                    </div>

                    <div>
                      {action.amount !== undefined && action.currency ? (
                        <>
                          <p className="text-sm font-semibold text-slate-950">
                            {formatMoney(action.amount, action.currency)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            Amount at risk
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          No amount attached
                        </p>
                      )}
                    </div>

                    <div className="flex xl:justify-end">
                      <Link
                        className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        href={entityLink.href}
                      >
                        {entityLink.label}
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

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
