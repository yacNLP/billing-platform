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
import type {
  InvoiceStatus,
  InvoicesQueryParams,
} from "@/features/invoices/types";
import { useGetInvoicesQuery } from "@/features/invoices/invoices-api";
import { formatDate, formatMoney } from "@/lib/formatters";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

const statusClassNameMap: Record<InvoiceStatus, string> = {
  ISSUED:
    "inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700",
  PAID:
    "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700",
  VOID:
    "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600",
  OVERDUE:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700",
};

function getQueryParams(searchParams: URLSearchParams): InvoicesQueryParams {
  const page = parsePositiveInteger(searchParams.get("page")) ?? 1;
  const pageSize = parsePositiveInteger(searchParams.get("pageSize")) ?? 20;
  const status = searchParams.get("status");

  return {
    page,
    pageSize,
    status:
      status === "ISSUED" ||
      status === "PAID" ||
      status === "VOID" ||
      status === "OVERDUE"
        ? status
        : undefined,
    customerId: parsePositiveInteger(searchParams.get("customerId")),
    subscriptionId: parsePositiveInteger(searchParams.get("subscriptionId")),
  };
}

export function InvoicesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } = useGetInvoicesQuery(queryParams);

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
    const normalizedSubscriptionId = String(
      formData.get("subscriptionId") ?? "",
    ).trim();
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

    if (normalizedSubscriptionId) {
      nextParams.set("subscriptionId", normalizedSubscriptionId);
    } else {
      nextParams.delete("subscriptionId");
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
        eyebrow="Invoices"
        title="Invoices"
        message="Loading invoices..."
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Invoices"
        title="Invoices"
        message="Unable to load invoices."
      />
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <StatePanel
        eyebrow="Invoices"
        title="Invoices"
        message="No invoices found."
      />
    );
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          eyebrow="Invoices"
          title="Listing"
          description="Paginated invoices listing with backend-aligned filters and URL state."
        />

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing invoices...</p>
        ) : null}

        <form
          key={searchParams.toString()}
          className="mt-8 grid gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={handleFiltersSubmit}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="invoice-status">
              Status
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.status ?? ""}
              id="invoice-status"
              name="status"
            >
              <option value="">All statuses</option>
              <option value="ISSUED">ISSUED</option>
              <option value="PAID">PAID</option>
              <option value="VOID">VOID</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="invoice-customer-id">
              Customer ID
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={
                queryParams.customerId ? String(queryParams.customerId) : ""
              }
              id="invoice-customer-id"
              inputMode="numeric"
              min="1"
              name="customerId"
              placeholder="e.g. 12"
              type="number"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="invoice-subscription-id"
            >
              Subscription ID
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={
                queryParams.subscriptionId
                  ? String(queryParams.subscriptionId)
                  : ""
              }
              id="invoice-subscription-id"
              inputMode="numeric"
              min="1"
              name="subscriptionId"
              placeholder="e.g. 24"
              type="number"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="invoice-page-size">
              Page size
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={String(queryParams.pageSize ?? 20)}
              id="invoice-page-size"
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
              {data.total} invoices found. Page {data.page} of {data.totalPages || 1}.
            </p>
          </div>
        </form>

        <ul className="mt-8 space-y-4">
          {data.data.map((invoice) => (
            <li
              className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
              key={invoice.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-slate-950">
                        {invoice.invoiceNumber}
                      </p>
                      <span className={statusClassNameMap[invoice.status]}>
                        {invoice.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600">
                      Invoice #{invoice.id} · Customer ID {invoice.customerId} ·
                      Subscription ID {invoice.subscriptionId}
                    </p>
                    <Link
                      className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                      href={`/invoices/${invoice.id}`}
                    >
                      View details
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                      Due {formatMoney(invoice.amountDue, invoice.currency)}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-sm text-slate-700">
                      Paid {formatMoney(invoice.amountPaid, invoice.currency)}
                    </span>
                  </div>
                </div>

                <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[22rem]">
                  <div>
                    <dt className="font-medium text-slate-500">Period start</dt>
                    <dd>{formatDate(invoice.periodStart)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Period end</dt>
                    <dd>{formatDate(invoice.periodEnd)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Issued</dt>
                    <dd>{formatDate(invoice.issuedAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Due</dt>
                    <dd>{formatDate(invoice.dueAt)}</dd>
                  </div>
                  {invoice.paidAt ? (
                    <div>
                      <dt className="font-medium text-slate-500">Paid at</dt>
                      <dd>{formatDate(invoice.paidAt)}</dd>
                    </div>
                  ) : null}
                  {invoice.voidedAt ? (
                    <div>
                      <dt className="font-medium text-slate-500">Voided at</dt>
                      <dd>{formatDate(invoice.voidedAt)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-medium text-slate-500">Created</dt>
                    <dd>{formatDate(invoice.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
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
