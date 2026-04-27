"use client";

import Link from "next/link";
import { FormEvent } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useGetCustomersQuery } from "@/features/customers/customers-api";
import type { CustomersQueryParams } from "@/features/customers/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

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

export function CustomersList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    return <StatePanel title="Customers" message="Loading customers..." />;
  }

  if (error) {
    return <StatePanel title="Customers" message="Unable to load customers." />;
  }

  const customers = data?.data || [];
  const hasPreviousPage = data ? data.page > 1 : false;
  const hasNextPage = data ? data.page < data.totalPages : false;

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Customers
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Listing
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Paginated customer listing with URL-driven search and sorting.
          </p>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing customers...</p>
        ) : null}

        <form
          key={searchParams.toString()}
          className="mt-8 grid gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={handleFiltersSubmit}
        >
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="customer-search"
            >
              Search
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.search ?? ""}
              id="customer-search"
              name="search"
              placeholder="Name or email"
              type="search"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="customer-sort-by"
            >
              Sort by
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
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

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="customer-order"
            >
              Order
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.order ?? ""}
              id="customer-order"
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
              htmlFor="customer-page-size"
            >
              Page size
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
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
              {data?.total ?? 0} customers found. Page {data?.page ?? 1} of{" "}
              {data?.totalPages || 1}.
            </p>
          </div>
        </form>

        {customers.length === 0 ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            No customers found.
          </p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {customers.map((customer) => (
            <li
              className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
              key={customer.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-950">
                    {customer.name}
                  </p>
                  <p className="text-sm text-slate-600">{customer.email}</p>
                  <Link
                    className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                    href={`/customers/${customer.id}`}
                  >
                    View details
                  </Link>
                </div>

                {/* Keep the first version simple with a readable creation date only. */}
                <p className="text-sm text-slate-500">
                  Created {dateFormatter.format(new Date(customer.createdAt))}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing page {data?.page ?? 1} with {customers.length} result
            {customers.length > 1 ? "s" : ""}.
          </p>
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasPreviousPage}
              onClick={() => handlePageChange((data?.page ?? 1) - 1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasNextPage}
              onClick={() => handlePageChange((data?.page ?? 1) + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

type StatePanelProps = {
  title: string;
  message: string;
};

function StatePanel({ title, message }: StatePanelProps) {
  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Customers
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="text-base leading-7 text-slate-600">{message}</p>
        </div>
      </section>
    </main>
  );
}
