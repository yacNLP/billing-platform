"use client";

import type { InvoiceStatus } from "@/features/invoices/types";
import { useGetInvoiceByIdQuery } from "@/features/invoices/invoices-api";

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

type InvoiceDetailsProps = {
  id: number;
};

export function InvoiceDetails({ id }: InvoiceDetailsProps) {
  const { data, error, isLoading } = useGetInvoiceByIdQuery(id);

  if (isLoading) {
    return <StatePanel title="Invoice details" message="Loading invoice..." />;
  }

  if (error) {
    return <StatePanel title="Invoice details" message="Unable to load invoice." />;
  }

  if (!data) {
    return <StatePanel title="Invoice details" message="Invoice not found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Invoices
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              {data.invoiceNumber}
            </h2>
            <span className={statusClassNameMap[data.status]}>{data.status}</span>
          </div>
          <p className="text-base leading-7 text-slate-600">
            Invoice #{data.id} for customer ID {data.customerId} and subscription
            ID {data.subscriptionId}.
          </p>
        </div>

        <dl className="mt-8 space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Invoice number</dt>
            <dd className="mt-1 text-base text-slate-950">{data.invoiceNumber}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Customer ID</dt>
            <dd className="mt-1 text-base text-slate-950">{data.customerId}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Subscription ID</dt>
            <dd className="mt-1 text-base text-slate-950">{data.subscriptionId}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Amount due</dt>
            <dd className="mt-1 text-base text-slate-950">
              {formatMoney(data.amountDue, data.currency)}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Amount paid</dt>
            <dd className="mt-1 text-base text-slate-950">
              {formatMoney(data.amountPaid, data.currency)}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Period start</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.periodStart))}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Period end</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.periodEnd))}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Issued</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.issuedAt))}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Due</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.dueAt))}
            </dd>
          </div>

          {data.paidAt ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">Paid at</dt>
              <dd className="mt-1 text-base text-slate-950">
                {dateFormatter.format(new Date(data.paidAt))}
              </dd>
            </div>
          ) : null}

          {data.voidedAt ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">Voided at</dt>
              <dd className="mt-1 text-base text-slate-950">
                {dateFormatter.format(new Date(data.voidedAt))}
              </dd>
            </div>
          ) : null}

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.createdAt))}
            </dd>
          </div>
        </dl>
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
