"use client";

import Link from "next/link";

import { useGetPaymentsQuery } from "@/features/payments/payments-api";
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

export function PaymentsList() {
  const { data, error, isLoading, isFetching } = useGetPaymentsQuery();

  if (isLoading) {
    return <StatePanel title="Payments" message="Loading payments..." />;
  }

  if (error) {
    return <StatePanel title="Payments" message="Unable to load payments." />;
  }

  if (!data || data.length === 0) {
    return <StatePanel title="Payments" message="No payments found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Payments
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Listing
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Read-only payments listing wired to the protected billing payments
            endpoint.
          </p>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing payments...</p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {data.map((payment) => (
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
                      Invoice ID {payment.invoiceId}
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
