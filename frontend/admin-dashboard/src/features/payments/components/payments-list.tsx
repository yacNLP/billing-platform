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
import { useGetInvoicesQuery } from "@/features/invoices/invoices-api";
import { useGetPaymentsQuery } from "@/features/payments/payments-api";
import type {
  PaymentsQueryParams,
  PaymentStatus,
} from "@/features/payments/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const statusClassNameMap: Record<PaymentStatus, string> = {
  SUCCESS:
    "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700",
  FAILED:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700",
};

const pageSizeOptions = [10, 20, 50];

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

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

export function PaymentsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        eyebrow="Payments"
        title="Payments"
        message="Loading payments..."
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Payments"
        title="Payments"
        message="Unable to load payments."
      />
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <StatePanel
        eyebrow="Payments"
        title="Payments"
        message="No payments found."
      />
    );
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          eyebrow="Payments"
          title="Listing"
          description="Paginated payments listing with backend-aligned filters and URL state."
        />

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing payments...</p>
        ) : null}

        <form
          key={searchParams.toString()}
          className="mt-8 grid gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={handleFiltersSubmit}
        >
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="payment-status"
            >
              Status
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              defaultValue={queryParams.status ?? ""}
              id="payment-status"
              name="status"
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="payment-invoice"
            >
              Invoice
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
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

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="payment-customer"
            >
              Customer
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
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

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="payment-page-size"
            >
              Page size
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
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
              {data.total} payments found. Page {data.page} of{" "}
              {data.totalPages || 1}.
            </p>
          </div>
        </form>

        <ul className="mt-8 space-y-4">
          {data.data.map((payment) => {
            const invoice = invoices?.data.find(
              (item) => item.id === payment.invoiceId,
            );
            const customer = invoice
              ? customers?.data.find((item) => item.id === invoice.customerId)
              : undefined;

            return (
              <li
                className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
                key={payment.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-slate-950">
                          Payment #{payment.id}
                        </p>
                        <span className={statusClassNameMap[payment.status]}>
                          {payment.status}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600">
                        {invoice
                          ? `${invoice.invoiceNumber} · ${formatMoney(
                              invoice.amountDue,
                              invoice.currency,
                            )}`
                          : `Invoice ID ${payment.invoiceId}`}
                        {customer ? ` · ${customer.name}` : ""}
                      </p>
                      <Link
                        className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                        href={`/payments/${payment.id}`}
                      >
                        View details
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                        {formatMoney(payment.amount, payment.currency)}
                      </span>
                      {payment.provider ? (
                        <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-sm text-slate-700">
                          {payment.provider}
                        </span>
                      ) : null}
                      {payment.providerReference ? (
                        <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-sm text-slate-700">
                          {payment.providerReference}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[22rem]">
                    {payment.paidAt ? (
                      <div>
                        <dt className="font-medium text-slate-500">Paid at</dt>
                        <dd>{dateFormatter.format(new Date(payment.paidAt))}</dd>
                      </div>
                    ) : null}
                    {payment.failureReason ? (
                      <div>
                        <dt className="font-medium text-slate-500">Failure</dt>
                        <dd>{payment.failureReason}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="font-medium text-slate-500">Created</dt>
                      <dd>{dateFormatter.format(new Date(payment.createdAt))}</dd>
                    </div>
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
