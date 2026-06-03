"use client";

import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/admin/toast-provider";
import { useLoadSampleDataMutation } from "@/features/demo/demo-api";
import type { LoadSampleDataResponse } from "@/features/demo/types";
import { useGetOnboardingStatusQuery } from "@/features/onboarding/onboarding-api";
import type { OnboardingStep } from "@/features/onboarding/types";

function getStepState(
  step: OnboardingStep,
  index: number,
  firstIncompleteIndex: number,
): "Done" | "Next" | "Pending" {
  if (step.completed) {
    return "Done";
  }

  return index === firstIncompleteIndex ? "Next" : "Pending";
}

const stateClassNameMap = {
  Done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Next: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Pending: "border-slate-200 bg-slate-50 text-slate-500",
};

function formatSampleDataSummary(summary: LoadSampleDataResponse): string {
  return `Sample data loaded: ${summary.customers} customers, ${summary.products} products, ${summary.plans} plans, ${summary.subscriptions} subscriptions, ${summary.invoices} invoices, ${summary.payments} payments.`;
}

function getLoadSampleDataErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: number | string }).status;

    if (status === 409) {
      return "Sample data can only be loaded into an empty workspace.";
    }
  }

  return "Unable to load sample data.";
}

export function OnboardingChecklist() {
  const [isConfirmingSampleData, setIsConfirmingSampleData] = useState(false);
  const [sampleDataError, setSampleDataError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { data, error, isLoading } = useGetOnboardingStatusQuery();
  const [loadSampleData, { isLoading: isLoadingSampleData }] =
    useLoadSampleDataMutation();

  async function handleLoadSampleData() {
    setSampleDataError(null);

    try {
      const summary = await loadSampleData().unwrap();
      setIsConfirmingSampleData(false);
      showToast(formatSampleDataSummary(summary));
    } catch (loadError) {
      setSampleDataError(getLoadSampleDataErrorMessage(loadError));
      showToast(getLoadSampleDataErrorMessage(loadError), "error");
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <p className="text-sm text-slate-600">Loading onboarding checklist...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          Unable to load onboarding checklist.
        </p>
      </section>
    );
  }

  if (!data || data.isComplete) {
    return null;
  }

  const firstIncompleteIndex = data.steps.findIndex((step) => !step.completed);

  return (
    <section className="rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Onboarding
          </p>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create your first invoice
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Follow these steps to configure your workspace and create the first
            billable customer flow.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-slate-700">
            {data.completedCount} / {data.totalCount} completed
          </div>
          <button
            className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingSampleData}
            onClick={() => {
              setSampleDataError(null);
              setIsConfirmingSampleData(true);
            }}
            type="button"
          >
            Load sample data
          </button>
        </div>
      </div>

      {isConfirmingSampleData ? (
        <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-950">
                Load sample data?
              </p>
              <p className="max-w-3xl text-sm leading-6 text-amber-900">
                This will add sample customers, products, plans, subscriptions,
                invoices and payments to this workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoadingSampleData}
                onClick={handleLoadSampleData}
                type="button"
              >
                {isLoadingSampleData ? "Loading..." : "Confirm"}
              </button>
              <button
                className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                disabled={isLoadingSampleData}
                onClick={() => setIsConfirmingSampleData(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sampleDataError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {sampleDataError}
        </p>
      ) : null}

      <ol className="mt-6 divide-y divide-[var(--color-border)] overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white">
        {data.steps.map((step, index) => {
          const state = getStepState(step, index, firstIncompleteIndex);

          return (
            <li
              className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between"
              key={step.key}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {step.label}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClassNameMap[state]}`}
                    >
                      {state}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {step.completed
                      ? "This step is complete."
                      : state === "Next"
                        ? "Recommended next step."
                        : "Complete previous steps first."}
                  </p>
                </div>
              </div>

              <Link
                className="inline-flex justify-center rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                href={step.href}
              >
                {step.completed ? "Review" : state === "Next" ? "Start" : "Open"}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
