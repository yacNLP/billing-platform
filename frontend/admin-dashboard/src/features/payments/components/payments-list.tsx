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
import { useGetInvoicesQuery } from "@/features/invoices/invoices-api";
import { useGetPaymentsQuery } from "@/features/payments/payments-api";
import type {
  PaymentsQueryParams,
  PaymentStatus,
} from "@/features/payments/types";
import { formatDate, formatMoney } from "@/lib/formatters";
import { pageSizeOptions } from "@/lib/pagination";
import { parsePositiveInteger } from "@/lib/query-params";

const statusClassNameMap: Record<PaymentStatus, string> = {
  SUCCESS:
    "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700",
  FAILED:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700",
};

type PaymentsListProps = {
  action?: ReactNode;
};

function getQueryParams(searchParams: URLSearchParams): PaymentsQueryParams {
  const page = parsePositiveInteger(searchParams.get("page")) ?? 1;
  const pageSize = parsePositiveInteger(searchParams.get("pageSize")) ?? 20;
  const status = searchParams.get("status");

  return {
    page,
    pageSize,
    invoiceId: parsePositiveInteger(searchParams.get("invoiceId")),
    customerId: parsePositiveInteger(searchParams.get("customerId")),
    status:
      status === "SUCCESS" || status === "FAILED" ? status : undefined,
  };
}

function hasActiveFilters(queryParams: PaymentsQueryParams): boolean {
  return Boolean(queryParams.status || queryParams.invoiceId || queryParams.customerId);
}

export function PaymentsList({ action }: PaymentsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const queryParams = getQueryParams(searchParams);
  const { data, error, isLoading, isFetching } =
    useGetPaymentsQuery(queryParams);
  const { data: invoices } = useGetInvoicesQuery({ page: 1, pageSize: 100 });
  const { data: customers } = useGetCustomersQuery({ page: 1, pageSize: 100 });

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
    const normalizedInvoiceId = String(formData.get("invoiceId") ?? "").trim();
    const normalizedCustomerId = String(formData.get("customerId") ?? "").trim();
    const normalizedPageSize = String(formData.get("pageSize") ?? "").trim();

    if (normalizedStatus) {
      nextParams.set("status", normalizedStatus);
    } else {
      nextParams.delete("status");
    }

    if (normalizedInvoiceId) {
      nextParams.set("invoiceId", normalizedInvoiceId);
    } else {
      nextParams.delete("invoiceId");
    }

    if (normalizedCustomerId) {
      nextParams.set("customerId", normalizedCustomerId);
    } else {
      nextParams.delete("customerId");
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
        action={action}
        eyebrow="Payments"
        title="Payments"
        message="Loading payments..."
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        action={action}
        eyebrow="Payments"
        title="Payments"
        message="Unable to load payments."
      />
    );
  }

  if (!data) {
    return (
      <StatePanel
        action={action}
        eyebrow="Payments"
        title="Payments"
        message="No payments found yet."
      />
    );
  }

  const hasFilters = hasActiveFilters(queryParams);
  const isEmptyDataset = data.total === 0;
  const isEmptyCurrentPage = data.data.length === 0;
  const activeFilterCount = [
    queryParams.status,
    queryParams.invoiceId,
    queryParams.customerId,
  ].filter(Boolean).length;
  const selectedInvoice = queryParams.invoiceId
    ? invoices?.data.find((invoice) => invoice.id === queryParams.invoiceId)
    : undefined;
  const selectedInvoiceCustomer = selectedInvoice
    ? customers?.data.find((customer) => customer.id === selectedInvoice.customerId)
    : undefined;
  const selectedCustomer = queryParams.customerId
    ? customers?.data.find((customer) => customer.id === queryParams.customerId)
    : undefined;
  const filterSummaryItems = [
    {
      label: "Status",
      value: queryParams.status ?? "All statuses",
    },
    {
      label: "Invoice",
      value: selectedInvoice
        ? `${selectedInvoice.invoiceNumber}${
            selectedInvoiceCustomer ? ` · ${selectedInvoiceCustomer.name}` : ""
          }`
        : queryParams.invoiceId
          ? `Invoice ID ${queryParams.invoiceId}`
          : "All invoices",
    },
    {
      label: "Customer",
      value:
        selectedCustomer?.name ??
        (queryParams.customerId
          ? `Customer ID ${queryParams.customerId}`
          : "All customers"),
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
        eyebrow="Payments"
        title="Payments"
        message="No payments found yet."
      />
    );
  }

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          action={action}
          eyebrow="Payments"
          title="Listing"
          description="Paginated payments listing with backend-aligned filters and URL state."
        />

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing payments...</p>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-[1.25rem] border border-[var(--color-border)] bg-white shadow-[0_14px_38px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="text-sm font-semibold text-slate-950">
                  Payment filters
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
                  <span className="inline-flex items-center gap-x-2" key={item.label}>
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
                  htmlFor="payment-status"
                >
                  Status
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={queryParams.status ?? ""}
                  id="payment-status"
                  name="status"
                >
                  <option value="">All statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                  htmlFor="payment-invoice"
                >
                  Invoice
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={
                    queryParams.invoiceId ? String(queryParams.invoiceId) : ""
                  }
                  id="payment-invoice"
                  name="invoiceId"
                >
                  <option value="">All invoices</option>
                  {(invoices?.data || []).map((invoice) => {
                    const customer = customers?.data.find(
                      (item) => item.id === invoice.customerId,
                    );

                    return (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} ·{" "}
                        {formatMoney(invoice.amountDue, invoice.currency)}
                        {customer ? ` · ${customer.name}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                  htmlFor="payment-customer"
                >
                  Customer
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={
                    queryParams.customerId ? String(queryParams.customerId) : ""
                  }
                  id="payment-customer"
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

              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                  htmlFor="payment-page-size"
                >
                  Page size
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={String(queryParams.pageSize ?? 20)}
                  id="payment-page-size"
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
                  {data.total} payments found. Page {data.page} of{" "}
                  {data.totalPages || 1}.
                </p>
              </div>
            </form>
          ) : null}
        </section>

        {isEmptyCurrentPage ? (
          <p className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-slate-600">
            {hasFilters
              ? "No payments match the current filters."
              : "No payments on this page."}
          </p>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white">
          <div className="hidden grid-cols-[minmax(170px,1fr)_minmax(220px,1.2fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(130px,0.8fr)_110px] border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 xl:grid">
            <span>Payment</span>
            <span>Invoice</span>
            <span>Amount</span>
            <span>Provider</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          <ul className="divide-y divide-[var(--color-border)]">
          {data.data.map((payment) => {
            const invoice = invoices?.data.find(
              (item) => item.id === payment.invoiceId,
            );
            const customer = invoice
              ? customers?.data.find((item) => item.id === invoice.customerId)
              : undefined;
            const invoiceLabel = invoice
              ? invoice.invoiceNumber
              : `Invoice ID ${payment.invoiceId}`;
            const invoiceContext = invoice
              ? `${formatMoney(invoice.amountDue, invoice.currency)}${
                  customer ? ` · ${customer.name}` : ""
                }`
              : "Invoice details unavailable";
            const providerLabel = payment.provider ?? "Manual";
            const paidAtLabel = payment.paidAt
              ? formatDate(payment.paidAt)
              : "Not paid";

            return (
              <li
                className="bg-white px-5 py-4 transition hover:bg-slate-50/80"
                key={payment.id}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(170px,1fr)_minmax(220px,1.2fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(130px,0.8fr)_110px] xl:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">
                      Payment #{payment.id}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {paidAtLabel}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {invoiceLabel}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {invoiceContext}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatMoney(payment.amount, payment.currency)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {providerLabel}
                    </p>
                  </div>

                  <div>
                    <span className={statusClassNameMap[payment.status]}>
                      {payment.status}
                    </span>
                  </div>

                  <div className="flex xl:justify-end">
                    <Link
                      className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      href={`/payments/${payment.id}`}
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
