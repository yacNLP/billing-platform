"use client";

import { useState } from "react";

import { ConfirmActionPanel } from "@/components/admin/confirm-action-panel";
import { PageHeader } from "@/components/admin/page-header";
import {
  useRunGenerateDueInvoicesJobMutation,
  useRunMarkOverdueInvoicesJobMutation,
  useRunRenewDueSubscriptionsJobMutation,
  useRunUpdatePastDueSubscriptionsJobMutation,
} from "@/features/admin-jobs/admin-jobs-api";
import type { JobSummary } from "@/features/admin-jobs/types";

export function AdminJobsPanel() {
  const [
    runMarkOverdueInvoicesJob,
    {
      data: overdueResult,
      error: overdueError,
      isLoading: isRunningOverdueInvoices,
    },
  ] = useRunMarkOverdueInvoicesJobMutation();
  const [
    runUpdatePastDueSubscriptionsJob,
    {
      data: pastDueResult,
      error: pastDueError,
      isLoading: isRunningPastDueSubscriptions,
    },
  ] = useRunUpdatePastDueSubscriptionsJobMutation();
  const [
    runRenewDueSubscriptionsJob,
    {
      data: renewalResult,
      error: renewalError,
      isLoading: isRunningRenewal,
    },
  ] = useRunRenewDueSubscriptionsJobMutation();
  const [
    runGenerateDueInvoicesJob,
    {
      data: generationResult,
      error: generationError,
      isLoading: isRunningGeneration,
    },
  ] = useRunGenerateDueInvoicesJobMutation();

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <div className="rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <PageHeader
            eyebrow="Admin Jobs"
            title="Operations"
            description="Run a first set of manual admin jobs safely and inspect the result returned by the backend."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <JobCard
            actionLabel="Run job"
            confirmationMessage="This will mark eligible issued invoices as overdue."
            description="Find issued invoices whose due date is already in the past and mark them as overdue."
            error={overdueError}
            isLoading={isRunningOverdueInvoices}
            onRun={() => runMarkOverdueInvoicesJob()}
            result={overdueResult}
            title="Mark overdue invoices"
          />
          <JobCard
            actionLabel="Run job"
            confirmationMessage="This will move eligible active subscriptions to PAST_DUE."
            description="Find active subscriptions that still have an unpaid overdue invoice and move them to PAST_DUE."
            error={pastDueError}
            isLoading={isRunningPastDueSubscriptions}
            onRun={() => runUpdatePastDueSubscriptionsJob()}
            result={pastDueResult}
            title="Update past due subscriptions"
          />
          <JobCard
            actionLabel="Run job"
            confirmationMessage="This will renew eligible due subscriptions and create the next-period invoice when needed."
            description="Renew active subscriptions whose current period already ended and are still eligible for normal renewal."
            error={renewalError}
            isLoading={isRunningRenewal}
            onRun={() => runRenewDueSubscriptionsJob()}
            result={renewalResult}
            title="Renew due subscriptions"
          />
          <JobCard
            actionLabel="Run job"
            confirmationMessage="This will generate missing invoices for current subscription periods."
            description="Generate the missing invoice for the current subscription period without duplicating an already billed period."
            error={generationError}
            isLoading={isRunningGeneration}
            onRun={() => runGenerateDueInvoicesJob()}
            result={generationResult}
            title="Generate due invoices"
          />
        </div>
      </section>
    </main>
  );
}

type JobCardProps = {
  title: string;
  description: string;
  confirmationMessage: string;
  actionLabel: string;
  isLoading: boolean;
  result?: JobSummary;
  error?: unknown;
  onRun: () => void;
};

function JobCard({
  title,
  description,
  confirmationMessage,
  actionLabel,
  isLoading,
  result,
  error,
  onRun,
}: JobCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  function handleConfirmRun() {
    onRun();
    setIsConfirming(false);
  }

  return (
    <section className="rounded-[1.75rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {isConfirming ? (
        <div className="mt-6">
          <ConfirmActionPanel
            confirmLabel="Confirm run"
            isLoading={isLoading}
            message={confirmationMessage}
            onCancel={() => setIsConfirming(false)}
            onConfirm={handleConfirmRun}
            title={`Run ${title.toLowerCase()}?`}
            variant="warning"
          />
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-3">
          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => setIsConfirming(true)}
            type="button"
          >
            {isLoading ? "Running..." : actionLabel}
          </button>
        </div>
      )}

      {result ? (
        <dl className="mt-6 grid gap-3 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-3">
          <SummaryItem label="Scanned" value={result.scanned} />
          <SummaryItem label="Updated" value={result.updated} />
          <SummaryItem label="Skipped" value={result.skipped} />
        </dl>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formatMutationError(error)}
        </p>
      ) : null}
    </section>
  );
}

type SummaryItemProps = {
  label: string;
  value: number;
};

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function formatMutationError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data
  ) {
    const message = error.data.message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "string"
  ) {
    return error.error;
  }

  return "Unable to run this job.";
}
