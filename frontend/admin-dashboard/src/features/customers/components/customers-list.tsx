"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { StatePanel } from "@/components/admin/state-panel";
import { useGetCustomersQuery } from "@/features/customers/customers-api";
import type { CustomersQueryParams } from "@/features/customers/types";
import { formatDate } from "@/lib/formatters";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

type CustomersListProps = {
  action?: ReactNode;
};

function getQueryParams(searchParams: URLSearchParams): CustomersQueryParams {
  const page = parsePositiveInteger(searchParams.get("page")) ?? 1;
  const pageSize = parsePositiveInteger(searchParams.get("pageSize")) ?? 10;
  const sortBy = searchParams.get("sortBy");
  const order = searchParams.get("order");
  const search = searchParams.get("search")?.trim();

  return {
    page,
    pageSize,
    search: search || undefined,
    sortBy:
      sortBy === "name" || sortBy === "email" || sortBy === "createdAt"
        ? sortBy
        : undefined,
    order: order === "asc" || order === "desc" ? order : undefined,
  };
}

function hasActiveFilters(queryParams: CustomersQueryParams): boolean {
  return Boolean(queryParams.search);
}

export function CustomersList({ action }: CustomersListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } =
    useGetCustomersQuery(queryParams);

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
    const normalizedSortBy = String(formData.get("sortBy") ?? "").trim();
    const normalizedOrder = String(formData.get("order") ?? "").trim();
    const normalizedPageSize = String(formData.get("pageSize") ?? "").trim();

    if (normalizedSearch) {
      nextParams.set("search", normalizedSearch);
    } else {
      nextParams.delete("search");
    }

    if (normalizedSortBy) {
      nextParams.set("sortBy", normalizedSortBy);
    } else {
      nextParams.delete("sortBy");
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
    nextParams.set("pageSize", "10");
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
        eyebrow="Customers"
        title="Customers"
        message="Loading customers..."
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Customers"
        title="Customers"
        message="Unable to load customers."
      />
    );
  }

  const customers = data?.data || [];
  const hasFilters = hasActiveFilters(queryParams);
  const isEmptyDataset = data?.total === 0;
  const isEmptyCurrentPage = customers.length === 0;
  const activeFilterCount = [
    queryParams.search,
    queryParams.sortBy,
    queryParams.order,
  ].filter(Boolean).length;
  const filterSummaryItems = [
    {
      label: "Search",
      value: queryParams.search || "Any customer",
    },
    {
      label: "Sort",
      value: queryParams.sortBy ?? "Default",
    },
    {
      label: "Order",
      value: queryParams.order ?? "Default",
    },
    {
      label: "Page size",
      value: `${queryParams.pageSize ?? 10} / page`,
    },
  ];

  if (isEmptyDataset && !hasFilters) {
    return (
      <StatePanel
        action={action}
        eyebrow="Customers"
        title="Customers"
        message="No customers found yet."
      />
    );
  }

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          action={action}
          eyebrow="Customers"
          title="Listing"
          description="Paginated customer listing with URL-driven search and sorting."
        />

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing customers...</p>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-[1.25rem] border border-[var(--color-border)] bg-white shadow-[0_14px_38px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="text-sm font-semibold text-slate-950">
                  Customer filters
                </p>
                <span className="hidden h-4 w-px bg-[var(--color-border)] sm:inline-block" />
                {activeFilterCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                    {activeFilterCount} active
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-500">
                    No active filters
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                {filterSummaryItems.map((item, index) => (
                  <span
                    className="inline-flex items-center gap-x-2"
                    key={item.label}
                  >
                    {index > 0 ? (
                      <span className="text-slate-300">·</span>
                    ) : null}
                    <span>
                      <span className="font-medium text-slate-800">
                        {item.label}:
                      </span>{" "}
                      {item.value}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <button
              className="self-start rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 lg:self-center"
              onClick={() => setAreFiltersOpen((value) => !value)}
              type="button"
            >
              {areFiltersOpen ? "Hide filters" : "Adjust filters"}
            </button>
          </div>

          {areFiltersOpen ? (
            <form
              key={searchParams.toString()}
              className="grid gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-5 py-4 md:grid-cols-2 xl:grid-cols-4"
              onSubmit={handleFiltersSubmit}
            >
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                  htmlFor="customer-search"
                >
                  Search
                </label>
                <input
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={queryParams.search ?? ""}
                  id="customer-search"
                  name="search"
                  placeholder="Name or email"
                  type="search"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                  htmlFor="customer-sort-by"
                >
                  Sort by
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={queryParams.sortBy ?? ""}
                  id="customer-sort-by"
                  name="sortBy"
                >
                  <option value="">Default</option>
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="createdAt">Created date</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                  htmlFor="customer-order"
                >
                  Order
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={queryParams.order ?? ""}
                  id="customer-order"
                  name="order"
                >
                  <option value="">Default</option>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                  htmlFor="customer-page-size"
                >
                  Page size
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={String(queryParams.pageSize ?? 10)}
                  id="customer-page-size"
                  name="pageSize"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} / page
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 md:col-span-2 xl:col-span-4">
                <button
                  className="rounded-xl bg-[var(--color-accent)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(79,70,229,0.18)] transition hover:bg-[var(--color-accent-hover)]"
                  type="submit"
                >
                  Apply filters
                </button>
                <button
                  className="rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={handleResetFilters}
                  type="button"
                >
                  Reset
                </button>
                <p className="text-sm text-slate-500">
                  {data?.total ?? 0} customers found. Page {data?.page ?? 1} of{" "}
                  {data?.totalPages || 1}.
                </p>
              </div>
            </form>
          ) : null}
        </section>

        {isEmptyCurrentPage ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            {hasFilters
              ? "No customers match the current filters."
              : "No customers on this page."}
          </p>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white">
          <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(260px,1.3fr)_minmax(150px,0.8fr)_110px] border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 xl:grid">
            <span>Customer</span>
            <span>Email</span>
            <span>Created</span>
            <span className="text-right">Action</span>
          </div>

          <ul className="divide-y divide-[var(--color-border)]">
          {customers.map((customer) => (
            <li
              className="bg-white px-5 py-4 transition hover:bg-slate-50/80"
              key={customer.id}
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.2fr)_minmax(260px,1.3fr)_minmax(150px,0.8fr)_110px] xl:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {customer.name}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Customer #{customer.id}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {customer.email}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>

                <div className="flex xl:justify-end">
                  <Link
                    className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    href={`/customers/${customer.id}`}
                  >
                    Details
                  </Link>
                </div>
              </div>
            </li>
          ))}
          </ul>
        </div>

        <PaginationControls
          currentPage={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          displayedResults={customers.length}
          onPageChange={handlePageChange}
        />
      </section>
    </main>
  );
}
