"use client";

import { useGetAnalyticsSummaryQuery } from "@/features/analytics/analytics-api";
import type { AnalyticsSummary } from "@/features/analytics/types";
import { formatMoney } from "@/lib/formatters";

const numberFormatter = new Intl.NumberFormat("en-US");

const summaryCards: Array<{
  key: keyof AnalyticsSummary;
  label: string;
  description: string;
  format?: "money";
}> = [
  {
    key: "estimatedMrr",
    label: "Estimated MRR",
    description: "Monthly recurring revenue estimated from active subscriptions.",
    format: "money",
  },
  {
    key: "totalRevenuePaid",
    label: "Revenue paid",
    description: "Total amount collected on paid invoices.",
    format: "money",
  },
  {
    key: "totalAmountDue",
    label: "Amount due",
    description: "Outstanding amount across issued and overdue invoices.",
    format: "money",
  },
  {
    key: "totalCustomers",
    label: "Customers",
    description: "Total customers currently present in the workspace.",
  },
  {
    key: "activeSubscriptions",
    label: "Active subscriptions",
    description: "Subscriptions currently active for this tenant.",
  },
  {
    key: "pastDueSubscriptions",
    label: "Past due subscriptions",
    description: "Subscriptions currently marked with payment issues.",
  },
  {
    key: "issuedInvoices",
    label: "Issued invoices",
    description: "Invoices issued and still waiting for payment.",
  },
  {
    key: "paidInvoices",
    label: "Paid invoices",
    description: "Invoices currently marked as paid.",
  },
  {
    key: "overdueInvoices",
    label: "Overdue invoices",
    description: "Invoices that have passed their due date.",
  },
  {
    key: "successfulPayments",
    label: "Successful payments",
    description: "Payments completed successfully.",
  },
  {
    key: "failedPayments",
    label: "Failed payments",
    description: "Payments that failed and may need follow-up.",
  },
];

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
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <div className="rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Analytics
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              Summary
            </h2>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Billing health, revenue, invoices, and subscription status for the
              current tenant.
            </p>
          </div>

          {isFetching ? (
            <p className="mt-6 text-sm text-slate-500">Refreshing analytics...</p>
          ) : null}
        </div>

        <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <MetricCard
              description={card.description}
              key={card.key}
              label={card.label}
              value={formatMetricValue(data[card.key], card.format)}
            />
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

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
};

function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </dd>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function formatMetricValue(value: number, format?: "money") {
  if (format === "money") {
    return formatMoney(value, "EUR");
  }

  return numberFormatter.format(value);
}
