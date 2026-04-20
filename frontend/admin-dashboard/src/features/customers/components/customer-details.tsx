"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EditCustomerForm } from "@/features/customers/components/edit-customer-form";
import {
  useDeleteCustomerMutation,
  useGetCustomerByIdQuery,
} from "@/features/customers/customers-api";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type CustomerDetailsProps = {
  id: number;
};

export function CustomerDetails({ id }: CustomerDetailsProps) {
  const router = useRouter();
  const { data, error, isLoading } = useGetCustomerByIdQuery(id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

  async function handleDeleteCustomer() {
    setErrorMessage(null);

    try {
      await deleteCustomer(id).unwrap();
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

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Customers
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            {data.name}
          </h2>
          <p className="text-base leading-7 text-slate-600">{data.email}</p>
        </div>

        <dl className="mt-8 space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Name</dt>
            <dd className="mt-1 text-base text-slate-950">{data.name}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="mt-1 text-base text-slate-950">{data.email}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.createdAt))}
            </dd>
          </div>
        </dl>

        <EditCustomerForm customer={data} />

        {errorMessage ? (
          <p className="mt-6 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isDeleteConfirmationOpen ? (
          <section className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 p-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-red-900">
                Delete customer
              </h3>
              <p className="text-sm leading-6 text-red-800">
                This action will permanently delete this customer. This cannot be
                undone.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
          </section>
        ) : (
          <button
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={() => setIsDeleteConfirmationOpen(true)}
            type="button"
          >
            Delete customer
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
