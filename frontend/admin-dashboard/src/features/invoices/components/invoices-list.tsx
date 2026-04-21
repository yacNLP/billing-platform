"use client";

import Link from "next/link";

import type { InvoiceStatus } from "@/features/invoices/types";
import { useGetInvoicesQuery } from "@/features/invoices/invoices-api";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

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

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function InvoicesList() {
  const { data, error, isLoading, isFetching } = useGetInvoicesQuery();

  if (isLoading) {
    return <StatePanel title="Invoices" message="Loading invoices..." />;
  }

  if (error) {
    return <StatePanel title="Invoices" message="Unable to load invoices." />;
  }

  if (!data || data.length === 0) {
    return <StatePanel title="Invoices" message="No invoices found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Invoices
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Listing
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Read-only invoices listing wired to the protected billing invoices
            endpoint.
          </p>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing invoices...</p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {data.map((invoice) => (
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
                    <dd>{dateFormatter.format(new Date(invoice.periodStart))}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Period end</dt>
                    <dd>{dateFormatter.format(new Date(invoice.periodEnd))}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Issued</dt>
                    <dd>{dateFormatter.format(new Date(invoice.issuedAt))}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Due</dt>
                    <dd>{dateFormatter.format(new Date(invoice.dueAt))}</dd>
                  </div>
                  {invoice.paidAt ? (
                    <div>
                      <dt className="font-medium text-slate-500">Paid at</dt>
                      <dd>{dateFormatter.format(new Date(invoice.paidAt))}</dd>
                    </div>
                  ) : null}
                  {invoice.voidedAt ? (
                    <div>
                      <dt className="font-medium text-slate-500">Voided at</dt>
                      <dd>{dateFormatter.format(new Date(invoice.voidedAt))}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-medium text-slate-500">Created</dt>
                    <dd>{dateFormatter.format(new Date(invoice.createdAt))}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ul>
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
            Invoices
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
