"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { ConfirmActionPanel } from "@/components/admin/confirm-action-panel";
import { useGetCustomersQuery } from "@/features/customers/customers-api";
import { useGetPlansQuery } from "@/features/plans/plans-api";
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
  const { data: customers } = useGetCustomersQuery({ page: 1, pageSize: 100 });
  const { data: plans } = useGetPlansQuery({ page: 1, pageSize: 100 });
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
  const customer = customers?.data.find((item) => item.id === data.customerId);
  const plan = plans?.data.find((item) => item.id === data.planId);
  const customerLabel = customer
    ? `${customer.name} · ${customer.email}`
    : `Customer ID ${data.customerId}`;
  const planLabel = plan
    ? `${plan.name} · ${plan.code}`
    : `Plan ID ${data.planId}`;
  const pricingSnapshotLabel = `${formatMoney(
    data.amountSnapshot,
    data.currencySnapshot,
  )} / ${intervalLabelMap[data.intervalSnapshot]}`;
  const startDateLabel = dateFormatter.format(new Date(data.startDate));
  const currentPeriodStartLabel = dateFormatter.format(
    new Date(data.currentPeriodStart),
  );
  const currentPeriodEndLabel = dateFormatter.format(
    new Date(data.currentPeriodEnd),
  );
  const currentPeriodLabel = `${currentPeriodStartLabel} → ${currentPeriodEndLabel}`;
  const renewalBehavior = data.cancelAtPeriodEnd
    ? "Do not renew after current period"
    : "Renews automatically";
  const renewalSummary = data.cancelAtPeriodEnd
    ? `Access remains active until ${currentPeriodEndLabel}.`
    : `Next renewal is scheduled for ${currentPeriodEndLabel}.`;
  const nextRenewalLabel = data.cancelAtPeriodEnd
    ? "No renewal scheduled"
    : currentPeriodEndLabel;

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
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
            {customerLabel} · {planLabel} · {pricingSnapshotLabel}
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <DetailSection
              description="Customer, plan, and pricing snapshot attached to this subscription."
              title="Subscription overview"
            >
              <DetailItem label="Customer" value={customerLabel} />
              <DetailItem label="Plan" value={planLabel} />
              <DetailItem
                label="Pricing snapshot"
                value={pricingSnapshotLabel}
              />
              <DetailItem
                label="Billing cadence"
                value={formatInterval(
                  data.intervalSnapshot,
                  data.intervalCountSnapshot,
                )}
              />
            </DetailSection>

            <DetailSection
              description="The active billing window and what happens when it ends."
              title="Billing period"
            >
              <DetailItem label="Current period" value={currentPeriodLabel} />
              <DetailItem label="Next renewal" value={nextRenewalLabel} />
              <DetailItem label="Renewal behavior" value={renewalBehavior} />
              <DetailItem label="Start date" value={startDateLabel} />
            </DetailSection>
          </div>

          <aside className="space-y-6">
            <DetailSection
              description="Current operating state, renewal outcome, and audit dates."
              title="Status & lifecycle"
            >
              <DetailItem
                label="Current status"
                value={
                  <span className={statusClassNameMap[data.status]}>
                    {data.status}
                  </span>
                }
              />
              <DetailItem label="Renewal summary" value={renewalSummary} />
              <DetailItem
                label="Created"
                value={dateFormatter.format(new Date(data.createdAt))}
              />
              <DetailItem
                label="Updated"
                value={dateFormatter.format(new Date(data.updatedAt))}
              />
            </DetailSection>

            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Subscription actions
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Cancel at period end keeps access until{" "}
                  {currentPeriodEndLabel}. Cancel immediately ends the
                  subscription now.
                </p>
              </div>

              {errorMessage ? (
                <p className="mt-5 text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              {cancelMode ? (
                <div className="mt-5">
                  <ConfirmActionPanel
                    confirmLabel="Confirm"
                    isLoading={isCanceling}
                    message={
                      cancelMode === "period_end"
                        ? `Cancel at period end keeps access until ${currentPeriodEndLabel}.`
                        : "Cancel immediately ends the subscription now."
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
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-600">
                  No subscription actions are currently available for this status.
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

type DetailSectionProps = {
  children: ReactNode;
  description: string;
  title: string;
};

function DetailSection({ children, description, title }: DetailSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <dl className="mt-5 divide-y divide-[var(--color-border)] rounded-[1.25rem] border border-[var(--color-border)] bg-white">
        {children}
      </dl>
    </section>
  );
}

type DetailItemProps = {
  label: string;
  value: ReactNode;
};

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-950 sm:text-right">
        {value}
      </dd>
    </div>
  );
}

type StatePanelProps = {
  title: string;
  message: string;
};

function StatePanel({ title, message }: StatePanelProps) {
  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
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
