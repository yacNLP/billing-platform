"use client";

import { useGetAnalyticsSummaryQuery } from "@/features/analytics/analytics-api";

const summaryFields = [
  { key: "totalCustomers", label: "Total customers" },
  { key: "activeSubscriptions", label: "Active subscriptions" },
  { key: "overdueInvoicesCount", label: "Overdue invoices count" },
  { key: "overdueAmount", label: "Overdue amount" },
  { key: "successfulPaymentsCount", label: "Successful payments count" },
  { key: "failedPaymentsCount", label: "Failed payments count" },
  { key: "mrr", label: "MRR" },
  { key: "paidInvoicesThisMonth", label: "Paid invoices this month" },
] as const;

export function AnalyticsSummaryPanel() {
  const { data, error, isLoading, isFetching } = useGetAnalyticsSummaryQuery();

  if (isLoading) {
    return <StatePanel title="Dashboard" message="Loading analytics summary..." />;
  }

  if (error) {
    return (
      <StatePanel
        title="Dashboard"
        message="Unable to load analytics summary."
      />
    );
  }

  if (!data) {
    return <StatePanel title="Dashboard" message="No analytics data available." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Analytics
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Summary
          </h2>
          <p className="text-base leading-7 text-slate-600">
            Minimal dashboard data wired to the protected analytics endpoint.
          </p>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing analytics...</p>
        ) : null}

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          {summaryFields.map((field) => (
            <div
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
              key={field.key}
            >
              <dt className="text-sm font-medium text-slate-600">{field.label}</dt>
              {/* Keep the first dashboard step simple: just show raw summary values. */}
              <dd className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {data[field.key]}
              </dd>
            </div>
          ))}
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
            Analytics
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
