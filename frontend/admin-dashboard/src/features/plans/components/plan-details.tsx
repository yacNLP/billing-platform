"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EditPlanForm } from "@/features/plans/components/edit-plan-form";
import {
  useDeletePlanMutation,
  useGetPlanByIdQuery,
} from "@/features/plans/plans-api";
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

type PlanDetailsProps = {
  id: number;
};

export function PlanDetails({ id }: PlanDetailsProps) {
  const router = useRouter();
  const { data, error, isLoading } = useGetPlanByIdQuery(id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [deletePlan, { isLoading: isDeleting }] = useDeletePlanMutation();

  async function handleDeletePlan() {
    setErrorMessage(null);

    try {
      await deletePlan(id).unwrap();
      router.push("/plans");
    } catch {
      setErrorMessage("Unable to delete plan.");
    }
  }

  if (isLoading) {
    return <StatePanel title="Plan details" message="Loading plan..." />;
  }

  if (error) {
    return <StatePanel title="Plan details" message="Unable to load plan." />;
  }

  if (!data) {
    return <StatePanel title="Plan details" message="Plan not found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Plans
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            {data.name}
          </h2>
          <p className="text-base leading-7 text-slate-600">
            {data.description || "No description provided."}
          </p>
        </div>

        <dl className="mt-8 space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Code</dt>
            <dd className="mt-1 text-base text-slate-950">{data.code}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Name</dt>
            <dd className="mt-1 text-base text-slate-950">{data.name}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Description</dt>
            <dd className="mt-1 text-base text-slate-950">
              {data.description || "No description provided."}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Price</dt>
            <dd className="mt-1 text-base text-slate-950">
              {formatPricing(data.amount, data.currency, data.interval)}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Billing interval</dt>
            <dd className="mt-1 text-base text-slate-950">
              {formatInterval(data.interval, data.intervalCount)}
            </dd>
          </div>

          {data.trialDays > 0 ? (
            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <dt className="text-sm font-medium text-slate-500">Trial</dt>
              <dd className="mt-1 text-base text-slate-950">
                {data.trialDays} day{data.trialDays === 1 ? "" : "s"}
              </dd>
            </div>
          ) : null}

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Status</dt>
            <dd className="mt-1">
              <span
                className={
                  data.active
                    ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                    : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
                }
              >
                {data.active ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.createdAt))}
            </dd>
          </div>
        </dl>

        <EditPlanForm plan={data} />

        {errorMessage ? (
          <p className="mt-6 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isDeleteConfirmationOpen ? (
          <section className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 p-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-red-900">
                Delete plan
              </h3>
              <p className="text-sm leading-6 text-red-800">
                This action will deactivate and remove this plan from active
                listings. This cannot be undone from the UI.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-xl bg-red-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
                onClick={handleDeletePlan}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Confirm delete"}
              </button>

              <button
                className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmationOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </section>
        ) : (
          <button
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={() => setIsDeleteConfirmationOpen(true)}
            type="button"
          >
            Delete plan
          </button>
        )}
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
