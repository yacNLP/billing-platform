"use client";

import { useGetPlansQuery } from "@/features/plans/plans-api";
import type { BillingInterval } from "@/features/plans/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const intervalLabelMap: Record<BillingInterval, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

function formatPricing(amount: number, currency: string, interval: BillingInterval) {
  return `${(amount / 100).toFixed(2)} ${currency} / ${intervalLabelMap[interval]}`;
}

function formatInterval(interval: BillingInterval, intervalCount: number) {
  if (intervalCount === 1) {
    return `Every ${intervalLabelMap[interval]}`;
  }

  return `Every ${intervalCount} ${intervalLabelMap[interval]}s`;
}

export function PlansList() {
  const { data, error, isLoading, isFetching } = useGetPlansQuery();

  if (isLoading) {
    return <StatePanel title="Plans" message="Loading plans..." />;
  }

  if (error) {
    return <StatePanel title="Plans" message="Unable to load plans." />;
  }

  if (!data || data.length === 0) {
    return <StatePanel title="Plans" message="No plans found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Plans
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Listing
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Read-only plans listing wired to the protected billing plans endpoint.
          </p>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing plans...</p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {data.map((plan) => (
            <li
              className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
              key={plan.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
                      {plan.code}
                    </p>
                    <p className="text-lg font-semibold text-slate-950">{plan.name}</p>
                    <p className="text-sm text-slate-600">
                      {plan.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                      {formatPricing(plan.amount, plan.currency, plan.interval)}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-sm text-slate-700">
                      {formatInterval(plan.interval, plan.intervalCount)}
                    </span>
                    {plan.trialDays > 0 ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                        Trial {plan.trialDays} day{plan.trialDays === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[18rem]">
                  <div>
                    <dt className="font-medium text-slate-500">Status</dt>
                    <dd>
                      <span
                        className={
                          plan.active
                            ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                            : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
                        }
                      >
                        {plan.active ? "Active" : "Inactive"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Product ID</dt>
                    <dd>{plan.productId}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Created</dt>
                    <dd>{dateFormatter.format(new Date(plan.createdAt))}</dd>
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
            Plans
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
