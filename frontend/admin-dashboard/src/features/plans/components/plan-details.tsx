"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { EditPlanForm } from "@/features/plans/components/edit-plan-form";
import {
  useDeletePlanMutation,
  useGetPlanByIdQuery,
} from "@/features/plans/plans-api";
import { useGetProductsQuery } from "@/features/products/products-api";
import { useGetSubscriptionsQuery } from "@/features/subscriptions/subscriptions-api";
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
  const { data: products } = useGetProductsQuery({ page: 1, pageSize: 100 });
  const { data: activeSubscriptions } = useGetSubscriptionsQuery({
    page: 1,
    pageSize: 100,
    planId: id,
    status: "ACTIVE",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
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

  const descriptionLabel = data.description || "No description provided.";
  const pricingLabel = formatPricing(data.amount, data.currency, data.interval);
  const billingCadenceLabel = formatInterval(data.interval, data.intervalCount);
  const trialLabel =
    data.trialDays > 0
      ? `${data.trialDays} day${data.trialDays === 1 ? "" : "s"}`
      : "No trial";
  const product = products?.data.find((item) => item.id === data.productId);
  const productLabel = product
    ? product.name
    : `Product ID #${data.productId}`;
  const statusClassName = data.active
    ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
    : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600";

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Plans
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              {data.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-base leading-7 text-slate-600">
                {data.code} · {pricingLabel}
              </p>
              <span className={statusClassName}>
                {data.active ? "Active plan" : "Inactive plan"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <DetailSection
              description="Catalog plan identity and commercial pricing."
              title="Plan overview"
            >
              <DetailItem label="Code" value={data.code} />
              <DetailItem label="Description" value={descriptionLabel} />
              <DetailItem label="Product" value={productLabel} />
            </DetailSection>

            <DetailSection
              description="Current catalog pricing used for new subscriptions."
              title="Pricing"
              footer={
                <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Existing subscriptions keep their original price and billing
                    interval.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Changes affect future subscriptions only, not existing
                    subscription snapshots.
                  </p>
                </div>
              }
            >
              <DetailItem label="Price" value={pricingLabel} />
              <DetailItem label="Billing cadence" value={billingCadenceLabel} />
              <DetailItem label="Trial" value={trialLabel} />
            </DetailSection>
          </div>

          <aside className="space-y-6">
            <DetailSection
              description="Plan status and usage signals."
              title="Catalog status"
            >
              <DetailItem
                label="Status"
                value={
                  <span className={statusClassName}>
                    {data.active ? "Active" : "Inactive"}
                  </span>
                }
              />
              <DetailItem
                label="Active subscriptions"
                value={activeSubscriptions?.total ?? "Loading..."}
              />
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
                  Plan actions
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Manage this plan catalog entry and destructive actions.
                </p>
              </div>

              {errorMessage ? (
                <p className="mt-5 text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  onClick={() => setIsEditDrawerOpen(true)}
                  type="button"
                >
                  Edit plan
                </button>

                {!isDeleteConfirmationOpen ? (
                  <button
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDeleting}
                    onClick={() => setIsDeleteConfirmationOpen(true)}
                    type="button"
                  >
                    Delete plan
                  </button>
                ) : null}
              </div>

              {isDeleteConfirmationOpen ? (
                <div className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold tracking-tight text-red-900">
                      Delete plan
                    </h4>
                    <p className="text-sm leading-6 text-red-800">
                      This action will deactivate and remove this plan from
                      active listings. This cannot be undone from the UI.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
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
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </section>

      <AdminDrawer
        description="Update the current plan pricing, billing interval, and metadata."
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit plan"
      >
        <EditPlanForm
          isEmbedded
          onUpdated={() => setIsEditDrawerOpen(false)}
          plan={data}
        />
      </AdminDrawer>
    </main>
  );
}

type DetailSectionProps = {
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  title: string;
};

function DetailSection({
  children,
  description,
  footer,
  title,
}: DetailSectionProps) {
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

      {footer}
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
