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
import { useGetPlansQuery } from "@/features/plans/plans-api";
import { useGetProductsQuery } from "@/features/products/products-api";
import type { ProductsQueryParams } from "@/features/products/types";
import { formatDate } from "@/lib/formatters";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

type ProductsListProps = {
  action?: ReactNode;
};

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

function hasActiveFilters(queryParams: ProductsQueryParams): boolean {
  return Boolean(queryParams.q || queryParams.isActive);
}

export function ProductsList({ action }: ProductsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } =
    useGetProductsQuery(queryParams);
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
  const hasFilters = hasActiveFilters(queryParams);
  const isEmptyDataset = data?.total === 0;
  const isEmptyCurrentPage = products.length === 0;
  const activeFilterCount = [
    queryParams.q,
    queryParams.isActive,
    queryParams.sortBy,
    queryParams.order,
  ].filter(Boolean).length;
  const filterSummaryItems = [
    {
      label: "Search",
      value: queryParams.q || "Any product",
    },
    {
      label: "Status",
      value:
        queryParams.isActive === "true"
          ? "Active"
          : queryParams.isActive === "false"
            ? "Inactive"
            : "All statuses",
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
      value: `${queryParams.pageSize ?? 20} / page`,
    },
  ];

  if (isEmptyDataset && !hasFilters) {
    return (
      <StatePanel
        action={action}
        eyebrow="Products"
        title="Products"
        message="No products found yet."
      />
    );
  }

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          action={action}
          eyebrow="Products"
          title="Listing"
          description="Paginated product listing with backend search, status filters, and URL state."
        />

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing products...</p>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-[1.25rem] border border-[var(--color-border)] bg-white shadow-[0_14px_38px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="text-sm font-semibold text-slate-950">
                  Product filters
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
              className="grid gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-5 py-4 md:grid-cols-2 xl:grid-cols-5"
              onSubmit={handleFiltersSubmit}
            >
          <div className="space-y-2 xl:col-span-2">
            <label
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              htmlFor="product-search"
            >
              Search
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={queryParams.q ?? ""}
              id="product-search"
              name="q"
              placeholder="Product name"
              type="search"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              htmlFor="product-status"
            >
              Status
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
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
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              htmlFor="product-sort-by"
            >
              Sort by
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
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
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              htmlFor="product-order"
            >
              Order
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
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
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              htmlFor="product-page-size"
            >
              Page size
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
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
              {data?.total ?? 0} products found. Page {data?.page ?? 1} of{" "}
              {data?.totalPages || 1}.
            </p>
          </div>
            </form>
          ) : null}
        </section>

        {isEmptyCurrentPage ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            {hasFilters
              ? "No products match the current filters."
              : "No products on this page."}
          </p>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white">
          <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(280px,1.4fr)_minmax(130px,0.8fr)_minmax(120px,0.7fr)_minmax(130px,0.8fr)_110px] border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 xl:grid">
            <span>Product</span>
            <span>Description</span>
            <span>Status</span>
            <span>Plans</span>
            <span>Created</span>
            <span className="text-right">Action</span>
          </div>

          <ul className="divide-y divide-[var(--color-border)]">
          {products.map((product) => {
            const linkedPlansCount = plans?.data.filter(
              (plan) => plan.productId === product.id,
            ).length;
            const descriptionLabel =
              product.description || "No description provided.";

            return (
            <li
              className="bg-white px-5 py-4 transition hover:bg-slate-50/80"
              key={product.id}
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.2fr)_minmax(280px,1.4fr)_minmax(130px,0.8fr)_minmax(120px,0.7fr)_minmax(130px,0.8fr)_110px] xl:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Product #{product.id}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                    {descriptionLabel}
                  </p>
                </div>

                <div>
                  <span
                    className={
                      product.isActive
                        ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                        : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
                    }
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {linkedPlansCount !== undefined
                      ? linkedPlansCount
                      : "Loading..."}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(product.createdAt)}
                  </p>
                </div>

                <div className="flex xl:justify-end">
                  <Link
                    className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    href={`/products/${product.id}`}
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
          currentPage={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          displayedResults={products.length}
          onPageChange={handlePageChange}
        />
      </section>
    </main>
  );
}
