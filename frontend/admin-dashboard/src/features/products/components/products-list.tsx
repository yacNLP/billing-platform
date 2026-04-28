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
import { useGetProductsQuery } from "@/features/products/products-api";
import type { ProductsQueryParams } from "@/features/products/types";
import { formatDate } from "@/lib/formatters";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

function getQueryParams(searchParams: URLSearchParams): ProductsQueryParams {
  const page = parsePositiveInteger(searchParams.get("page")) ?? 1;
  const pageSize = parsePositiveInteger(searchParams.get("pageSize")) ?? 20;
  const q = searchParams.get("q")?.trim();
  const isActive = searchParams.get("isActive");
  const sortBy = searchParams.get("sortBy");
  const order = searchParams.get("order");

  return {
    page,
    pageSize,
    q: q || undefined,
    isActive:
      isActive === "true" || isActive === "false" ? isActive : undefined,
    sortBy:
      sortBy === "name" || sortBy === "createdAt" || sortBy === "updatedAt"
        ? sortBy
        : undefined,
    order: order === "asc" || order === "desc" ? order : undefined,
  };
}

export function ProductsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } =
    useGetProductsQuery(queryParams);

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
    const normalizedSearch = String(formData.get("q") ?? "").trim();
    const normalizedIsActive = String(formData.get("isActive") ?? "").trim();
    const normalizedSortBy = String(formData.get("sortBy") ?? "").trim();
    const normalizedOrder = String(formData.get("order") ?? "").trim();
    const normalizedPageSize = String(formData.get("pageSize") ?? "").trim();

    if (normalizedSearch) {
      nextParams.set("q", normalizedSearch);
    } else {
      nextParams.delete("q");
    }

    if (normalizedIsActive) {
      nextParams.set("isActive", normalizedIsActive);
    } else {
      nextParams.delete("isActive");
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
        eyebrow="Products"
        title="Products"
        message="Loading products..."
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Products"
        title="Products"
        message="Unable to load products."
      />
    );
  }

  const products = data?.data || [];

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          eyebrow="Products"
          title="Listing"
          description="Paginated product listing with backend search, status filters, and URL state."
        />

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing products...</p>
        ) : null}

        <form
          key={searchParams.toString()}
          className="mt-8 grid gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-2 xl:grid-cols-5"
          onSubmit={handleFiltersSubmit}
        >
          <div className="space-y-2 xl:col-span-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="product-search"
            >
              Search
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.q ?? ""}
              id="product-search"
              name="q"
              placeholder="Product name"
              type="search"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="product-status"
            >
              Status
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.isActive ?? ""}
              id="product-status"
              name="isActive"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="product-sort-by"
            >
              Sort by
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.sortBy ?? ""}
              id="product-sort-by"
              name="sortBy"
            >
              <option value="">Default</option>
              <option value="name">Name</option>
              <option value="createdAt">Created date</option>
              <option value="updatedAt">Updated date</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="product-order"
            >
              Order
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.order ?? ""}
              id="product-order"
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
              htmlFor="product-page-size"
            >
              Page size
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={String(queryParams.pageSize ?? 20)}
              id="product-page-size"
              name="pageSize"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-5">
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
              {data?.total ?? 0} products found. Page {data?.page ?? 1} of{" "}
              {data?.totalPages || 1}.
            </p>
          </div>
        </form>

        {products.length === 0 ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            No products found.
          </p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {products.map((product) => (
            <li
              className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
              key={product.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-950">
                    {product.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {product.isActive ? "Active" : "Inactive"}
                  </p>
                  <Link
                    className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                    href={`/products/${product.id}`}
                  >
                    View details
                  </Link>
                </div>

                <p className="text-sm text-slate-500">
                  Created {formatDate(product.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <PaginationControls
          currentPage={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          displayedResults={products.length}
          onPageChange={handlePageChange}
        />
      </section>
    </main>
  );
}
