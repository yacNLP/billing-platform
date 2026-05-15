"use client";

import { useGetAnalyticsSummaryQuery } from "@/features/analytics/analytics-api";
import type {
  AnalyticsSummary,
  SubscriptionsByPlan,
} from "@/features/analytics/types";
import { formatMoney } from "@/lib/formatters";

const numberFormatter = new Intl.NumberFormat("en-US");

type MetricFormat = "money" | "percent";
type MetricTone = "default" | "success" | "warning" | "danger" | "accent";

type MetricDefinition = {
  description?: string;
  format?: MetricFormat;
  key: keyof Omit<AnalyticsSummary, "subscriptionsByPlan">;
  label: string;
  tone?: MetricTone;
};

const collectionRiskMetrics: MetricDefinition[] = [
  {
    key: "overdueAmount",
    label: "Overdue amount",
    format: "money",
    tone: "danger",
  },
  {
    key: "overdueInvoices",
    label: "Overdue invoices",
    tone: "danger",
  },
  {
    key: "failedPayments",
    label: "Failed payments",
    tone: "danger",
  },
  {
    key: "pastDueSubscriptions",
    label: "Past due subscriptions",
    tone: "warning",
  },
];

const secondaryGroups: Array<{
  description: string;
  eyebrow: string;
  metrics: MetricDefinition[];
  title: string;
}> = [
  {
    eyebrow: "Subscriptions",
    title: "Subscription health",
    description: "Customer base and active recurring relationships.",
    metrics: [
      { key: "totalCustomers", label: "Customers" },
      {
        key: "activeSubscriptions",
        label: "Active subscriptions",
        tone: "success",
      },
      { key: "pastDueSubscriptions", label: "Past due", tone: "warning" },
    ],
  },
  {
    eyebrow: "Invoices",
    title: "Invoice status",
    description: "Issued, collected, and overdue invoice activity.",
    metrics: [
      { key: "issuedInvoices", label: "Issued invoices", tone: "warning" },
      { key: "paidInvoices", label: "Paid invoices", tone: "success" },
      { key: "overdueInvoices", label: "Overdue invoices", tone: "danger" },
      {
        key: "totalAmountDue",
        label: "Amount due",
        format: "money",
        tone: "warning",
      },
    ],
  },
  {
    eyebrow: "Payments",
    title: "Payment status",
    description: "Payment outcomes and collection reliability.",
    metrics: [
      { key: "successfulPayments", label: "Successful", tone: "success" },
      { key: "failedPayments", label: "Failed", tone: "danger" },
      {
        key: "paymentSuccessRate",
        label: "Success rate",
        format: "percent",
        tone: "success",
      },
    ],
  },
];

const toneClassNames: Record<
  MetricTone,
  {
    accent: string;
    border: string;
    soft: string;
    text: string;
  }
> = {
  default: {
    accent: "bg-slate-900",
    border: "border-[var(--color-border)]",
    soft: "bg-white/90",
    text: "text-slate-950",
  },
  success: {
    accent: "bg-emerald-600",
    border: "border-emerald-200",
    soft: "bg-emerald-50",
    text: "text-emerald-900",
  },
  warning: {
    accent: "bg-amber-600",
    border: "border-amber-200",
    soft: "bg-amber-50",
    text: "text-amber-950",
  },
  danger: {
    accent: "bg-red-600",
    border: "border-red-200",
    soft: "bg-red-50",
    text: "text-red-950",
  },
  accent: {
    accent: "bg-[var(--color-accent)]",
    border: "border-orange-200",
    soft: "bg-orange-50",
    text: "text-orange-950",
  },
};

export function AnalyticsSummaryPanel() {
  const { data, error, isLoading, isFetching } = useGetAnalyticsSummaryQuery();

  if (isLoading) {
    return (
      <StatePanel title="RevenueOps Dashboard" message="Loading analytics summary..." />
    );
  }

  if (error) {
    return (
      <StatePanel
        title="RevenueOps Dashboard"
        message="Unable to load analytics summary."
      />
    );
  }

  if (!data) {
    return (
      <StatePanel
        title="RevenueOps Dashboard"
        message="No analytics data available."
      />
    );
  }

  return (
    <main className="pb-8 pt-1">
      <section className="w-full space-y-8">
        <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Analytics
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              RevenueOps Dashboard
            </h2>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Business-oriented view of recurring revenue, collection risk, and
              subscription activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              Tenant billing overview
            </span>
            {isFetching ? (
              <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-900">
                Refreshing
              </span>
            ) : null}
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <FinancialPositionPanel data={data} />
          <OperatingSnapshot data={data} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <CollectionRiskPanel data={data} />
          <SubscriptionsByPlanPanel items={data.subscriptionsByPlan} />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {secondaryGroups.map((group) => (
            <MetricGroup
              data={data}
              description={group.description}
              eyebrow={group.eyebrow}
              key={group.title}
              metrics={group.metrics}
              title={group.title}
            />
          ))}
        </section>
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

function FinancialPositionPanel({ data }: { data: AnalyticsSummary }) {
  return (
    <section className="rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <SectionHeader
        eyebrow="Business overview"
        title="Financial position"
        description="Current recurring revenue and billing exposure."
      />

      <div className="mt-8 grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.5rem] border border-orange-200 bg-orange-50 p-6">
          <p className="text-sm font-medium text-orange-900">Estimated MRR</p>
          <p className="mt-3 text-5xl font-semibold tracking-[-0.04em] text-orange-950">
            {formatMoney(data.estimatedMrr, "EUR")}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-orange-900">
            Estimated monthly recurring revenue from active subscriptions.
          </p>
        </div>

        <dl className="grid gap-3">
          <MetricRow
            label="Revenue this month"
            value={formatMoney(data.revenueThisMonth, "EUR")}
          />
          <MetricRow
            label="Total revenue paid"
            tone="success"
            value={formatMoney(data.totalRevenuePaid, "EUR")}
          />
          <MetricRow
            label="Amount due"
            tone="warning"
            value={formatMoney(data.totalAmountDue, "EUR")}
          />
          <MetricRow
            label="Payment success rate"
            tone="success"
            value={formatMetricValue(data.paymentSuccessRate, "percent")}
          />
        </dl>
      </div>
    </section>
  );
}

function OperatingSnapshot({ data }: { data: AnalyticsSummary }) {
  return (
    <aside className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <SectionHeader
        eyebrow="Snapshot"
        title="Operational snapshot"
        description="The numbers an operator should scan first."
      />

      <dl className="mt-6 space-y-3">
        <MetricRow
          label="Customers"
          value={numberFormatter.format(data.totalCustomers)}
        />
        <MetricRow
          label="Active subscriptions"
          tone="success"
          value={numberFormatter.format(data.activeSubscriptions)}
        />
        <MetricRow
          label="Issued invoices"
          tone="warning"
          value={numberFormatter.format(data.issuedInvoices)}
        />
        <MetricRow
          label="Overdue invoices"
          tone="danger"
          value={numberFormatter.format(data.overdueInvoices)}
        />
        <MetricRow
          label="Failed payments"
          tone="danger"
          value={numberFormatter.format(data.failedPayments)}
        />
      </dl>
    </aside>
  );
}

type SectionHeaderProps = {
  description: string;
  eyebrow: string;
  title: string;
};

function SectionHeader({ description, eyebrow, title }: SectionHeaderProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function CollectionRiskPanel({ data }: { data: AnalyticsSummary }) {
  return (
    <section className="rounded-[2rem] border border-red-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          eyebrow="Collection risk"
          title="Revenue that needs attention"
          description="Overdue invoices, failed payments, and subscriptions at risk."
        />

        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-red-950">
          <p className="text-sm font-medium text-red-700">Overdue amount</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {formatMoney(data.overdueAmount, "EUR")}
          </p>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-red-100 rounded-[1.25rem] border border-red-100 bg-red-50/40">
        {collectionRiskMetrics.map((metric) => (
          <RiskMetricLine
            key={metric.key}
            label={metric.label}
            tone={metric.tone}
            value={formatMetricValue(data[metric.key], metric.format)}
          />
        ))}
      </dl>
    </section>
  );
}

function SubscriptionsByPlanPanel({ items }: { items: SubscriptionsByPlan[] }) {
  const maxSubscriptions = Math.max(
    ...items.map((item) => item.activeSubscriptions),
    0,
  );

  return (
    <section className="rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <SectionHeader
        eyebrow="Plan mix"
        title="Subscriptions by plan"
        description="Active subscriptions grouped by current plan."
      />

      <div className="mt-6 space-y-5">
        {items.length > 0 ? (
          items.map((item) => {
            const width =
              maxSubscriptions > 0
                ? `${Math.max((item.activeSubscriptions / maxSubscriptions) * 100, 8)}%`
                : "0%";

            return (
              <div className="space-y-2" key={item.planId}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-950">
                      {item.planName}
                    </p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {item.planCode}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-950">
                    {numberFormatter.format(item.activeSubscriptions)}
                  </p>
                </div>

                <div className="h-2 rounded-full bg-[var(--color-surface)]">
                  <div
                    className="h-2 rounded-full bg-slate-700"
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">
            No active subscriptions by plan yet.
          </p>
        )}
      </div>
    </section>
  );
}

type MetricGroupProps = {
  data: AnalyticsSummary;
  description: string;
  eyebrow: string;
  metrics: MetricDefinition[];
  title: string;
};

function MetricGroup({
  data,
  description,
  eyebrow,
  metrics,
  title,
}: MetricGroupProps) {
  return (
    <section className="rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />

      <dl className="mt-6 space-y-4">
        {metrics.map((metric) => (
          <CompactMetric
            key={metric.key}
            label={metric.label}
            tone={metric.tone}
            value={formatMetricValue(data[metric.key], metric.format)}
          />
        ))}
      </dl>
    </section>
  );
}

type CompactMetricProps = {
  label: string;
  tone?: MetricTone;
  value: string;
};

function CompactMetric({ label, tone = "default", value }: CompactMetricProps) {
  return (
    <MetricRow label={label} tone={tone} value={value} />
  );
}

function RiskMetricLine({ label, tone = "default", value }: CompactMetricProps) {
  const toneClassNames = getToneClassNames(tone);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm font-medium text-slate-700">{label}</dt>
      <dd className={`text-base font-semibold tracking-tight ${toneClassNames.text}`}>
        {value}
      </dd>
    </div>
  );
}

type MetricRowProps = {
  label: string;
  tone?: MetricTone;
  value: string;
};

function MetricRow({ label, tone = "default", value }: MetricRowProps) {
  const toneClassNames = getToneClassNames(tone);

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-[var(--color-border)] bg-white/70 px-4 py-3">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className={`text-lg font-semibold tracking-tight ${toneClassNames.text}`}>
        {value}
      </dd>
    </div>
  );
}

function getToneClassNames(tone: MetricTone) {
  return toneClassNames[tone];
}

function formatMetricValue(value: number, format?: MetricFormat) {
  if (format === "money") {
    return formatMoney(value, "EUR");
  }

  if (format === "percent") {
    return `${numberFormatter.format(value)}%`;
  }

  return numberFormatter.format(value);
}
