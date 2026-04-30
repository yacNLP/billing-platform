"use client";

import { useState } from "react";

import { ConfirmActionPanel } from "@/components/admin/confirm-action-panel";
import type {
  BillingInterval,
  SubscriptionStatus,
} from "@/features/subscriptions/types";
import {
  useCancelSubscriptionMutation,
  useGetSubscriptionByIdQuery,
} from "@/features/subscriptions/subscriptions-api";

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

type SubscriptionDetailsProps = {
  id: number;
};

export function SubscriptionDetails({ id }: SubscriptionDetailsProps) {
  const { data, error, isLoading } = useGetSubscriptionByIdQuery(id);
  const [cancelMode, setCancelMode] = useState<"period_end" | "immediate" | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelSubscription, { isLoading: isCanceling }] =
    useCancelSubscriptionMutation();

  async function handleCancelSubscription(cancelAtPeriodEnd: boolean) {
    setErrorMessage(null);

    try {
      await cancelSubscription({
        id,
        cancelAtPeriodEnd,
      }).unwrap();
      setCancelMode(null);
    } catch {
      setErrorMessage("Unable to cancel subscription.");
    }
  }

  if (isLoading) {
    return <StatePanel title="Subscription details" message="Loading subscription..." />;
  }

  if (error) {
    return (
      <StatePanel
        title="Subscription details"
        message="Unable to load subscription."
      />
    );
  }

  if (!data) {
    return (
      <StatePanel title="Subscription details" message="Subscription not found." />
    );
  }

  const canScheduleCancellation =
    data.status === "ACTIVE" && !data.cancelAtPeriodEnd;
  const canImmediatelyCancel = data.status === "ACTIVE";
  const showCancelActions = canScheduleCancellation || canImmediatelyCancel;

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Subscriptions
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              Subscription #{data.id}
            </h2>
            <span className={statusClassNameMap[data.status]}>{data.status}</span>
            {data.cancelAtPeriodEnd ? (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                Scheduled cancellation
              </span>
            ) : null}
          </div>
          <p className="text-base leading-7 text-slate-600">
            Customer ID {data.customerId} linked to plan ID {data.planId}.
          </p>
        </div>

        <dl className="mt-8 space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Customer ID</dt>
            <dd className="mt-1 text-base text-slate-950">{data.customerId}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Plan ID</dt>
            <dd className="mt-1 text-base text-slate-950">{data.planId}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Pricing snapshot</dt>
            <dd className="mt-1 text-base text-slate-950">
              {formatMoney(data.amountSnapshot, data.currencySnapshot)} /{" "}
              {intervalLabelMap[data.intervalSnapshot]}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Billing cadence</dt>
            <dd className="mt-1 text-base text-slate-950">
              {formatInterval(
                data.intervalSnapshot,
                data.intervalCountSnapshot,
              )}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Start date</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.startDate))}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">
              Current period start
            </dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.currentPeriodStart))}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">
              Current period end
            </dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.currentPeriodEnd))}
            </dd>
          </div>

          {data.canceledAt ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">Canceled at</dt>
              <dd className="mt-1 text-base text-slate-950">
                {dateFormatter.format(new Date(data.canceledAt))}
              </dd>
            </div>
          ) : null}

          {data.endedAt ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">Ended at</dt>
              <dd className="mt-1 text-base text-slate-950">
                {dateFormatter.format(new Date(data.endedAt))}
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

        {errorMessage ? (
          <p className="mt-6 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {cancelMode ? (
          <div className="mt-6">
            <ConfirmActionPanel
              confirmLabel="Confirm"
              isLoading={isCanceling}
              message={
                cancelMode === "period_end"
                  ? "The subscription will stay active until the current billing period ends."
                  : "The subscription will be canceled now and its status will become canceled immediately."
              }
              onCancel={() => setCancelMode(null)}
              onConfirm={() =>
                handleCancelSubscription(cancelMode === "period_end")
              }
              title={
                cancelMode === "period_end"
                  ? "Cancel at period end"
                  : "Cancel subscription immediately"
              }
              variant="danger"
            />
          </div>
        ) : showCancelActions ? (
          <section className="mt-6 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                Cancel subscription
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Choose whether to stop this subscription at the end of the current
                period or cancel it immediately.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              {canScheduleCancellation ? (
                <button
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCanceling}
                  onClick={() => setCancelMode("period_end")}
                  type="button"
                >
                  Cancel at period end
                </button>
              ) : null}

              {canImmediatelyCancel ? (
                <button
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCanceling}
                  onClick={() => setCancelMode("immediate")}
                  type="button"
                >
                  Cancel immediately
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
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
