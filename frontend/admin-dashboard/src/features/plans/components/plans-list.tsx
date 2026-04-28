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
import { useGetPlansQuery } from "@/features/plans/plans-api";
import type { BillingInterval, PlansQueryParams } from "@/features/plans/types";
import { useGetProductsQuery } from "@/features/products/products-api";
import { formatDate } from "@/lib/formatters";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

const intervalLabelMap: Record<BillingInterval, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

function formatPricing(amount: number, currency: string, interval: BillingInterval) {
  return `${(amount / 100).toFixed(2)} ${currency} / ${intervalLabelMap[interval]}`;
}

function formatInterval(interval: BillingInterval, intervalCount: number) {
  if (intervalCount === 1) {
    return `Every ${intervalLabelMap[interval]}`;
  }

  return `Every ${intervalCount} ${intervalLabelMap[interval]}s`;
}

function getQueryParams(searchParams: URLSearchParams): PlansQueryParams {
  const page = parsePositiveInteger(searchParams.get("page")) ?? 1;
  const pageSize = parsePositiveInteger(searchParams.get("pageSize")) ?? 20;
  const search = searchParams.get("search")?.trim();
  const active = searchParams.get("active");
  const currency = searchParams.get("currency")?.trim().toUpperCase();
  const sort = searchParams.get("sort");
  const order = searchParams.get("order");

  return {
    page,
    pageSize,
    search: search || undefined,
    active: active === "true" || active === "false" ? active : undefined,
    currency: currency || undefined,
    sort:
      sort === "id" ||
      sort === "code" ||
      sort === "name" ||
      sort === "amount" ||
      sort === "createdAt"
        ? sort
        : undefined,
    order: order === "asc" || order === "desc" ? order : undefined,
  };
}

export function PlansList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } = useGetPlansQuery(queryParams);
  const { data: products } = useGetProductsQuery({ page: 1, pageSize: 100 });

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
    const normalizedSearch = String(formData.get("search") ?? "").trim();
    const normalizedActive = String(formData.get("active") ?? "").trim();
    const normalizedCurrency = String(formData.get("currency") ?? "")
      .trim()
      .toUpperCase();
    const normalizedSort = String(formData.get("sort") ?? "").trim();
    const normalizedOrder = String(formData.get("order") ?? "").trim();
    const normalizedPageSize = String(formData.get("pageSize") ?? "").trim();

    if (normalizedSearch) {
      nextParams.set("search", normalizedSearch);
    } else {
      nextParams.delete("search");
    }

    if (normalizedActive) {
      nextParams.set("active", normalizedActive);
    } else {
      nextParams.delete("active");
    }

    if (normalizedCurrency) {
      nextParams.set("currency", normalizedCurrency);
    } else {
      nextParams.delete("currency");
    }

    if (normalizedSort) {
      nextParams.set("sort", normalizedSort);
    } else {
      nextParams.delete("sort");
    }

    if (normalizedOrder) {
      nextParams.set("order", normalizedOrder);
    } else {
      nextParams.delete("order");
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
      <StatePanel eyebrow="Plans" title="Plans" message="Loading plans..." />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Plans"
        title="Plans"
        message="Unable to load plans."
      />
    );
  }

  const plans = data?.data || [];

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          eyebrow="Plans"
          title="Listing"
          description="Paginated plans listing with backend search, status, currency filters, and URL state."
        />

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing plans...</p>
        ) : null}

        <form
          key={searchParams.toString()}
          className="mt-8 grid gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-2 xl:grid-cols-6"
          onSubmit={handleFiltersSubmit}
        >
          <div className="space-y-2 xl:col-span-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="plan-search"
            >
              Search
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.search ?? ""}
              id="plan-search"
              name="search"
              placeholder="Code or name"
              type="search"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="plan-status"
            >
              Status
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.active ?? ""}
              id="plan-status"
              name="active"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="plan-currency"
            >
              Currency
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.currency ?? ""}
              id="plan-currency"
              maxLength={3}
              name="currency"
              placeholder="EUR"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="plan-sort"
            >
              Sort by
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.sort ?? ""}
              id="plan-sort"
              name="sort"
            >
              <option value="">Default</option>
              <option value="code">Code</option>
              <option value="name">Name</option>
              <option value="amount">Amount</option>
              <option value="createdAt">Created date</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="plan-order"
            >
              Order
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.order ?? ""}
              id="plan-order"
              name="order"
            >
              <option value="">Default</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="plan-page-size"
            >
              Page size
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={String(queryParams.pageSize ?? 20)}
              id="plan-page-size"
              name="pageSize"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-6">
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
              {data?.total ?? 0} plans found. Page {data?.page ?? 1} of{" "}
              {data?.totalPages || 1}.
            </p>
          </div>
        </form>

        {plans.length === 0 ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            No plans found.
          </p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {plans.map((plan) => {
            const product = products?.data.find(
              (item) => item.id === plan.productId,
            );

            return (
              <li
                className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
                key={plan.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
                        {plan.code}
                      </p>
                      <p className="text-lg font-semibold text-slate-950">
                        {plan.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {plan.description || "No description provided."}
                      </p>
                      <Link
                        className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                        href={`/plans/${plan.id}`}
                      >
                        View details
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                        {formatPricing(plan.amount, plan.currency, plan.interval)}
                      </span>
                      <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-sm text-slate-700">
                        {formatInterval(plan.interval, plan.intervalCount)}
                      </span>
                      {plan.trialDays > 0 ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                          Trial {plan.trialDays} day
                          {plan.trialDays === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[18rem]">
                    <div>
                      <dt className="font-medium text-slate-500">Status</dt>
                      <dd>
                        <span
                          className={
                            plan.active
                              ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                              : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
                          }
                        >
                          {plan.active ? "Active" : "Inactive"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Product</dt>
                      <dd>
                        {product ? product.name : `Product ID ${plan.productId}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Created</dt>
                      <dd>{formatDate(plan.createdAt)}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            );
          })}
        </ul>

        <PaginationControls
          currentPage={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          displayedResults={plans.length}
          onPageChange={handlePageChange}
        />
      </section>
    </main>
  );
}
