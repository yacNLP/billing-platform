"use client";

import Link from "next/link";
import { FormEvent, ReactNode } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { StatePanel } from "@/components/admin/state-panel";
import { useGetCustomersQuery } from "@/features/customers/customers-api";
import { useGetPlansQuery } from "@/features/plans/plans-api";
import type {
  BillingInterval,
  SubscriptionsQueryParams,
  SubscriptionStatus,
} from "@/features/subscriptions/types";
import { useGetSubscriptionsQuery } from "@/features/subscriptions/subscriptions-api";
import { formatDate, formatMoney } from "@/lib/formatters";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

const intervalLabelMap: Record<BillingInterval, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

const statusClassNameMap: Record<SubscriptionStatus, string> = {
  ACTIVE:
    "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700",
  CANCELED:
    "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600",
  EXPIRED:
    "inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700",
  PAST_DUE:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700",
};

type SubscriptionsListProps = {
  action?: ReactNode;
};

function getQueryParams(searchParams: URLSearchParams): SubscriptionsQueryParams {
  const page = parsePositiveInteger(searchParams.get("page")) ?? 1;
  const pageSize = parsePositiveInteger(searchParams.get("pageSize")) ?? 20;
  const status = searchParams.get("status");

  return {
    page,
    pageSize,
    customerId: parsePositiveInteger(searchParams.get("customerId")),
    planId: parsePositiveInteger(searchParams.get("planId")),
    status:
      status === "ACTIVE" ||
      status === "CANCELED" ||
      status === "EXPIRED" ||
      status === "PAST_DUE"
        ? status
        : undefined,
  };
}

function hasActiveFilters(queryParams: SubscriptionsQueryParams): boolean {
  return Boolean(queryParams.status || queryParams.customerId || queryParams.planId);
}

export function SubscriptionsList({ action }: SubscriptionsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } =
    useGetSubscriptionsQuery(queryParams);
  const { data: customers } = useGetCustomersQuery({ page: 1, pageSize: 100 });
  const { data: plans } = useGetPlansQuery({ page: 1, pageSize: 100 });

  function replaceSearchParams(nextParams: URLSearchParams) {
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  function handleFiltersSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextParams = new URLSearchParams(searchParams.toString());
    const formData = new FormData(event.currentTarget);
    const normalizedStatus = String(formData.get("status") ?? "").trim();
    const normalizedCustomerId = String(formData.get("customerId") ?? "").trim();
    const normalizedPlanId = String(formData.get("planId") ?? "").trim();
    const normalizedPageSize = String(formData.get("pageSize") ?? "").trim();

    if (normalizedStatus) {
      nextParams.set("status", normalizedStatus);
    } else {
      nextParams.delete("status");
    }

    if (normalizedCustomerId) {
      nextParams.set("customerId", normalizedCustomerId);
    } else {
      nextParams.delete("customerId");
    }

    if (normalizedPlanId) {
      nextParams.set("planId", normalizedPlanId);
    } else {
      nextParams.delete("planId");
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
    nextParams.set("pageSize", "20");
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
        eyebrow="Subscriptions"
        title="Subscriptions"
        message="Loading subscriptions..."
        action={action}
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Subscriptions"
        title="Subscriptions"
        message="Unable to load subscriptions."
        action={action}
      />
    );
  }

  if (!data) {
    return (
      <StatePanel
        eyebrow="Subscriptions"
        title="Subscriptions"
        message="No subscriptions found yet."
        action={action}
      />
    );
  }

  const hasFilters = hasActiveFilters(queryParams);
  const isEmptyDataset = data.total === 0;
  const isEmptyCurrentPage = data.data.length === 0;

  if (isEmptyDataset && !hasFilters) {
    return (
      <StatePanel
        eyebrow="Subscriptions"
        title="Subscriptions"
        message="No subscriptions found yet."
        action={action}
      />
    );
  }

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          action={action}
          eyebrow="Subscriptions"
          title="Listing"
          description="Track active, canceled and past due subscriptions."
        />

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">
            Refreshing subscriptions...
          </p>
        ) : null}

        <form
          key={searchParams.toString()}
          className="mt-8 grid gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={handleFiltersSubmit}
        >
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="subscription-status"
            >
              Status
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.status ?? ""}
              id="subscription-status"
              name="status"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CANCELED">CANCELED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="PAST_DUE">PAST_DUE</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="subscription-customer"
            >
              Customer
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={
                queryParams.customerId ? String(queryParams.customerId) : ""
              }
              id="subscription-customer"
              name="customerId"
            >
              <option value="">All customers</option>
              {(customers?.data || []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="subscription-plan"
            >
              Plan
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.planId ? String(queryParams.planId) : ""}
              id="subscription-plan"
              name="planId"
            >
              <option value="">All plans</option>
              {(plans?.data || []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {plan.code}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="subscription-page-size"
            >
              Page size
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={String(queryParams.pageSize ?? 20)}
              id="subscription-page-size"
              name="pageSize"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
            <button
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              type="submit"
            >
              Apply filters
            </button>
            <button
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={handleResetFilters}
              type="button"
            >
              Reset
            </button>
            <p className="text-sm text-slate-500">
              {data.total} subscriptions found. Page {data.page} of{" "}
              {data.totalPages || 1}.
            </p>
          </div>
        </form>

        {isEmptyCurrentPage ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            {hasFilters
              ? "No subscriptions match the current filters."
              : "No subscriptions on this page."}
          </p>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white">
          <div className="hidden grid-cols-[minmax(220px,1.25fr)_minmax(220px,1.2fr)_minmax(150px,0.8fr)_minmax(190px,1fr)_minmax(120px,0.7fr)_110px] border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 xl:grid">
            <span>Plan</span>
            <span>Customer</span>
            <span>Price</span>
            <span>Current period</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          <ul className="divide-y divide-[var(--color-border)]">
          {data.data.map((subscription) => {
            const customer = customers?.data.find(
              (item) => item.id === subscription.customerId,
            );
            const plan = plans?.data.find(
              (item) => item.id === subscription.planId,
            );
            const customerLabel = customer
              ? `${customer.name} · ${customer.email}`
              : `Customer ID ${subscription.customerId}`;
            const planLabel = plan
              ? `${plan.name} · ${plan.code}`
              : `Plan ID ${subscription.planId}`;
            const priceSnapshot = `${formatMoney(
              subscription.amountSnapshot,
              subscription.currencySnapshot,
            )} / ${intervalLabelMap[subscription.intervalSnapshot]}`;
            const currentPeriod = `${formatDate(
              subscription.currentPeriodStart,
            )} → ${formatDate(subscription.currentPeriodEnd)}`;

            return (
              <li
                className="bg-white px-5 py-4 transition hover:bg-slate-50/80"
                key={subscription.id}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.25fr)_minmax(220px,1.2fr)_minmax(150px,0.8fr)_minmax(190px,1fr)_minmax(120px,0.7fr)_110px] xl:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {planLabel}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                      Subscription #{subscription.id}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {customerLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {priceSnapshot}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {currentPeriod}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={statusClassNameMap[subscription.status]}>
                      {subscription.status}
                    </span>
                    {subscription.cancelAtPeriodEnd ? (
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 xl:hidden">
                        Scheduled cancellation
                      </span>
                    ) : null}
                  </div>

                  <div className="flex xl:justify-end">
                    <Link
                      className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      href={`/subscriptions/${subscription.id}`}
                    >
                      Details
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
          totalPages={data.totalPages}
          displayedResults={data.data.length}
          onPageChange={handlePageChange}
        />
      </section>
    </main>
  );
}
