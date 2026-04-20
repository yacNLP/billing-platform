"use client";

import Link from "next/link";

import type {
  BillingInterval,
  SubscriptionStatus,
} from "@/features/subscriptions/types";
import { useGetSubscriptionsQuery } from "@/features/subscriptions/subscriptions-api";

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

const statusClassNameMap: Record<SubscriptionStatus, string> = {
  ACTIVE:
    "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700",
  CANCELED:
    "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600",
  EXPIRED:
    "inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700",
  PAST_DUE:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700",
};

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function formatInterval(interval: BillingInterval, count: number): string {
  const label = intervalLabelMap[interval];

  if (count === 1) {
    return `Every ${label}`;
  }

  return `Every ${count} ${label}s`;
}

export function SubscriptionsList() {
  const { data, error, isLoading, isFetching } = useGetSubscriptionsQuery();

  if (isLoading) {
    return <StatePanel title="Subscriptions" message="Loading subscriptions..." />;
  }

  if (error) {
    return (
      <StatePanel title="Subscriptions" message="Unable to load subscriptions." />
    );
  }

  if (!data || data.length === 0) {
    return <StatePanel title="Subscriptions" message="No subscriptions found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Subscriptions
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Listing
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Read-only subscriptions listing wired to the protected billing
            subscriptions endpoint.
          </p>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">
            Refreshing subscriptions...
          </p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {data.map((subscription) => (
            <li
              className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
              key={subscription.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-slate-950">
                        Subscription #{subscription.id}
                      </p>
                      <span className={statusClassNameMap[subscription.status]}>
                        {subscription.status}
                      </span>
                      {subscription.cancelAtPeriodEnd ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                          Scheduled cancellation
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-slate-600">
                      Customer ID {subscription.customerId} · Plan ID{" "}
                      {subscription.planId}
                    </p>
                    <Link
                      className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                      href={`/subscriptions/${subscription.id}`}
                    >
                      View details
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                      {formatMoney(
                        subscription.amountSnapshot,
                        subscription.currencySnapshot,
                      )}{" "}
                      / {intervalLabelMap[subscription.intervalSnapshot]}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-sm text-slate-700">
                      {formatInterval(
                        subscription.intervalSnapshot,
                        subscription.intervalCountSnapshot,
                      )}
                    </span>
                  </div>
                </div>

                <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[22rem]">
                  <div>
                    <dt className="font-medium text-slate-500">
                      Current period start
                    </dt>
                    <dd>
                      {dateFormatter.format(
                        new Date(subscription.currentPeriodStart),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">
                      Current period end
                    </dt>
                    <dd>
                      {dateFormatter.format(
                        new Date(subscription.currentPeriodEnd),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Created</dt>
                    <dd>
                      {dateFormatter.format(new Date(subscription.createdAt))}
                    </dd>
                  </div>
                  {subscription.endedAt ? (
                    <div>
                      <dt className="font-medium text-slate-500">Ended</dt>
                      <dd>
                        {dateFormatter.format(new Date(subscription.endedAt))}
                      </dd>
                    </div>
                  ) : null}
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
            Subscriptions
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
