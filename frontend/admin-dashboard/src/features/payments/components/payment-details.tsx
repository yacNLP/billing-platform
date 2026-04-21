"use client";

import { useGetPaymentByIdQuery } from "@/features/payments/payments-api";
import type { PaymentStatus } from "@/features/payments/types";

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

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

type PaymentDetailsProps = {
  id: number;
};

export function PaymentDetails({ id }: PaymentDetailsProps) {
  const { data, error, isLoading } = useGetPaymentByIdQuery(id);

  if (isLoading) {
    return <StatePanel title="Payment details" message="Loading payment..." />;
  }

  if (error) {
    return <StatePanel title="Payment details" message="Unable to load payment." />;
  }

  if (!data) {
    return <StatePanel title="Payment details" message="Payment not found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Payments
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              Payment #{data.id}
            </h2>
            <span className={statusClassNameMap[data.status]}>{data.status}</span>
          </div>
          <p className="text-base leading-7 text-slate-600">
            Payment for invoice ID {data.invoiceId}.
          </p>
        </div>

        <dl className="mt-8 space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Invoice ID</dt>
            <dd className="mt-1 text-base text-slate-950">{data.invoiceId}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Amount</dt>
            <dd className="mt-1 text-base text-slate-950">
              {formatMoney(data.amount, data.currency)}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Currency</dt>
            <dd className="mt-1 text-base text-slate-950">{data.currency}</dd>
          </div>

          {data.paidAt ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">Paid at</dt>
              <dd className="mt-1 text-base text-slate-950">
                {dateFormatter.format(new Date(data.paidAt))}
              </dd>
            </div>
          ) : null}

          {data.failureReason ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">
                Failure reason
              </dt>
              <dd className="mt-1 text-base text-slate-950">
                {data.failureReason}
              </dd>
            </div>
          ) : null}

          {data.provider ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">Provider</dt>
              <dd className="mt-1 text-base text-slate-950">{data.provider}</dd>
            </div>
          ) : null}

          {data.providerReference ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">
                Provider reference
              </dt>
              <dd className="mt-1 text-base text-slate-950">
                {data.providerReference}
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
            Payments
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
