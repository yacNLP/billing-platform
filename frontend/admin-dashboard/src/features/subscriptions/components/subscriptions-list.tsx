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
import { useGetCustomersQuery } from "@/features/customers/customers-api";
import { useGetPlansQuery } from "@/features/plans/plans-api";
import type {
  BillingInterval,
  SubscriptionsQueryParams,
  SubscriptionStatus,
} from "@/features/subscriptions/types";
import { useGetSubscriptionsQuery } from "@/features/subscriptions/subscriptions-api";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

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

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function formatInterval(interval: BillingInterval, count: number): string {
  const label = intervalLabelMap[interval];

  if (count === 1) {
    return `Every ${label}`;
  }

  return `Every ${count} ${label}s`;
}

const pageSizeOptions = [10, 20, 50];

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

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

export function SubscriptionsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } =
    useGetSubscriptionsQuery(queryParams);
  const { data: customers } = useGetCustomersQuery({ page: 1, pageSize: 100 });
  const { data: plans } = useGetPlansQuery();

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
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Subscriptions"
        title="Subscriptions"
        message="Unable to load subscriptions."
      />
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <StatePanel
        eyebrow="Subscriptions"
        title="Subscriptions"
        message="No subscriptions found."
      />
    );
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          eyebrow="Subscriptions"
          title="Listing"
          description="Paginated subscriptions listing with backend-aligned status filters and URL state."
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
              {(plans || []).map((plan) => (
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

        <ul className="mt-8 space-y-4">
          {data.data.map((subscription) => {
            const customer = customers?.data.find(
              (item) => item.id === subscription.customerId,
            );
            const plan = plans?.find((item) => item.id === subscription.planId);

            return (
              <li
                className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
                key={subscription.id}
              >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-slate-950">
                        Subscription #{subscription.id}
                      </p>
                      <span className={statusClassNameMap[subscription.status]}>
                        {subscription.status}
                      </span>
                      {subscription.cancelAtPeriodEnd ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                          Scheduled cancellation
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-slate-600">
                      {customer
                        ? `${customer.name} · ${customer.email}`
                        : `Customer ID ${subscription.customerId}`}{" "}
                      ·{" "}
                      {plan
                        ? `${plan.name} · ${plan.code}`
                        : `Plan ID ${subscription.planId}`}
                    </p>
                    <Link
                      className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                      href={`/subscriptions/${subscription.id}`}
                    >
                      View details
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                      {formatMoney(
                        subscription.amountSnapshot,
                        subscription.currencySnapshot,
                      )}{" "}
                      / {intervalLabelMap[subscription.intervalSnapshot]}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-sm text-slate-700">
                      {formatInterval(
                        subscription.intervalSnapshot,
                        subscription.intervalCountSnapshot,
                      )}
                    </span>
                  </div>
                </div>

                <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[22rem]">
                  <div>
                    <dt className="font-medium text-slate-500">
                      Current period start
                    </dt>
                    <dd>
                      {dateFormatter.format(
                        new Date(subscription.currentPeriodStart),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">
                      Current period end
                    </dt>
                    <dd>
                      {dateFormatter.format(
                        new Date(subscription.currentPeriodEnd),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Created</dt>
                    <dd>
                      {dateFormatter.format(new Date(subscription.createdAt))}
                    </dd>
                  </div>
                  {subscription.endedAt ? (
                    <div>
                      <dt className="font-medium text-slate-500">Ended</dt>
                      <dd>
                        {dateFormatter.format(new Date(subscription.endedAt))}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              </li>
            );
          })}
        </ul>

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
