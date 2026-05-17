"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { useToast } from "@/components/admin/toast-provider";
import { EditCustomerForm } from "@/features/customers/components/edit-customer-form";
import {
  useDeleteCustomerMutation,
  useGetCustomerByIdQuery,
} from "@/features/customers/customers-api";
import { useGetInvoicesQuery } from "@/features/invoices/invoices-api";
import { useGetPlansQuery } from "@/features/plans/plans-api";
import { useGetSubscriptionsQuery } from "@/features/subscriptions/subscriptions-api";
import type { BillingInterval } from "@/features/subscriptions/types";

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

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

type CustomerDetailsProps = {
  id: number;
};

export function CustomerDetails({ id }: CustomerDetailsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, error, isLoading } = useGetCustomerByIdQuery(id);
  const { data: subscriptions } = useGetSubscriptionsQuery({
    customerId: id,
    page: 1,
    pageSize: 100,
  });
  const { data: activeSubscriptions } = useGetSubscriptionsQuery({
    customerId: id,
    page: 1,
    pageSize: 100,
    status: "ACTIVE",
  });
  const { data: invoices } = useGetInvoicesQuery({
    customerId: id,
    page: 1,
    pageSize: 100,
  });
  const { data: issuedInvoices } = useGetInvoicesQuery({
    customerId: id,
    page: 1,
    pageSize: 100,
    status: "ISSUED",
  });
  const { data: paidInvoices } = useGetInvoicesQuery({
    customerId: id,
    page: 1,
    pageSize: 100,
    status: "PAID",
  });
  const { data: plans } = useGetPlansQuery({ page: 1, pageSize: 100 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

  async function handleDeleteCustomer() {
    setErrorMessage(null);

    try {
      await deleteCustomer(id).unwrap();
      showToast("Customer deleted.");
      router.push("/customers");
    } catch {
      setErrorMessage("Unable to delete customer.");
    }
  }

  if (isLoading) {
    return <StatePanel title="Customer details" message="Loading customer..." />;
  }

  if (error) {
    return (
      <StatePanel title="Customer details" message="Unable to load customer." />
    );
  }

  if (!data) {
    return <StatePanel title="Customer details" message="Customer not found." />;
  }

  const createdAtLabel = dateFormatter.format(new Date(data.createdAt));
  const currentSubscription = activeSubscriptions?.data[0];
  const currentPlan = currentSubscription
    ? plans?.data.find((plan) => plan.id === currentSubscription.planId)
    : undefined;
  const businessStatus = currentSubscription
    ? "Active customer"
    : "No active subscription";
  const businessStatusClassName = currentSubscription
    ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
    : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600";
  const amountDue = invoices?.data.reduce(
    (total, invoice) =>
      total + Math.max(invoice.amountDue - invoice.amountPaid, 0),
    0,
  );
  const totalPaid = invoices?.data.reduce(
    (total, invoice) => total + invoice.amountPaid,
    0,
  );
  const currency = invoices?.data[0]?.currency ?? "EUR";
  const planLabel = currentSubscription
    ? currentPlan
      ? `${currentPlan.name} · ${currentPlan.code}`
      : `Plan ID ${currentSubscription.planId}`
    : "No active subscription";
  const priceSnapshotLabel = currentSubscription
    ? `${formatMoney(
        currentSubscription.amountSnapshot,
        currentSubscription.currencySnapshot,
      )} / ${intervalLabelMap[currentSubscription.intervalSnapshot]}`
    : "No active subscription";
  const currentPeriodLabel = currentSubscription
    ? `${dateFormatter.format(
        new Date(currentSubscription.currentPeriodStart),
      )} → ${dateFormatter.format(new Date(currentSubscription.currentPeriodEnd))}`
    : "No active subscription";
  const renewalBehavior = currentSubscription
    ? currentSubscription.cancelAtPeriodEnd
      ? "Do not renew after current period"
      : "Renews automatically"
    : "No active subscription";

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Customers
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              {data.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-base leading-7 text-slate-600">
                Customer ID #{data.id}
              </p>
              <span className={businessStatusClassName}>{businessStatus}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <DetailSection
              description="Primary customer identity used across billing operations."
              title="Customer overview"
            >
              <DetailItem label="Name" value={data.name} />
              <DetailItem label="Email" value={data.email} />
              <DetailItem label="Created" value={createdAtLabel} />
            </DetailSection>

            <DetailSection
              description="Aggregated billing signals for this customer."
              title="Billing activity"
            >
              <DetailItem
                label="Active subscriptions"
                value={activeSubscriptions?.total ?? "Loading..."}
              />
              <DetailItem
                label="Total subscriptions"
                value={subscriptions?.total ?? "Loading..."}
              />
              <DetailItem
                label="Issued invoices"
                value={issuedInvoices?.total ?? "Loading..."}
              />
              <DetailItem
                label="Paid invoices"
                value={paidInvoices?.total ?? "Loading..."}
              />
              <DetailItem
                label="Amount due"
                value={
                  amountDue !== undefined
                    ? formatMoney(amountDue, currency)
                    : "Loading..."
                }
              />
              <DetailItem
                label="Total paid"
                value={
                  totalPaid !== undefined
                    ? formatMoney(totalPaid, currency)
                    : "Loading..."
                }
              />
            </DetailSection>
          </div>

          <aside className="space-y-6">
            <DetailSection
              description="The active subscription currently driving this customer billing."
              title="Current subscription"
            >
              <DetailItem label="Plan" value={planLabel} />
              <DetailItem label="Price snapshot" value={priceSnapshotLabel} />
              <DetailItem label="Current period" value={currentPeriodLabel} />
              <DetailItem label="Renewal behavior" value={renewalBehavior} />
            </DetailSection>

            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Customer actions
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Manage this customer profile and destructive account actions.
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
                  Edit customer
                </button>

                {!isDeleteConfirmationOpen ? (
                  <button
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDeleting}
                    onClick={() => setIsDeleteConfirmationOpen(true)}
                    type="button"
                  >
                    Delete customer
                  </button>
                ) : null}
              </div>

              {isDeleteConfirmationOpen ? (
                <div className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold tracking-tight text-red-900">
                      Delete customer
                    </h4>
                    <p className="text-sm leading-6 text-red-800">
                      This action will permanently delete this customer. This
                      cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="rounded-xl bg-red-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDeleting}
                      onClick={handleDeleteCustomer}
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
        description="Update the current customer name and email."
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit customer"
      >
        <EditCustomerForm
          customer={data}
          isEmbedded
          onUpdated={() => {
            setIsEditDrawerOpen(false);
            showToast("Customer updated.");
          }}
        />
      </AdminDrawer>
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
            Customers
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
